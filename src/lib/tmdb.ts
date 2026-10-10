import "server-only";
import { matchesRule, type Category, type CategoryRule } from "./categories";
import type { Film } from "./types";

const API = "https://api.themoviedb.org/3";
const TIMEOUT_MS = 6000;

export class TmdbError extends Error {
  constructor(
    public code: "not_configured" | "upstream" | "timeout" | "not_found",
    message: string,
  ) {
    super(message);
  }
}

interface TmdbMovie {
  id?: unknown;
  title?: unknown;
  release_date?: unknown;
  poster_path?: unknown;
  adult?: unknown;
}

/** A movie or TV search or discover result. TV results use `name` and `first_air_date`. */
interface TmdbItem extends TmdbMovie {
  name?: unknown;
  first_air_date?: unknown;
  genre_ids?: unknown;
}

export type Media = "movie" | "tv";

/** A title plus the genre ids that category matching needs. */
interface Candidate extends Film {
  genreIds: number[];
}

const POSTER_RE = /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png)$/;

export function isPosterPath(v: unknown): v is string {
  return typeof v === "string" && v.length <= 64 && POSTER_RE.test(v);
}

function toFilm(m: TmdbMovie): Film | null {
  if (typeof m.id !== "number" || !Number.isInteger(m.id) || m.id <= 0) return null;
  if (typeof m.title !== "string" || !m.title.trim()) return null;
  const date = typeof m.release_date === "string" ? m.release_date : "";
  return {
    id: m.id,
    title: m.title.trim().slice(0, 200),
    year: /^\d{4}/.test(date) ? date.slice(0, 4) : "",
    poster: isPosterPath(m.poster_path) ? m.poster_path : null,
  };
}

async function tmdb<T>(path: string, revalidate: number): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new TmdbError("not_configured", "TMDB_READ_TOKEN is not set.");
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate },
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new TmdbError("timeout", "TMDB did not answer in time.");
    }
    throw new TmdbError("upstream", "TMDB could not be reached.");
  }
  if (res.status === 404) throw new TmdbError("not_found", "TMDB has no such film.");
  if (!res.ok) throw new TmdbError("upstream", `TMDB answered ${res.status}.`);
  try {
    return (await res.json()) as T;
  } catch {
    throw new TmdbError("upstream", "TMDB sent an unreadable response.");
  }
}

/** Canonical record for one film. Used on save so stored titles never come from the browser. */
export async function getFilm(id: number): Promise<Film> {
  const m = await tmdb<TmdbMovie>(`/movie/${id}?language=en-US`, 86400);
  if (m.adult === true) throw new TmdbError("not_found", "TMDB has no such film.");
  const f = toFilm(m);
  if (!f) throw new TmdbError("not_found", "TMDB has no such film.");
  return f;
}

function toCandidate(m: TmdbItem, media: Media): Candidate | null {
  const title = media === "tv" ? m.name : m.title;
  const date = media === "tv" ? m.first_air_date : m.release_date;
  const f = toFilm({ id: m.id, title, release_date: date, poster_path: m.poster_path });
  if (!f) return null;
  const genreIds = Array.isArray(m.genre_ids) ? m.genre_ids.filter((g): g is number => Number.isInteger(g)) : [];
  return { ...f, genreIds };
}

function strip(c: Candidate): Film {
  return { id: c.id, title: c.title, year: c.year, poster: c.poster };
}

async function searchCandidates(media: Media, query: string, pages: number): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const seen = new Set<number>();
  for (let page = 1; page <= pages; page++) {
    const qs = new URLSearchParams({ query, include_adult: "false", language: "en-US", page: String(page) });
    const data = await tmdb<{ results?: TmdbItem[]; total_pages?: number }>(`/search/${media}?${qs}`, 3600);
    for (const m of data.results ?? []) {
      if (m.adult === true) continue;
      const c = toCandidate(m, media);
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
    if (typeof data.total_pages !== "number" || page >= data.total_pages) break;
  }
  return out;
}

/** Plain title search for either section. */
export async function searchTitles(media: Media, query: string): Promise<Film[]> {
  return (await searchCandidates(media, query, 1)).slice(0, 12).map(strip);
}

/** Keyword names resolve to ids once a week. Null when TMDB has no exact match. */
async function keywordId(name: string): Promise<number | null> {
  const qs = new URLSearchParams({ query: name, page: "1" });
  const data = await tmdb<{ results?: Array<{ id?: unknown; name?: unknown }> }>(`/search/keyword?${qs}`, 604800);
  const hit = (data.results ?? []).find((k) => typeof k.name === "string" && k.name.toLowerCase() === name.toLowerCase());
  return hit && typeof hit.id === "number" ? hit.id : null;
}

/** Keyword ids on one title, cached for a day. Movies answer with `keywords`, TV with `results`. */
async function titleKeywordIds(media: Media, id: number): Promise<Set<number>> {
  const data = await tmdb<{ keywords?: Array<{ id?: unknown }>; results?: Array<{ id?: unknown }> }>(
    `/${media}/${id}/keywords`,
    86400,
  );
  const list = (media === "tv" ? data.results : data.keywords) ?? [];
  return new Set(list.map((k) => k.id).filter((k): k is number => typeof k === "number"));
}

function yearOf(c: Candidate): number | null {
  return c.year ? Number(c.year) : null;
}

/** The best-known titles in a category, for browsing before typing. */
async function discoverCandidates(media: Media, rule: CategoryRule, kw: number | null): Promise<Candidate[]> {
  const dateField = media === "tv" ? "first_air_date" : "primary_release_date";
  const qs = new URLSearchParams({ include_adult: "false", language: "en-US", page: "1", sort_by: "vote_count.desc" });
  if (rule.genres?.length) qs.set("with_genres", rule.genres.join(","));
  if (rule.from !== undefined) qs.set(`${dateField}.gte`, `${rule.from}-01-01`);
  if (rule.to !== undefined) qs.set(`${dateField}.lte`, `${rule.to}-12-31`);
  if (kw !== null) qs.set("with_keywords", String(kw));
  const data = await tmdb<{ results?: TmdbItem[] }>(`/discover/${media}?${qs}`, 86400);
  return (data.results ?? []).map((m) => toCandidate(m, media)).filter((c): c is Candidate => c !== null);
}

/**
 * Search inside one category. With no query it returns the category's best-known titles.
 * Genres and years filter TMDB's search results directly. Keyword categories then check each
 * remaining title's keywords, capped at 15 lookups per search.
 */
export async function searchCategory(media: Media, query: string, category: Category): Promise<Film[]> {
  const { rule } = category;
  const kw = rule.keyword ? await keywordId(rule.keyword) : null;
  if (rule.keyword && kw === null) return [];
  if (!query) return (await discoverCandidates(media, rule, kw)).slice(0, 12).map(strip);

  let hits = (await searchCandidates(media, query, 2)).filter((c) => matchesRule(rule, { genreIds: c.genreIds, year: yearOf(c) }));
  if (kw !== null) {
    const checked = await Promise.all(
      hits.slice(0, 15).map(async (c) => ((await titleKeywordIds(media, c.id)).has(kw) ? c : null)),
    );
    hits = checked.filter((c): c is Candidate => c !== null);
  }
  return hits.slice(0, 12).map(strip);
}

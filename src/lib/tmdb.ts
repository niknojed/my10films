import "server-only";
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

export async function searchFilms(query: string): Promise<Film[]> {
  const qs = new URLSearchParams({ query, include_adult: "false", language: "en-US", page: "1" });
  const data = await tmdb<{ results?: TmdbMovie[] }>(`/search/movie?${qs}`, 3600);
  const out: Film[] = [];
  for (const m of data.results ?? []) {
    if (m.adult === true) continue;
    const f = toFilm(m);
    if (f) out.push(f);
    if (out.length === 12) break;
  }
  return out;
}

/** Canonical record for one film. Used on save so stored titles never come from the browser. */
export async function getFilm(id: number): Promise<Film> {
  const m = await tmdb<TmdbMovie>(`/movie/${id}?language=en-US`, 86400);
  if (m.adult === true) throw new TmdbError("not_found", "TMDB has no such film.");
  const f = toFilm(m);
  if (!f) throw new TmdbError("not_found", "TMDB has no such film.");
  return f;
}

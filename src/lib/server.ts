import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clientIp } from "./ip";
import { MOST_PICKED_LIMIT, MOST_PICKED_MIN } from "./config";
import { getFilm, TmdbError } from "./tmdb";
import type { Film, Layout, PickedFilm, SharedList, Theme } from "./types";
import { isSlug } from "./validate";

let client: SupabaseClient | null = null;

let badUrlLogged = false;

/**
 * Returns null when Supabase is not configured, so the maker still works without it.
 * A malformed SUPABASE_URL is treated as unconfigured and logged once, instead of
 * throwing during prerender and failing the whole build.
 */
export function db(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  if (!isHttpUrl(url)) {
    if (!badUrlLogged) {
      console.error("SUPABASE_URL is not an http(s) URL. Expected https://<project-ref>.supabase.co");
      badUrlLogged = true;
    }
    return null;
  }
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function newSlug(): string {
  const bytes = randomBytes(10);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

/** One-way hash of the caller's address. The raw address is never stored. */
export function creatorHash(headers: Headers): string | null {
  const salt = process.env.HASH_SALT;
  if (!salt || salt.length < 16) return null;
  return createHmac("sha256", salt).update(clientIp(headers)).digest("hex");
}

export function contentHash(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/**
 * Live TMDB records for these ids, in order. Only ids are stored, because TMDB's terms forbid
 * keeping their data longer than six months; getFilm's fetch cache holds each record for a day.
 * A film TMDB has since removed comes back as null. Any other TMDB failure throws.
 */
async function filmsById(ids: number[]): Promise<Array<Film | null>> {
  const settled = await Promise.allSettled(ids.map((id) => getFilm(id)));
  return settled.map((r) => {
    if (r.status === "fulfilled") return r.value;
    if (r.reason instanceof TmdbError && r.reason.code === "not_found") return null;
    throw r.reason;
  });
}

export async function getSharedList(slug: string): Promise<SharedList | null> {
  if (!isSlug(slug)) return null;
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("lists")
    .select("slug,name,quote,layout,theme,created_at,list_films(position,tmdb_id)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`lists read failed: ${error.message}`);
  if (!data) return null;
  const ids = ((data.list_films ?? []) as Array<{ position: number; tmdb_id: number }>)
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((r) => r.tmdb_id);
  // A removed film keeps its slot as a title card, so the ranking stays intact.
  const found = await filmsById(ids);
  const films = ids.map((id, i) => found[i] ?? { id, title: "No longer listed", year: "", poster: null });
  return {
    slug: data.slug as string,
    name: (data.name as string) ?? "",
    quote: (data.quote as string) ?? "",
    layout: data.layout as Layout,
    theme: data.theme as Theme,
    films,
    createdAt: data.created_at as string,
  };
}

/** Films ranked by how many distinct people listed them. Empty until there is enough real data. */
export async function getMostPicked(): Promise<PickedFilm[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("most_picked", { lim: MOST_PICKED_LIMIT });
  if (error) {
    console.error("most_picked failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{ tmdb_id: number; picks: number }>;
  if (rows.length < MOST_PICKED_MIN) return [];
  let films: Array<Film | null>;
  try {
    films = await filmsById(rows.map((r) => r.tmdb_id));
  } catch (err) {
    console.error("most_picked: film lookup failed", err);
    return [];
  }
  const picked = rows.flatMap((r, i) => {
    const f = films[i];
    return f ? [{ ...f, picks: Number(r.picks) }] : [];
  });
  return picked.length < MOST_PICKED_MIN ? [] : picked;
}

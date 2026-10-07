import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MOST_PICKED_LIMIT, MOST_PICKED_MIN } from "./config";
import { isPosterPath } from "./tmdb";
import type { Film, Layout, PickedFilm, SharedList, Theme } from "./types";
import { isSlug } from "./validate";

let client: SupabaseClient | null = null;

/** Returns null when Supabase is not configured, so the maker still works without it. */
export function db(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
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
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", salt).update(ip).digest("hex");
}

export function contentHash(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

interface FilmRow {
  position: number;
  tmdb_id: number;
  title: string;
  year: string;
  poster_path: string | null;
}

function rowToFilm(r: { tmdb_id: number; title: string; year: string; poster_path: string | null }): Film {
  return {
    id: r.tmdb_id,
    title: r.title,
    year: r.year ?? "",
    poster: isPosterPath(r.poster_path) ? r.poster_path : null,
  };
}

export async function getSharedList(slug: string): Promise<SharedList | null> {
  if (!isSlug(slug)) return null;
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("lists")
    .select("slug,name,quote,layout,theme,created_at,list_films(position,tmdb_id,title,year,poster_path)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`lists read failed: ${error.message}`);
  if (!data) return null;
  const films = ((data.list_films ?? []) as FilmRow[])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(rowToFilm);
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
  const rows = (data ?? []) as Array<{
    tmdb_id: number;
    title: string;
    year: string;
    poster_path: string | null;
    picks: number;
  }>;
  if (rows.length < MOST_PICKED_MIN) return [];
  return rows.map((r) => ({ ...rowToFilm(r), picks: Number(r.picks) }));
}

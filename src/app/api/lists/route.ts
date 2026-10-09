import { NextResponse, type NextRequest } from "next/server";
import { SAVES_PER_HOUR, siteUrl } from "@/lib/config";
import { fail } from "@/lib/http";
import { contentHash, creatorHash, db, newSlug } from "@/lib/server";
import { getFilm, TmdbError } from "@/lib/tmdb";
import type { Film } from "@/lib/types";
import { parseSavePayload } from "@/lib/validate";

export const runtime = "nodejs";
const MAX_BODY = 4096;

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    return o.host === req.nextUrl.host || o.origin === new URL(siteUrl()).origin;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "forbidden", "Save from the site itself.");
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return fail(415, "bad_type", "Send JSON.");
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return fail(400, "bad_body", "The request could not be read.");
  }
  if (raw.length > MAX_BODY) return fail(413, "too_large", "The request is too large.");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "bad_json", "The request is not valid JSON.");
  }
  const parsed = parseSavePayload(body);
  if (!parsed.ok) return fail(422, "invalid", parsed.message);
  const input = parsed.value;

  const supabase = db();
  const creator = creatorHash(req.headers);
  if (!supabase || !creator) {
    console.error("lists: Supabase or HASH_SALT is not configured.");
    return fail(503, "not_configured", "Share links are not set up on this server yet.");
  }

  // Every id is checked against TMDB before saving. Only ids and positions are stored; pages that show
  // a list fetch titles, years and posters from TMDB again (see filmsById in lib/server.ts).
  let films: Film[];
  try {
    films = await Promise.all(input.filmIds.map((id) => getFilm(id)));
  } catch (err) {
    if (err instanceof TmdbError && err.code === "not_found") {
      return fail(422, "unknown_film", "One of these films is no longer in the film database. Remove it and save again.");
    }
    if (err instanceof TmdbError && err.code === "not_configured") {
      console.error("lists:", err.message);
      return fail(503, "not_configured", "Share links are not set up on this server yet.");
    }
    console.error("lists: film lookup failed", err);
    return fail(502, "upstream", "The film database is not answering. Your list is still here. Try again in a minute.");
  }

  const hash = contentHash([
    creator,
    input.name,
    input.quote,
    input.layout,
    input.theme,
    input.listType,
    input.genre,
    input.filmIds,
  ]);

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc("create_list", {
      p_slug: newSlug(),
      p_name: input.name,
      p_quote: input.quote,
      p_layout: input.layout,
      p_theme: input.theme,
      p_list_type: input.listType,
      p_genre: input.genre,
      p_content_hash: hash,
      p_creator_hash: creator,
      p_films: films,
      p_hourly_cap: SAVES_PER_HOUR,
    });
    if (!error && typeof data === "string") {
      return NextResponse.json({ slug: data, url: `${siteUrl()}/l/${data}` }, { status: 201 });
    }
    if (error?.message.includes("rate_limited")) {
      return fail(429, "rate_limited", `You can save ${SAVES_PER_HOUR} lists an hour. Try again later.`, {
        "Retry-After": "3600",
      });
    }
    // 23505: slug collision, or the same list saved twice at once. Retrying resolves both.
    if (error?.code !== "23505") {
      console.error("lists: create_list failed", error?.code, error?.message);
      return fail(500, "internal", "The list could not be saved. Try again.");
    }
  }
  console.error("lists: gave up after repeated unique violations");
  return fail(500, "internal", "The list could not be saved. Try again.");
}

import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { POSTER_SIZES, posterUrl, type PosterSize } from "@/lib/img";
import { isPosterPath } from "@/lib/tmdb";

export const runtime = "nodejs";

/**
 * Same-origin pass-through for one TMDB poster. The maker only calls this when a direct
 * cross-origin load cannot be drawn to canvas. Nothing is stored on this server.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p");
  const s = req.nextUrl.searchParams.get("s") as PosterSize | null;
  if (!isPosterPath(p) || !s || !POSTER_SIZES.includes(s)) {
    return fail(400, "bad_request", "Unknown poster.");
  }
  let upstream: Response;
  try {
    upstream = await fetch(posterUrl(p, s), { signal: AbortSignal.timeout(8000) });
  } catch {
    return fail(504, "timeout", "The poster did not load.");
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !upstream.body || !type.startsWith("image/")) {
    return fail(upstream.status === 404 ? 404 : 502, "upstream", "The poster did not load.");
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

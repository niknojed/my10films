import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/http";
import { searchFilms, TmdbError } from "@/lib/tmdb";
import { cleanText } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = cleanText(req.nextUrl.searchParams.get("q"), 80);
  if (q.length < 1) return fail(400, "bad_query", "Type a title to search.");
  try {
    const results = await searchFilms(q);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    if (err instanceof TmdbError) {
      if (err.code === "not_configured") {
        console.error("search:", err.message);
        return fail(503, "not_configured", "Search is not set up on this server yet.");
      }
      if (err.code === "timeout") return fail(504, "timeout", "The film database took too long. Try again.");
      console.error("search:", err.message);
      return fail(502, "upstream", "The film database is not answering. Try again in a minute.");
    }
    console.error("search: unexpected", err);
    return fail(500, "internal", "Search failed. Try again.");
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { categoryById } from "@/lib/categories";
import { fail } from "@/lib/http";
import { SECTION_INFO, isSection } from "@/lib/sections";
import { searchCategory, searchTitles, TmdbError } from "@/lib/tmdb";
import { cleanText } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * GET /api/search?q=&section=films|shows&cat=<category id>&all=1
 * With a category, results are limited to it, and an empty query browses it. `all=1` ignores the
 * category for the times TMDB's tags miss a title.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = cleanText(params.get("q"), 80);
  const rawSection = params.get("section") ?? "films";
  if (!isSection(rawSection)) return fail(400, "bad_section", "Unknown section.");
  const media = SECTION_INFO[rawSection].media;
  const catId = params.get("cat");
  const category = catId ? categoryById(rawSection, catId) : null;
  if (catId && !category) return fail(400, "bad_category", "Unknown category.");
  const scoped = category !== null && params.get("all") !== "1";
  if (!q && !scoped) return fail(400, "bad_query", "Type a title to search.");

  try {
    const results = scoped ? await searchCategory(media, q, category) : await searchTitles(media, q);
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

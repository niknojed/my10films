import type { Section } from "./sections";

/**
 * What a title must have to count for a category. Genres and years come with every TMDB search
 * result. A keyword needs one extra lookup per title, so keyword categories cost more to search.
 */
export interface CategoryRule {
  /** TMDB genre ids, all required. */
  genres?: readonly number[];
  /** TMDB keyword name, resolved to an id at runtime. */
  keyword?: string;
  /** Inclusive release or first-air year bounds. */
  from?: number;
  to?: number;
}

export interface Category {
  id: string;
  /** Chip label and the large line on the page. */
  label: string;
  /** Plural noun for headings: "The top ten 80s action films of @k". */
  noun: string;
  /** Shown above search results: "Showing action films released 1980–1989." */
  scope: string;
  rule: CategoryRule;
}

// TMDB genre ids. Film: 28 Action, 35 Comedy, 27 Horror, 10749 Romance, 878 Science Fiction.
// TV: 16 Animation, 35 Comedy, 80 Crime, 18 Drama, 10765 Sci-Fi & Fantasy.
export const CATEGORIES: Record<Section, readonly Category[]> = {
  films: [
    { id: "80s-action", label: "80s Action", noun: "80s action films", scope: "action films released 1980–1989", rule: { genres: [28], from: 1980, to: 1989 } },
    { id: "blaxploitation", label: "Blaxploitation", noun: "blaxploitation films", scope: "films TMDB tags as blaxploitation", rule: { keyword: "blaxploitation cinema" } },
    { id: "horror-pre-2000", label: "Horror Before 2000", noun: "pre-2000 horror films", scope: "horror released before 2000", rule: { genres: [27], to: 1999 } },
    { id: "indie", label: "Indie", noun: "indie films", scope: "films TMDB tags as independent", rule: { keyword: "independent film" } },
    { id: "rom-coms", label: "Rom-Coms", noun: "rom-coms", scope: "films tagged both romance and comedy", rule: { genres: [10749, 35] } },
    { id: "sci-fi", label: "Sci-Fi", noun: "sci-fi films", scope: "science fiction", rule: { genres: [878] } },
  ],
  shows: [
    { id: "90s-tv", label: "90s TV", noun: "90s shows", scope: "shows that first aired 1990–1999", rule: { from: 1990, to: 1999 } },
    { id: "sitcoms", label: "Sitcoms", noun: "sitcoms", scope: "shows TMDB tags as sitcoms", rule: { keyword: "sitcom" } },
    { id: "crime-dramas", label: "Crime Dramas", noun: "crime dramas", scope: "shows tagged both crime and drama", rule: { genres: [80, 18] } },
    { id: "animated", label: "Animated", noun: "animated shows", scope: "animated shows", rule: { genres: [16] } },
    { id: "sci-fi-fantasy", label: "Sci-Fi & Fantasy", noun: "sci-fi and fantasy shows", scope: "sci-fi and fantasy shows", rule: { genres: [10765] } },
  ],
};

export function categoryById(section: Section, id: unknown): Category | null {
  if (typeof id !== "string") return null;
  return CATEGORIES[section].find((c) => c.id === id) ?? null;
}

export function isCategoryId(section: Section, v: unknown): v is string {
  return categoryById(section, v) !== null;
}

export function isAnyCategoryId(v: unknown): v is string {
  return isCategoryId("films", v) || isCategoryId("shows", v);
}

/**
 * Film lists saved before categories stored a TMDB genre name. Kept so their share pages and
 * preview images still read right. New lists can't choose these.
 */
export const LEGACY_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy",
  "History", "Horror", "Music", "Mystery", "Romance", "Science Fiction", "Thriller", "War", "Western",
] as const;

export function isStoredGenre(v: unknown): v is string {
  return isCategoryId("films", v) || (typeof v === "string" && (LEGACY_GENRES as readonly string[]).includes(v));
}

export function genreLabel(section: Section, genre: string | null): string {
  return categoryById(section, genre)?.label ?? genre ?? "Genre";
}

export function genreNoun(section: Section, genre: string | null): string {
  const c = categoryById(section, genre);
  if (c) return c.noun;
  return `${(genre ?? "genre").toLowerCase()} ${section === "shows" ? "shows" : "films"}`;
}

/** The genre and year part of a rule. Keywords are checked separately because they cost a lookup. */
export function matchesRule(rule: CategoryRule, item: { genreIds: readonly number[]; year: number | null }): boolean {
  if (rule.genres && !rule.genres.every((g) => item.genreIds.includes(g))) return false;
  if (rule.from !== undefined || rule.to !== undefined) {
    if (item.year === null) return false;
    if (rule.from !== undefined && item.year < rule.from) return false;
    if (rule.to !== undefined && item.year > rule.to) return false;
  }
  return true;
}

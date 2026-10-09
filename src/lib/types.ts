import type { FORMATS, LAYOUTS, LIST_TYPES, THEMES } from "./config";

export type Layout = (typeof LAYOUTS)[number];
export type Theme = (typeof THEMES)[number];
export type Format = (typeof FORMATS)[number];
export type ListType = (typeof LIST_TYPES)[number];

export interface Film {
  /** TMDB movie id. */
  id: number;
  title: string;
  /** Four-digit release year, or "" when TMDB has no date. */
  year: string;
  /** TMDB poster path such as "/abc123.jpg", or null. */
  poster: string | null;
}

export interface PickedFilm extends Film {
  picks: number;
}

export interface SharedList {
  slug: string;
  name: string;
  quote: string;
  layout: Layout;
  theme: Theme;
  listType: ListType;
  /** Set only when listType is "genre". */
  genre: string | null;
  films: Film[];
  createdAt: string;
}

export type ApiError = { error: { code: string; message: string } };

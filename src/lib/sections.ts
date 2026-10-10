export const SECTIONS = ["films", "shows"] as const;
export type Section = (typeof SECTIONS)[number];

export interface SectionInfo {
  /** Switcher label. */
  nav: string;
  /** Small line above the large heading, and the poster footer. */
  kicker: string;
  /** Plural noun in running text: "Search for ten films". */
  noun: string;
  path: string;
  /** TMDB media type behind this section. */
  media: "movie" | "tv";
  placeholder: string;
}

export const SECTION_INFO: Record<Section, SectionInfo> = {
  films: {
    nav: "Films",
    kicker: "My 10 Films",
    noun: "films",
    path: "/",
    media: "movie",
    placeholder: "Blade Runner, Spirited Away, Do the Right Thing…",
  },
  shows: {
    nav: "Shows",
    kicker: "My 10 Shows",
    noun: "shows",
    path: "/shows",
    media: "tv",
    placeholder: "The Wire, Martin, Cowboy Bebop…",
  },
};

export function isSection(v: unknown): v is Section {
  return typeof v === "string" && (SECTIONS as readonly string[]).includes(v);
}

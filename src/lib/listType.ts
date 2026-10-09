import type { ListType } from "./types";

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  made: "That made you",
  alltime: "All-time ten",
  genre: "By genre",
};

/** TMDB's film genres, minus "TV Movie", which describes a format rather than a genre. */
export const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
  "War",
  "Western",
] as const;

export function isGenre(v: unknown): v is string {
  return typeof v === "string" && (GENRES as readonly string[]).includes(v);
}

export interface Heading {
  /** Small line above the name, in sentence case. Callers uppercase it where the design needs it. */
  eyebrow: string;
  /** The large line. */
  big: string;
}

/**
 * The poster and share-page heading for a list type. With a name the name is the large line;
 * without one the type itself is ("My top ten / Horror").
 */
export function headingFor(listType: ListType, genre: string | null, name: string): Heading {
  const n = name.trim();
  switch (listType) {
    case "alltime":
      return n ? { eyebrow: "The all-time top ten of", big: n } : { eyebrow: "My top ten", big: "All-time" };
    case "genre": {
      const g = genre ?? "Genre";
      return n ? { eyebrow: `The top ten ${g.toLowerCase()} films of`, big: n } : { eyebrow: "My top ten", big: g };
    }
    default:
      return { eyebrow: "The ten films that made", big: n || "Me" };
  }
}

/** One sentence for page titles and the share sheet, such as "The top ten horror films of @k". */
export function headingLine(listType: ListType, genre: string | null, name: string): string {
  const n = name.trim();
  switch (listType) {
    case "alltime":
      return n ? `The all-time top ten of ${n}` : "My all-time top ten";
    case "genre": {
      const g = (genre ?? "genre").toLowerCase();
      return n ? `The top ten ${g} films of ${n}` : `My top ten ${g} films`;
    }
    default:
      return `The ten films that made ${n || "me"}`;
  }
}

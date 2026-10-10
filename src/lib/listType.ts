import { genreLabel, genreNoun } from "./categories";
import { SECTION_INFO, type Section } from "./sections";
import type { ListType } from "./types";

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  made: "That made me",
  alltime: "All-time ten",
  genre: "By genre",
};

/** The large line of the page heading, under "My 10 Films" or "My 10 Shows". */
export function pageBigLine(listType: ListType, genre: string | null, section: Section = "films"): string {
  if (listType === "alltime") return "All-time ten";
  if (listType === "genre") return genre ? genreLabel(section, genre) : "By genre";
  return "That made me";
}

export interface Heading {
  /** Small line above the name, in sentence case. Callers uppercase it where the design needs it. */
  eyebrow: string;
  /** The large line. */
  big: string;
}

/**
 * The poster and share-page heading for a list type. With a name the name is the large line;
 * without one the type itself is ("My top ten / 80s Action").
 */
export function headingFor(listType: ListType, genre: string | null, name: string, section: Section = "films"): Heading {
  const n = name.trim();
  switch (listType) {
    case "alltime":
      return n ? { eyebrow: "The all-time top ten of", big: n } : { eyebrow: "My top ten", big: "All-time" };
    case "genre":
      return n
        ? { eyebrow: `The top ten ${genreNoun(section, genre)} of`, big: n }
        : { eyebrow: "My top ten", big: genreLabel(section, genre) };
    default:
      return { eyebrow: `The ten ${SECTION_INFO[section].noun} that made`, big: n || "Me" };
  }
}

/** One sentence for page titles and the share sheet, such as "The top ten horror films of @k". */
export function headingLine(listType: ListType, genre: string | null, name: string, section: Section = "films"): string {
  const n = name.trim();
  switch (listType) {
    case "alltime":
      return n ? `The all-time top ten of ${n}` : "My all-time top ten";
    case "genre":
      return n ? `The top ten ${genreNoun(section, genre)} of ${n}` : `My top ten ${genreNoun(section, genre)}`;
    default:
      return `The ten ${SECTION_INFO[section].noun} that made ${n || "me"}`;
  }
}

/**
 * Font size for the large line of the 1200 × 630 preview image, whose text column is 348px wide.
 * Sized by the longest word, so one word never splits mid-word and two words wrap between them.
 * 0.56em is a slightly generous width for Big Shoulders Display 900 capitals.
 */
export function previewBigSize(text: string, width = 348, max = 132, min = 56): number {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => w.length));
  return Math.max(min, Math.min(max, Math.floor(width / (longest * 0.56))));
}

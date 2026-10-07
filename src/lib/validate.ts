import { LAYOUTS, MAX_FILMS, NAME_MAX, QUOTE_MAX, THEMES } from "./config";
import type { Layout, Theme } from "./types";

export interface SavePayload {
  name: string;
  quote: string;
  layout: Layout;
  theme: Theme;
  filmIds: number[];
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

/** Strips control characters and collapses whitespace. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function parseSavePayload(body: unknown): Parsed<SavePayload> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Send a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const layout = b.layout;
  const theme = b.theme;
  if (typeof layout !== "string" || !(LAYOUTS as readonly string[]).includes(layout)) {
    return { ok: false, message: "Unknown layout." };
  }
  if (typeof theme !== "string" || !(THEMES as readonly string[]).includes(theme)) {
    return { ok: false, message: "Unknown theme." };
  }
  const ids = b.filmIds;
  if (!Array.isArray(ids) || ids.length !== MAX_FILMS) {
    return { ok: false, message: `A list needs exactly ${MAX_FILMS} films.` };
  }
  const filmIds: number[] = [];
  for (const id of ids) {
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0 || id > 2_000_000_000) {
      return { ok: false, message: "Each film needs a valid id." };
    }
    if (filmIds.includes(id)) return { ok: false, message: "A film appears twice." };
    filmIds.push(id);
  }
  return {
    ok: true,
    value: {
      name: cleanText(b.name, NAME_MAX),
      quote: cleanText(b.quote, QUOTE_MAX),
      layout: layout as Layout,
      theme: theme as Theme,
      filmIds,
    },
  };
}

const SLUG_RE = /^[a-z0-9]{8,12}$/;
export function isSlug(v: unknown): v is string {
  return typeof v === "string" && SLUG_RE.test(v);
}

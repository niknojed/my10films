import { FORMATS, LAYOUTS, LIST_TYPES, MAX_FILMS, NAME_MAX, QUOTE_MAX, THEMES } from "./config";
import { isAnyCategoryId, isCategoryId } from "./categories";
import type { Section } from "./sections";
import type { Film, Format, Layout, ListType, Theme } from "./types";

export interface MakerState {
  picks: Film[];
  name: string;
  quote: string;
  format: Format;
  layout: Layout;
  theme: Theme;
  listType: ListType;
  /** Category id for "genre" lists. Kept when switching away, so switching back restores it. */
  genre: string | null;
}

export const INITIAL_STATE: MakerState = {
  picks: [],
  name: "",
  quote: "",
  format: "feed",
  layout: "top",
  theme: "silver",
  listType: "made",
  genre: null,
};

export type MakerAction =
  | { type: "hydrate"; state: MakerState }
  | { type: "add"; film: Film }
  | { type: "remove"; id: number }
  | { type: "move"; from: number; to: number }
  | { type: "clear" }
  | { type: "name"; value: string }
  | { type: "quote"; value: string }
  | { type: "format"; value: Format }
  | { type: "layout"; value: Layout }
  | { type: "theme"; value: Theme }
  | { type: "listType"; value: ListType }
  | { type: "genre"; value: string | null };

export function makerReducer(state: MakerState, action: MakerAction): MakerState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "add":
      if (state.picks.length >= MAX_FILMS || state.picks.some((p) => p.id === action.film.id)) return state;
      return { ...state, picks: [...state.picks, action.film] };
    case "remove":
      return { ...state, picks: state.picks.filter((p) => p.id !== action.id) };
    case "move": {
      const { from, to } = action;
      const n = state.picks.length;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return state;
      const picks = state.picks.slice();
      const [film] = picks.splice(from, 1);
      if (!film) return state;
      picks.splice(to, 0, film);
      return { ...state, picks };
    }
    case "clear":
      return { ...state, picks: [] };
    case "name":
      return { ...state, name: action.value.slice(0, NAME_MAX) };
    case "quote":
      return { ...state, quote: action.value.slice(0, QUOTE_MAX) };
    case "format":
      return { ...state, format: action.value };
    case "layout":
      return { ...state, layout: action.value };
    case "theme":
      return { ...state, theme: action.value };
    case "listType":
      return { ...state, listType: action.value };
    case "genre":
      return { ...state, genre: isAnyCategoryId(action.value) ? action.value : null };
  }
}

const POSTER_RE = /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png)$/;

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Rebuilds state from untrusted storage. Anything malformed falls back to the default. */
export function reviveState(raw: unknown, section: Section = "films"): MakerState {
  if (!raw || typeof raw !== "object") return INITIAL_STATE;
  const r = raw as Record<string, unknown>;
  const picks: Film[] = [];
  if (Array.isArray(r.picks)) {
    for (const p of r.picks) {
      if (!p || typeof p !== "object") continue;
      const f = p as Record<string, unknown>;
      if (typeof f.id !== "number" || !Number.isInteger(f.id) || f.id <= 0) continue;
      if (typeof f.title !== "string" || !f.title.trim()) continue;
      if (picks.some((x) => x.id === f.id)) continue;
      picks.push({
        id: f.id,
        title: f.title.slice(0, 200),
        year: typeof f.year === "string" && /^\d{4}$/.test(f.year) ? f.year : "",
        poster: typeof f.poster === "string" && POSTER_RE.test(f.poster) ? f.poster : null,
      });
      if (picks.length === MAX_FILMS) break;
    }
  }
  return {
    picks,
    name: typeof r.name === "string" ? r.name.slice(0, NAME_MAX) : "",
    quote: typeof r.quote === "string" ? r.quote.slice(0, QUOTE_MAX) : "",
    format: oneOf(r.format, FORMATS, INITIAL_STATE.format),
    layout: oneOf(r.layout, LAYOUTS, INITIAL_STATE.layout),
    theme: oneOf(r.theme, THEMES, INITIAL_STATE.theme),
    listType: oneOf(r.listType, LIST_TYPES, INITIAL_STATE.listType),
    // Lists from before categories hold a TMDB genre name. It no longer applies, so it resets.
    genre: isCategoryId(section, r.genre) ? r.genre : null,
  };
}

export const STORAGE_KEY = "my10films.v1";
/** Shows keep their own list, so switching sections never mixes films and shows. */
export const SHOWS_STORAGE_KEY = "my10films.shows.v1";

export function storageKey(section: Section): string {
  return section === "shows" ? SHOWS_STORAGE_KEY : STORAGE_KEY;
}

export function loadState(section: Section = "films"): MakerState {
  try {
    const raw = window.localStorage.getItem(storageKey(section));
    return raw ? reviveState(JSON.parse(raw), section) : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

/** Returns false when the browser refuses storage, so the UI can say the list will not persist. */
export function saveState(state: MakerState, section: Section = "films"): boolean {
  try {
    window.localStorage.setItem(storageKey(section), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

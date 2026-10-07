import { FORMATS, LAYOUTS, MAX_FILMS, NAME_MAX, QUOTE_MAX, THEMES } from "./config";
import type { Film, Format, Layout, Theme } from "./types";

export interface MakerState {
  picks: Film[];
  name: string;
  quote: string;
  format: Format;
  layout: Layout;
  theme: Theme;
}

export const INITIAL_STATE: MakerState = {
  picks: [],
  name: "",
  quote: "",
  format: "feed",
  layout: "top",
  theme: "velvet",
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
  | { type: "theme"; value: Theme };

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
  }
}

const POSTER_RE = /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png)$/;

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Rebuilds state from untrusted storage. Anything malformed falls back to the default. */
export function reviveState(raw: unknown): MakerState {
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
  };
}

export const STORAGE_KEY = "my10films.v1";

export function loadState(): MakerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? reviveState(JSON.parse(raw)) : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

/** Returns false when the browser refuses storage, so the UI can say the list will not persist. */
export function saveState(state: MakerState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

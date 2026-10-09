export const SITE_NAME = "My 10 Films";
export const MAX_FILMS = 10;
export const NAME_MAX = 22;
export const QUOTE_MAX = 80;
export const SAVES_PER_HOUR = 10;
/** Most-picked stays hidden until this many distinct films have real counts. */
// Most picked is hidden for now. Saved lists still count toward it in the database.
export const SHOW_MOST_PICKED = false;
export const MOST_PICKED_MIN = 10;
export const MOST_PICKED_LIMIT = 20;

export const LAYOUTS = ["top", "equal"] as const;
export const THEMES = ["silver", "slate", "velvet"] as const;
export const FORMATS = ["feed", "story"] as const;
export const LIST_TYPES = ["made", "alltime", "genre"] as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

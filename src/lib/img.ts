export type PosterSize = "w92" | "w185" | "w342" | "w500" | "w780";
export const POSTER_SIZES: readonly PosterSize[] = ["w92", "w185", "w342", "w500", "w780"];

export function posterUrl(path: string, size: PosterSize): string {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/** Same-origin fallback used when the browser refuses a cross-origin canvas read. */
export function proxiedPosterUrl(path: string, size: PosterSize): string {
  return `/api/img?p=${encodeURIComponent(path)}&s=${size}`;
}

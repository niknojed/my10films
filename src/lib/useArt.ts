"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { posterUrl, proxiedPosterUrl, type PosterSize } from "./img";
import type { ArtMap } from "./poster";
import type { Film } from "./types";

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Direct from TMDB with CORS first; the same-origin pass-through second; null when both fail. */
async function loadPoster(path: string, size: PosterSize): Promise<HTMLImageElement | null> {
  return (await loadImage(posterUrl(path, size), true)) ?? (await loadImage(proxiedPosterUrl(path, size), false));
}

/**
 * Loads canvas-safe poster art for the current picks. The first pick loads at a larger size when it
 * gets top billing. Returns a map keyed by film id; films still loading or without art are absent.
 */
export function useArt(picks: readonly Film[], bigFirst: boolean): ArtMap {
  const cache = useRef(new Map<string, HTMLImageElement | null | "loading">());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    picks.forEach((film, i) => {
      if (!film.poster) return;
      const size: PosterSize = i === 0 && bigFirst ? "w780" : "w500";
      const key = size + film.poster;
      if (cache.current.has(key)) return;
      cache.current.set(key, "loading");
      void loadPoster(film.poster, size).then((img) => {
        cache.current.set(key, img);
        if (alive) setVersion((v) => v + 1);
      });
    });
    return () => {
      alive = false;
    };
  }, [picks, bigFirst]);

  return useMemo(() => {
    const map = new Map<number, HTMLImageElement | null>();
    picks.forEach((film, i) => {
      if (!film.poster) return;
      const big = cache.current.get("w780" + film.poster);
      const std = cache.current.get("w500" + film.poster);
      const preferred = i === 0 && bigFirst ? big : std;
      const any = [preferred, big, std].find((v): v is HTMLImageElement => v instanceof HTMLImageElement);
      if (any) map.set(film.id, any);
    });
    return map;
    // version changes when an image settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, bigFirst, version]);
}

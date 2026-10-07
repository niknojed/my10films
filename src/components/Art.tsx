"use client";

import { useEffect, useRef, useState } from "react";
import { posterUrl, type PosterSize } from "@/lib/img";
import { drawTitleCard } from "@/lib/poster";
import type { Film } from "@/lib/types";

/** Poster art for one film. Falls back to a generated title card when TMDB has none or it fails to load. */
export default function Art({ film, size, rank }: { film: Film; size: PosterSize; rank?: number }) {
  const [failed, setFailed] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const useCard = !film.poster || failed;

  useEffect(() => setFailed(false), [film.poster]);

  useEffect(() => {
    if (!useCard) return;
    const el = canvas.current;
    if (!el) return;
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(el.clientWidth * dpr);
      if (!w) return;
      el.width = w;
      el.height = Math.round(w * 1.5);
      const ctx = el.getContext("2d");
      if (ctx) drawTitleCard(ctx, { x: 0, y: 0, w: el.width, h: el.height }, film);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(el);
    void document.fonts?.ready.then(paint);
    return () => ro.disconnect();
  }, [useCard, film]);

  return (
    <div className="art">
      {useCard ? (
        <canvas ref={canvas} role="img" aria-label={`${film.title}${film.year ? `, ${film.year}` : ""}`} />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={posterUrl(film.poster!, size)}
          alt={`Poster for ${film.title}${film.year ? ` (${film.year})` : ""}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
      {rank ? <span className="rank">{String(rank).padStart(2, "0")}</span> : null}
    </div>
  );
}

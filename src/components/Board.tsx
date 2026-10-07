"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_FILMS } from "@/lib/config";
import type { Film } from "@/lib/types";
import Art from "./Art";

interface Props {
  picks: readonly Film[];
  onMove: (from: number, to: number) => void;
  onRemove: (id: number) => void;
  onEmptySlot: () => void;
  announce: (message: string) => void;
}

const icons = {
  prev: <path d="M10 3 5 8l5 5" />,
  next: <path d="m6 3 5 5-5 5" />,
  grip: <path d="M5 4h.01M11 4h.01M5 8h.01M11 8h.01M5 12h.01M11 12h.01" />,
  del: <path d="m4 4 8 8M12 4l-8 8" />,
};

function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export default function Board({ picks, onMove, onRemove, onEmptySlot, announce }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const drag = useRef<{ pointerId: number; index: number; from: number } | null>(null);
  const focusKey = useRef<string | null>(null);
  const picksRef = useRef(picks);
  picksRef.current = picks;

  // Keep keyboard focus on the control the person just used, or its neighbor when it became disabled.
  useLayoutEffect(() => {
    const key = focusKey.current;
    if (!key) return;
    focusKey.current = null;
    const root = listRef.current;
    if (!root) return;
    let el = root.querySelector<HTMLButtonElement>(`[data-k="${key}"]`);
    if (el?.disabled) el = el.parentElement?.querySelector<HTMLButtonElement>("button:not(:disabled):not(.tool-grip)") ?? null;
    el?.focus();
  }, [picks]);

  useEffect(() => {
    function slotAt(x: number, y: number): number | null {
      const slots = listRef.current?.children;
      if (!slots) return null;
      for (let j = 0; j < picksRef.current.length; j++) {
        const r = slots[j]?.getBoundingClientRect();
        if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return j;
      }
      return null;
    }
    function onPointerMove(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const j = slotAt(e.clientX, e.clientY);
      if (j === null || j === d.index) return;
      onMove(d.index, j);
      d.index = j;
      setDragIndex(j);
    }
    function onPointerEnd(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      drag.current = null;
      setDragIndex(null);
      const film = picksRef.current[d.index];
      if (film && d.index !== d.from) announce(`${film.title} moved to number ${d.index + 1}.`);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [onMove, announce]);

  function startDrag(e: React.PointerEvent, index: number, fromGrip: boolean) {
    if (!fromGrip && (e.pointerType !== "mouse" || e.button !== 0)) return;
    e.preventDefault();
    drag.current = { pointerId: e.pointerId, index, from: index };
    setDragIndex(index);
  }

  function step(film: Film, index: number, delta: -1 | 1) {
    const to = index + delta;
    if (to < 0 || to >= picks.length) return;
    focusKey.current = `${delta < 0 ? "prev" : "next"}:${film.id}`;
    onMove(index, to);
    announce(`${film.title} moved to number ${to + 1}.`);
  }

  function remove(film: Film, index: number) {
    const neighbor = picks[index + 1] ?? picks[index - 1];
    if (neighbor) focusKey.current = `del:${neighbor.id}`;
    else onEmptySlot();
    onRemove(film.id);
    announce(`${film.title} removed.`);
  }

  const empties = Array.from({ length: MAX_FILMS - picks.length }, (_, i) => picks.length + i + 1);

  return (
    <ol className="board" ref={listRef}>
      {picks.map((film, i) => (
        <li key={film.id} className={`slot slot-filled${dragIndex === i ? " slot-dragging" : ""}`}>
          <div onPointerDown={(e) => startDrag(e, i, false)}>
            <Art film={film} size="w342" rank={i + 1} />
          </div>
          <div className="tools">
            <button
              type="button"
              className="tool"
              data-k={`prev:${film.id}`}
              disabled={i === 0}
              aria-label={`Move ${film.title} up to number ${i}`}
              onClick={() => step(film, i, -1)}
            >
              <Icon name="prev" />
            </button>
            <button
              type="button"
              className="tool"
              data-k={`next:${film.id}`}
              disabled={i === picks.length - 1}
              aria-label={`Move ${film.title} down to number ${i + 2}`}
              onClick={() => step(film, i, 1)}
            >
              <Icon name="next" />
            </button>
            <button
              type="button"
              className="tool tool-grip"
              tabIndex={-1}
              aria-hidden="true"
              onPointerDown={(e) => startDrag(e, i, true)}
            >
              <Icon name="grip" />
            </button>
            <button
              type="button"
              className="tool"
              data-k={`del:${film.id}`}
              aria-label={`Remove ${film.title}`}
              onClick={() => remove(film, i)}
            >
              <Icon name="del" />
            </button>
          </div>
          <p className="cap">
            {film.title} {film.year ? <span>{film.year}</span> : null}
          </p>
        </li>
      ))}
      {empties.map((n) => (
        <li key={`empty-${n}`} className="slot">
          <button type="button" className="empty" onClick={onEmptySlot} aria-label={`Slot ${n} is empty. Go to search.`}>
            <b>{n}</b>
            <span className="mono">Empty</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

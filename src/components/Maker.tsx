"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { MAX_FILMS } from "@/lib/config";
import { INITIAL_STATE, loadState, makerReducer, saveState } from "@/lib/store";
import type { Film, PickedFilm } from "@/lib/types";
import { useArt } from "@/lib/useArt";
import Art from "./Art";
import Board from "./Board";
import PosterPanel from "./PosterPanel";
import Search from "./Search";

export default function Maker({ mostPicked }: { mostPicked: PickedFilm[] }) {
  const [state, dispatch] = useReducer(makerReducer, INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [live, setLive] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch({ type: "hydrate", state: loadState() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) setStorageOk(saveState(state));
  }, [state, hydrated]);

  // Another tab changed the list: adopt it so two tabs never overwrite each other blindly.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea === window.localStorage) dispatch({ type: "hydrate", state: loadState() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const announce = useCallback((message: string) => {
    setLive("");
    window.setTimeout(() => setLive(message), 30);
  }, []);

  const pickedIds = useMemo(() => new Set(state.picks.map((p) => p.id)), [state.picks]);
  const full = state.picks.length >= MAX_FILMS;
  const left = MAX_FILMS - state.picks.length;
  const art = useArt(state.picks, state.layout === "top");

  const add = useCallback(
    (film: Film) => {
      if (state.picks.length >= MAX_FILMS) return announce("Your ten are set. Remove one to swap.");
      if (state.picks.some((p) => p.id === film.id)) return announce(`${film.title} is already on your list.`);
      dispatch({ type: "add", film: { id: film.id, title: film.title, year: film.year, poster: film.poster } });
      announce(`${film.title} added at number ${state.picks.length + 1}.`);
    },
    [state.picks, announce],
  );

  const move = useCallback((from: number, to: number) => dispatch({ type: "move", from, to }), []);
  const remove = useCallback((id: number) => dispatch({ type: "remove", id }), []);
  const focusSearch = useCallback(() => searchRef.current?.focus(), []);

  return (
    // Phones read top to bottom: build, poster, then Most picked to browse. On wide screens Most picked
    // sits under the list while the poster spans both rows on the right.
    <div className="grid min-w-0 gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-x-14 lg:gap-y-6">
      <section className="grid min-w-0 content-start gap-6 lg:col-start-1 lg:row-start-1" aria-label="Build your list">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="h-sec">Pick</h2>
            <p className="mono text-mute" aria-live="polite">
              {state.picks.length} of {MAX_FILMS}
              {left ? ` · ${left} to go` : " · full"}
            </p>
          </div>
          <Search ref={searchRef} pickedIds={pickedIds} full={full} onAdd={add} />
          {!storageOk ? (
            <p className="status status-error" role="status">
              This browser is blocking storage, so your list will be lost when you close the tab.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 className="h-sec">Rank</h2>
            {state.picks.length > 0 ? (
              confirmClear ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  Remove all {state.picks.length}?
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      dispatch({ type: "clear" });
                      setConfirmClear(false);
                      announce("List cleared.");
                      focusSearch();
                    }}
                  >
                    Clear list
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmClear(false)}>
                    Keep it
                  </button>
                </span>
              ) : (
                <button type="button" className="text-sm underline" onClick={() => setConfirmClear(true)}>
                  Clear list
                </button>
              )
            ) : null}
          </div>
          <p className="hint">
            Number 1 gets top billing on the poster. Drag a poster with a mouse, use the grip on touch, or use the
            arrows.
          </p>
          <Board picks={state.picks} onMove={move} onRemove={remove} onEmptySlot={focusSearch} announce={announce} />
        </div>
      </section>

      <PosterPanel state={state} dispatch={dispatch} art={art} />
      {mostPicked.length > 0 ? (
        <section
          className="grid min-w-0 gap-3 border-t border-line pt-6 lg:col-start-1 lg:row-start-2"
          aria-label="Most picked"
        >
          <h2 className="h-sec">Most picked</h2>
          <p className="hint">Films that appear on the most shared lists, counted once per person.</p>
          <ul className="picked">
            {mostPicked.map((film) => {
              const on = pickedIds.has(film.id);
              return (
                <li key={film.id}>
                  <Art film={film} size="w185" />
                  <p className="cap">
                    {film.title} <span>{film.picks}</span>
                  </p>
                  <button
                    type="button"
                    className="btn min-h-11 text-sm"
                    disabled={on || full}
                    aria-label={on ? `${film.title} is on your list` : `Add ${film.title}`}
                    onClick={() => add(film)}
                  >
                    {on ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  );
}

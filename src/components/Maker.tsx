"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { categoryById } from "@/lib/categories";
import { MAX_FILMS } from "@/lib/config";
import { pageBigLine } from "@/lib/listType";
import { SECTION_INFO, type Section } from "@/lib/sections";
import { INITIAL_STATE, loadState, makerReducer, saveState, storageKey } from "@/lib/store";
import type { Film, PickedFilm } from "@/lib/types";
import { useArt } from "@/lib/useArt";
import Art from "./Art";
import Board from "./Board";
import ListTypeChips from "./ListTypeChips";
import PosterPanel from "./PosterPanel";
import Search from "./Search";
import SectionSwitch from "./SectionSwitch";

export default function Maker({ mostPicked, section = "films" }: { mostPicked: PickedFilm[]; section?: Section }) {
  const info = SECTION_INFO[section];
  const [state, dispatch] = useReducer(makerReducer, INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [live, setLive] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch({ type: "hydrate", state: loadState(section) });
    setHydrated(true);
  }, [section]);

  useEffect(() => {
    if (hydrated) setStorageOk(saveState(state, section));
  }, [state, hydrated, section]);

  // Shows swap the accent and round the frames. The layout script sets this before paint on a full
  // load; this keeps it right when the switcher moves between sections without one.
  useEffect(() => {
    document.documentElement.dataset.section = section;
  }, [section]);

  // The page wears the poster theme. The layout script set it before paint; this follows changes.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = state.theme;
    const bg = getComputedStyle(root).getPropertyValue("--color-bg").trim();
    if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
  }, [state.theme, hydrated]);

  // Another tab changed the list: adopt it so two tabs never overwrite each other blindly.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea === window.localStorage && e.key === storageKey(section)) {
        dispatch({ type: "hydrate", state: loadState(section) });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [section]);

  const announce = useCallback((message: string) => {
    setLive("");
    window.setTimeout(() => setLive(message), 30);
  }, []);

  const pickedIds = useMemo(() => new Set(state.picks.map((p) => p.id)), [state.picks]);
  const full = state.picks.length >= MAX_FILMS;
  const left = MAX_FILMS - state.picks.length;
  const art = useArt(state.picks, state.layout === "top");
  const category = state.listType === "genre" ? categoryById(section, state.genre) : null;

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
    <>
      <header className="grid gap-4 border-b-2 border-ink pb-6">
        <SectionSwitch current={section} />
        {/* One heading in two sizes, so it reads as a sentence: "My 10 Films That made me". */}
        <h1 className="hero">
          <span className="hero-kick">{info.kicker}</span>{" "}
          <span className="h-hero">{pageBigLine(state.listType, state.genre, section)}</span>
        </h1>
        <p className="max-w-[46ch] text-mute">
          Search for ten {info.noun}, rank them, and save the poster for your feed or Story.
        </p>
        <ListTypeChips section={section} listType={state.listType} genre={state.genre} dispatch={dispatch} />
      </header>
      {/* Phones read top to bottom: build, poster, then Most picked to browse. On wide screens Most picked
          sits under the list while the poster spans both rows on the right. */}
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
          <Search ref={searchRef} section={section} category={category} pickedIds={pickedIds} full={full} onAdd={add} />
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

      <PosterPanel section={section} state={state} dispatch={dispatch} art={art} />
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
    </>
  );
}

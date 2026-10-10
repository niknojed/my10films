"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/categories";
import { posterUrl } from "@/lib/img";
import { SECTION_INFO, type Section } from "@/lib/sections";
import type { ApiError, Film } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; results: Film[]; query: string; browse: boolean }
  | { kind: "error"; message: string };

interface Props {
  section: Section;
  /** The chosen category when the list is "By genre". Results stay inside it unless the person opts out. */
  category: Category | null;
  pickedIds: ReadonlySet<number>;
  full: boolean;
  onAdd: (film: Film) => void;
}

const Search = forwardRef<HTMLInputElement, Props>(function Search({ section, category, pickedIds, full, onAdd }, inputRef) {
  const info = SECTION_INFO[section];
  const [q, setQ] = useState("");
  const [searchAll, setSearchAll] = useState(false);
  const scoped = category !== null && !searchAll;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [retry, setRetry] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  // Query the person pressed Enter on before its results arrived. Added once they land.
  const pendingEnter = useRef<string | null>(null);

  // A new category starts scoped again.
  useEffect(() => setSearchAll(false), [category?.id]);

  useEffect(() => {
    const query = q.trim();
    const browse = scoped && query.length === 0;
    if (query.length < 2 && !browse) {
      setStatus({ kind: "idle" });
      return;
    }
    const params = new URLSearchParams({ q: query, section });
    if (category) params.set("cat", category.id);
    if (category && searchAll) params.set("all", "1");
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus({ kind: "loading" });
      try {
        const res = await fetch(`/api/search?${params}`, { signal: ctrl.signal });
        const body = (await res.json().catch(() => null)) as { results?: Film[] } | ApiError | null;
        if (ctrl.signal.aborted) return;
        if (!res.ok || !body || !("results" in body) || !Array.isArray(body.results)) {
          const message = body && "error" in body ? body.error.message : "Search failed. Try again.";
          setStatus({ kind: "error", message });
          return;
        }
        setStatus({ kind: "ok", results: body.results, query, browse });
      } catch (err) {
        if (ctrl.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setStatus({
          kind: "error",
          message: navigator.onLine ? "Search failed. Try again." : "You are offline. Reconnect and search again.",
        });
      }
    }, browse ? 0 : 250);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, retry, section, category, searchAll, scoped]);

  const results = status.kind === "ok" ? status.results : [];
  const firstFree = results.find((f) => !pickedIds.has(f.id));

  function add(film: Film) {
    if (full || pickedIds.has(film.id)) return;
    onAdd(film);
    setQ("");
  }

  useEffect(() => {
    if (pendingEnter.current === null) return;
    if (status.kind === "error") pendingEnter.current = null;
    if (status.kind !== "ok" || status.query !== pendingEnter.current) return;
    pendingEnter.current = null;
    const film = status.results.find((f) => !pickedIds.has(f.id));
    if (film && !full) {
      onAdd(film);
      setQ("");
    }
  }, [status, pickedIds, full, onAdd]);

  function onEnter() {
    const query = q.trim();
    // Only act on results for exactly what is in the box. Otherwise wait for them.
    if (status.kind === "ok" && status.query === query) {
      if (firstFree) add(firstFree);
    } else if (query.length >= 2) {
      pendingEnter.current = query;
    }
  }

  function focusInput() {
    if (inputRef && "current" in inputRef) inputRef.current?.focus();
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Escape") return;
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    e.preventDefault();
    if (e.key === "Escape" || (e.key === "ArrowUp" && i <= 0)) return focusInput();
    buttons[i + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
  }

  return (
    <div className="grid gap-3">
      <div className="field">
        <label htmlFor="q">Search {info.noun}</label>
        <input
          ref={inputRef}
          id="q"
          className="input"
          type="search"
          value={q}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          placeholder={info.placeholder}
          aria-controls="results"
          aria-describedby={category ? "search-scope" : undefined}
          onChange={(e) => {
            pendingEnter.current = null;
            setQ(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            } else if (e.key === "ArrowDown") {
              const first = listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
              if (first) {
                e.preventDefault();
                first.focus();
              }
            } else if (e.key === "Escape" && q) {
              pendingEnter.current = null;
              setQ("");
            }
          }}
        />
      </div>

      {category ? (
        <div className="scope" id="search-scope">
          <span>{searchAll ? `Showing all ${info.noun}.` : `Showing ${category.scope}.`}</span>
          <label>
            <input type="checkbox" checked={searchAll} onChange={(e) => setSearchAll(e.target.checked)} />
            Search all {info.noun}
          </label>
        </div>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {status.kind === "loading" ? "Searching." : null}
        {status.kind === "ok" ? `${results.length} ${results.length === 1 ? "result" : "results"}.` : null}
      </div>

      {status.kind === "loading" ? <p className="status">Searching…</p> : null}

      {status.kind === "error" ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="status status-error">{status.message}</p>
          <button type="button" className="btn" onClick={() => setRetry((n) => n + 1)}>
            Search again
          </button>
        </div>
      ) : null}

      {status.kind === "ok" ? (
        <ul className="results" id="results" ref={listRef} aria-label="Search results" onKeyDown={onListKey}>
          {status.browse && results.length > 0 ? (
            <li className="note">Well-known {category?.noun}. Type to search within them.</li>
          ) : null}
          {results.length === 0 ? (
            <li className="note">
              {scoped && category
                ? status.browse
                  ? `Nothing to show for ${category.label} right now.`
                  : `Nothing in ${category.label} matches “${status.query}”. Tick “Search all ${info.noun}” if TMDB has it filed elsewhere.`
                : `Nothing matches “${status.query}”. Check the spelling or try the original title.`}
            </li>
          ) : null}
          {results.map((film) => {
            const on = pickedIds.has(film.id);
            return (
              <li key={film.id}>
                <button type="button" className="result" disabled={on || full} onClick={() => add(film)}>
                  <span className="thumb">
                    {film.poster ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={posterUrl(film.poster, "w92")} alt="" loading="lazy" width={36} height={54} />
                    ) : null}
                  </span>
                  <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{film.title}</span>
                  <span className="meta">{on ? "On your list" : film.year || "No date"}</span>
                </button>
              </li>
            );
          })}
          {full && results.length > 0 ? <li className="note">Your ten are set. Remove one to swap.</li> : null}
        </ul>
      ) : null}
    </div>
  );
});

export default Search;

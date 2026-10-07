"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { posterUrl } from "@/lib/img";
import type { ApiError, Film } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; results: Film[]; query: string }
  | { kind: "error"; message: string };

interface Props {
  pickedIds: ReadonlySet<number>;
  full: boolean;
  onAdd: (film: Film) => void;
}

const Search = forwardRef<HTMLInputElement, Props>(function Search({ pickedIds, full, onAdd }, inputRef) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [retry, setRetry] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setStatus({ kind: "idle" });
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus({ kind: "loading" });
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const body = (await res.json().catch(() => null)) as { results?: Film[] } | ApiError | null;
        if (ctrl.signal.aborted) return;
        if (!res.ok || !body || !("results" in body) || !Array.isArray(body.results)) {
          const message = body && "error" in body ? body.error.message : "Search failed. Try again.";
          setStatus({ kind: "error", message });
          return;
        }
        setStatus({ kind: "ok", results: body.results, query });
      } catch (err) {
        if (ctrl.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setStatus({
          kind: "error",
          message: navigator.onLine ? "Search failed. Try again." : "You are offline. Reconnect and search again.",
        });
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, retry]);

  const results = status.kind === "ok" ? status.results : [];
  const firstFree = results.find((f) => !pickedIds.has(f.id));

  function add(film: Film) {
    if (full || pickedIds.has(film.id)) return;
    onAdd(film);
    setQ("");
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
        <label htmlFor="q">Search by title</label>
        <input
          ref={inputRef}
          id="q"
          className="input"
          type="search"
          value={q}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          placeholder="Blade Runner, Spirited Away, Do the Right Thing…"
          aria-controls="results"
          aria-describedby="q-hint"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (firstFree) add(firstFree);
            } else if (e.key === "ArrowDown") {
              const first = listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
              if (first) {
                e.preventDefault();
                first.focus();
              }
            } else if (e.key === "Escape" && q) {
              setQ("");
            }
          }}
        />
      </div>
      <p className="hint" id="q-hint">
        Enter adds the top match. Arrow down moves into the results.
      </p>

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
          {results.length === 0 ? (
            <li className="note">No film matches “{status.query}”. Check the spelling or try the original title.</li>
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

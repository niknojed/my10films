"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { MAX_FILMS, NAME_MAX, QUOTE_MAX } from "@/lib/config";
import { drawPoster, POSTER_SIZE, type ArtMap } from "@/lib/poster";
import type { MakerAction, MakerState } from "@/lib/store";
import type { ApiError, Format, Layout, Theme } from "@/lib/types";

interface Props {
  state: MakerState;
  dispatch: Dispatch<MakerAction>;
  art: ArtMap;
}

type Note = { tone: "info" | "error"; text: string } | null;

function Segmented<T extends string>(props: {
  legend: string;
  name: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="seg">
      <legend>{props.legend}</legend>
      <div>
        {props.options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={props.name}
              value={o.value}
              checked={props.value === o.value}
              onChange={() => props.onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("empty"))), "image/png");
    } catch (err) {
      reject(err);
    }
  });
}

export default function PosterPanel({ state, dispatch, art }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [busy, setBusy] = useState<"save" | "link" | null>(null);
  const [saveNote, setSaveNote] = useState<Note>(null);
  const [linkNote, setLinkNote] = useState<Note>(null);
  const [link, setLink] = useState<{ key: string; url: string } | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);

  const left = MAX_FILMS - state.picks.length;
  const size = POSTER_SIZE[state.format];
  const listKey = useMemo(
    () => JSON.stringify([state.picks.map((p) => p.id), state.name.trim(), state.quote.trim(), state.layout, state.theme]),
    [state.picks, state.name, state.quote, state.layout, state.theme],
  );
  const currentLink = link && link.key === listKey ? link.url : null;

  useEffect(() => {
    let alive = true;
    const done = () => alive && setFontsReady(true);
    if (!document.fonts?.load) return done(), undefined;
    Promise.all([
      document.fonts.load('900 40px "Big Shoulders Display"'),
      document.fonts.load('700 40px "Big Shoulders Display"'),
      document.fonts.load('500 20px "DM Mono"'),
      document.fonts.load('400 20px "Schibsted Grotesk"'),
    ]).then(done, done);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const id = requestAnimationFrame(() => drawPoster(el, { ...state, films: state.picks }, art));
    return () => cancelAnimationFrame(id);
  }, [state, art, fontsReady]);

  async function savePng() {
    const el = canvas.current;
    if (!el || left > 0 || busy) return;
    setBusy("save");
    setSaveNote({ tone: "info", text: "Rendering…" });
    try {
      await document.fonts?.ready;
      if (!drawPoster(el, { ...state, films: state.picks }, art)) throw new Error("no-context");
      const blob = await toBlob(el);
      const filename = `my-10-films-${state.format}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Phones get the share sheet, which is the direct route to Stories and the camera roll.
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "The ten films that made me" });
          setSaveNote({ tone: "info", text: "Sent to the share sheet." });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setSaveNote({ tone: "info", text: "Share cancelled. Nothing was saved." });
            return;
          }
          // Any other share failure falls through to a plain download.
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setSaveNote({ tone: "info", text: `Saved ${filename} (${size.w} × ${size.h}).` });
    } catch (err) {
      const tainted = err instanceof DOMException && err.name === "SecurityError";
      setSaveNote({
        tone: "error",
        text: tainted
          ? "A poster image blocked the export. Reload the page and save again."
          : "The poster could not be rendered. Reload the page and save again.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function makeLink() {
    if (left > 0 || busy) return;
    setBusy("link");
    setLinkNote({ tone: "info", text: "Saving your list…" });
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          quote: state.quote,
          layout: state.layout,
          theme: state.theme,
          filmIds: state.picks.map((p) => p.id),
        }),
      });
      const body = (await res.json().catch(() => null)) as { url?: string } | ApiError | null;
      if (!res.ok || !body || !("url" in body) || typeof body.url !== "string") {
        const message = body && "error" in body ? body.error.message : "The list could not be saved. Try again.";
        setLinkNote({ tone: "error", text: message });
        return;
      }
      setLink({ key: listKey, url: body.url });
      setLinkNote({ tone: "info", text: "Link ready. Anyone with it can see this list." });
    } catch {
      setLinkNote({
        tone: "error",
        text: navigator.onLine
          ? "The list could not be saved. Your list is still here. Try again."
          : "You are offline. Your list is still here. Reconnect and try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!currentLink) return;
    try {
      await navigator.clipboard.writeText(currentLink);
      setLinkNote({ tone: "info", text: "Link copied." });
    } catch {
      linkInput.current?.select();
      setLinkNote({ tone: "info", text: "Copy failed. The link is selected; copy it by hand." });
    }
  }

  const alt =
    state.picks.length === 0
      ? "Poster preview with ten empty slots"
      : `Poster preview listing ${state.picks.map((p, i) => `${i + 1}. ${p.title}`).join(", ")}`;

  return (
    <aside className="grid content-start gap-6 min-w-0 lg:sticky lg:top-4" aria-label="Poster">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="h-sec">Poster</h2>
        <p className="mono text-mute">
          {size.w} × {size.h} px
        </p>
      </div>
      <div className="frame">
        <canvas ref={canvas} role="img" aria-label={alt} width={size.w} height={size.h} />
      </div>

      <div className="grid gap-4">
        <div className="field">
          <label htmlFor="name">Name or handle (optional)</label>
          <input
            id="name"
            className="input"
            value={state.name}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder="@you"
            onChange={(e) => dispatch({ type: "name", value: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="quote">One line (optional)</label>
          <input
            id="quote"
            className="input"
            value={state.quote}
            maxLength={QUOTE_MAX}
            autoComplete="off"
            placeholder="Saw the first one at nine. Never recovered."
            onChange={(e) => dispatch({ type: "quote", value: e.target.value })}
          />
        </div>
        <Segmented<Format>
          legend="Format"
          name="format"
          value={state.format}
          onChange={(value) => dispatch({ type: "format", value })}
          options={[
            { value: "feed", label: "Feed 1800 × 2100" },
            { value: "story", label: "Story 1080 × 1920" },
          ]}
        />
        <Segmented<Layout>
          legend="Billing"
          name="layout"
          value={state.layout}
          onChange={(value) => dispatch({ type: "layout", value })}
          options={[
            { value: "top", label: "Top billing for no. 1" },
            { value: "equal", label: "Equal billing" },
          ]}
        />
        <Segmented<Theme>
          legend="Theme"
          name="theme"
          value={state.theme}
          onChange={(value) => dispatch({ type: "theme", value })}
          options={[
            { value: "velvet", label: "Velvet" },
            { value: "silver", label: "Silver screen" },
            { value: "slate", label: "Slate" },
          ]}
        />
      </div>

      <div className="grid gap-2">
        <button type="button" className="btn btn-primary w-full" disabled={left > 0 || busy !== null} onClick={savePng}>
          {busy === "save" ? "Rendering…" : "Save poster"}
        </button>
        <p className={`status${saveNote?.tone === "error" ? " status-error" : ""}`} role="status">
          {left > 0 ? `Add ${left} more to save the poster.` : saveNote?.text}
        </p>
      </div>

      <div className="grid gap-2 border-t border-line pt-4">
        <button type="button" className="btn w-full" disabled={left > 0 || busy !== null} onClick={makeLink}>
          {busy === "link" ? "Saving…" : currentLink ? "Link is up to date" : "Get a share link"}
        </button>
        {currentLink ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <div className="field">
              <label htmlFor="share-url" className="sr-only">
                Share link
              </label>
              <input
                id="share-url"
                ref={linkInput}
                className="input font-mono text-sm"
                readOnly
                value={currentLink}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
            <button type="button" className="btn" onClick={copyLink}>
              Copy
            </button>
          </div>
        ) : null}
        <p className={`status${linkNote?.tone === "error" ? " status-error" : ""}`} role="status">
          {left > 0 ? "A share link needs all ten." : link && !currentLink ? "Your list changed. Get a new link." : linkNote?.text}
        </p>
        <p className="hint">A share link makes this list public and counts its films toward Most picked.</p>
      </div>
    </aside>
  );
}

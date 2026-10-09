"use client";

import { useRef, type Dispatch } from "react";
import { LIST_TYPES } from "@/lib/config";
import { GENRES, LIST_TYPE_LABELS } from "@/lib/listType";
import type { MakerAction } from "@/lib/store";
import type { ListType } from "@/lib/types";

interface Props {
  listType: ListType;
  genre: string | null;
  dispatch: Dispatch<MakerAction>;
}

/** What kind of ten this is. Radios styled as chips, so arrow keys move between them. */
export default function ListTypeChips({ listType, genre, dispatch }: Props) {
  const genreRef = useRef<HTMLSelectElement>(null);

  return (
    <div className="grid gap-2">
      <fieldset className="chips">
        <legend className="sr-only">List type</legend>
        {LIST_TYPES.map((t) => (
          <label key={t}>
            <input
              type="radio"
              name="list-type"
              value={t}
              checked={listType === t}
              onChange={() => {
                dispatch({ type: "listType", value: t });
                // Picking "By genre" without a genre yet goes straight to the genre menu.
                if (t === "genre" && !genre) window.setTimeout(() => genreRef.current?.focus(), 0);
              }}
            />
            {LIST_TYPE_LABELS[t]}
          </label>
        ))}
      </fieldset>
      {listType === "genre" ? (
        <div className="field max-w-xs">
          <label htmlFor="genre">Genre</label>
          <select
            id="genre"
            ref={genreRef}
            className="input select"
            value={genre ?? ""}
            onChange={(e) => dispatch({ type: "genre", value: e.target.value || null })}
          >
            <option value="" disabled>
              Choose a genre
            </option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { CATEGORIES } from "@/lib/categories";
import { LIST_TYPE_LABELS } from "@/lib/listType";
import { SECTION_LIST_TYPES, type Section } from "@/lib/sections";
import type { MakerAction } from "@/lib/store";
import type { ListType } from "@/lib/types";

interface Props {
  section: Section;
  listType: ListType;
  genre: string | null;
  dispatch: Dispatch<MakerAction>;
}

/** What kind of ten this is, then the category for "By genre". Radios styled as chips, so arrow keys move between them. */
export default function ListTypeChips({ section, listType, genre, dispatch }: Props) {
  const categoryRow = useRef<HTMLFieldSetElement>(null);
  const categories = CATEGORIES[section];

  // On a phone the category row scrolls sideways. Keep the selected chip in view, for instance when a
  // saved category sits past the edge. Only the row scrolls, never the page.
  useEffect(() => {
    const row = categoryRow.current;
    const chip = row?.querySelector<HTMLInputElement>("input:checked")?.parentElement;
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const box = row.getBoundingClientRect();
    const r = chip.getBoundingClientRect();
    if (r.left >= box.left && r.right <= box.right) return;
    row.scrollLeft += r.left < box.left ? r.left - box.left : r.right - box.right;
  }, [genre, listType]);

  return (
    <div className="grid gap-3">
      <fieldset className="chips">
        <legend className="sr-only">List type</legend>
        {SECTION_LIST_TYPES[section].map((t) => (
          <label key={t}>
            <input
              type="radio"
              name={`list-type-${section}`}
              value={t}
              checked={listType === t}
              onChange={() => {
                dispatch({ type: "listType", value: t });
                // Picking "By genre" without a category yet moves focus to the categories.
                if (t === "genre" && !genre) {
                  window.setTimeout(() => categoryRow.current?.querySelector<HTMLInputElement>("input")?.focus(), 0);
                }
              }}
            />
            {LIST_TYPE_LABELS[t]}
          </label>
        ))}
      </fieldset>
      {listType === "genre" ? (
        <fieldset className="chips chips-sub" ref={categoryRow}>
          <legend className="chips-legend">Category</legend>
          {categories.map((c) => (
            <label key={c.id}>
              <input
                type="radio"
                name={`category-${section}`}
                value={c.id}
                checked={genre === c.id}
                onChange={() => dispatch({ type: "genre", value: c.id })}
              />
              {c.label}
            </label>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}

import { describe, expect, it } from "vitest";
import { ellipsize, gridFor, type Rect } from "@/lib/poster";
import { INITIAL_STATE, makerReducer, reviveState } from "@/lib/store";
import type { Film } from "@/lib/types";

function overlaps(a: Rect, b: Rect) {
  const e = 0.001;
  return a.x < b.x + b.w - e && b.x < a.x + a.w - e && a.y < b.y + b.h - e && b.y < a.y + a.h - e;
}

describe("poster grids", () => {
  const cases = [
    ["feed", "top"],
    ["feed", "equal"],
    ["story", "top"],
    ["story", "equal"],
  ] as const;
  it.each(cases)("%s / %s places ten rects inside the width with no overlap", (format, layout) => {
    const width = 1000;
    const g = gridFor(format, layout, width, 16);
    expect(g.rects).toHaveLength(10);
    for (const r of g.rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(width + 0.001);
      expect(r.y + r.h).toBeLessThanOrEqual(g.height + 0.001);
    }
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) expect(overlaps(g.rects[i]!, g.rects[j]!)).toBe(false);
  });
  it("gives number 1 the largest area in top billing", () => {
    for (const format of ["feed", "story"] as const) {
      const [first, ...rest] = gridFor(format, "top", 1000, 16).rects;
      for (const r of rest) expect(first!.w * first!.h).toBeGreaterThan(r.w * r.h);
    }
  });
});

describe("ellipsize", () => {
  const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) as TextMetrics };
  it("leaves short text alone and truncates long text to fit", () => {
    expect(ellipsize(ctx, "Alien", 100)).toBe("Alien");
    const out = ellipsize(ctx, "The Lord of the Rings", 100);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length * 10).toBeLessThanOrEqual(100);
  });
});

describe("maker state", () => {
  const film = (id: number): Film => ({ id, title: `Film ${id}`, year: "1999", poster: null });
  it("caps the list at ten and refuses duplicates", () => {
    let s = INITIAL_STATE;
    for (let i = 1; i <= 12; i++) s = makerReducer(s, { type: "add", film: film(i) });
    s = makerReducer(s, { type: "add", film: film(3) });
    expect(s.picks.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("moves a film and ignores out-of-range moves", () => {
    let s = INITIAL_STATE;
    for (let i = 1; i <= 3; i++) s = makerReducer(s, { type: "add", film: film(i) });
    expect(makerReducer(s, { type: "move", from: 2, to: 0 }).picks.map((p) => p.id)).toEqual([3, 1, 2]);
    expect(makerReducer(s, { type: "move", from: 0, to: 9 })).toBe(s);
  });
  it("revives only well-formed stored state", () => {
    const s = reviveState({
      picks: [film(1), { id: "x" }, film(1), { id: 2, title: "T", year: "19", poster: "http://evil/x.jpg" }],
      theme: "neon",
      format: "story",
      name: "n".repeat(50),
    });
    expect(s.picks).toEqual([film(1), { id: 2, title: "T", year: "", poster: null }]);
    expect([s.theme, s.format, s.name.length]).toEqual(["velvet", "story", 22]);
    expect(reviveState("garbage")).toBe(INITIAL_STATE);
  });
});

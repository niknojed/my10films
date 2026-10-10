import { describe, expect, it } from "vitest";
import { headingFor, headingLine, previewBigSize } from "@/lib/listType";
import { reviveState } from "@/lib/store";
import { parseSavePayload } from "@/lib/validate";

const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const base = { name: "", quote: "", layout: "top", theme: "silver", filmIds: ids };

describe("headingFor", () => {
  it("keeps the original heading for the default type", () => {
    expect(headingFor("made", null, "")).toEqual({ eyebrow: "The ten films that made", big: "Me" });
    expect(headingFor("made", null, " @k ")).toEqual({ eyebrow: "The ten films that made", big: "@k" });
  });

  it("puts the type in the large line when there is no name", () => {
    expect(headingFor("alltime", null, "")).toEqual({ eyebrow: "My top ten", big: "All-time" });
    expect(headingFor("genre", "Horror", "")).toEqual({ eyebrow: "My top ten", big: "Horror" });
  });

  it("puts the name in the large line when there is one", () => {
    expect(headingFor("alltime", null, "@k")).toEqual({ eyebrow: "The all-time top ten of", big: "@k" });
    expect(headingFor("genre", "Science Fiction", "@k")).toEqual({
      eyebrow: "The top ten science fiction films of",
      big: "@k",
    });
  });

  it("reads as one line for titles", () => {
    expect(headingLine("made", null, "")).toBe("The ten films that made me");
    expect(headingLine("alltime", null, "")).toBe("My all-time top ten");
    expect(headingLine("genre", "Western", "")).toBe("My top ten western films");
    expect(headingLine("genre", "Western", "@k")).toBe("The top ten western films of @k");
  });
});

describe("list type in saves", () => {
  it("treats a missing type as the default, for pages loaded before types existed", () => {
    const r = parseSavePayload(base);
    expect(r.ok && [r.value.listType, r.value.genre]).toEqual(["made", null]);
  });

  it("requires a film category for genre lists", () => {
    expect(parseSavePayload({ ...base, listType: "genre" }).ok).toBe(false);
    expect(parseSavePayload({ ...base, listType: "genre", genre: "Vaporwave" }).ok).toBe(false);
    // Old TMDB genre names and show categories can't be saved as new film lists.
    expect(parseSavePayload({ ...base, listType: "genre", genre: "Horror" }).ok).toBe(false);
    expect(parseSavePayload({ ...base, listType: "genre", genre: "sitcoms" }).ok).toBe(false);
    const r = parseSavePayload({ ...base, listType: "genre", genre: "80s-action" });
    expect(r.ok && r.value.genre).toBe("80s-action");
  });

  it("drops a genre sent with another type", () => {
    const r = parseSavePayload({ ...base, listType: "alltime", genre: "80s-action" });
    expect(r.ok && [r.value.listType, r.value.genre]).toEqual(["alltime", null]);
  });

  it("rejects unknown types", () => {
    expect(parseSavePayload({ ...base, listType: "best" }).ok).toBe(false);
  });
});

describe("list type in stored state", () => {
  it("revives valid values and defaults the rest", () => {
    expect(reviveState({ listType: "genre", genre: "rom-coms" })).toMatchObject({ listType: "genre", genre: "rom-coms" });
    expect(reviveState({ listType: "nope", genre: "Vaporwave" })).toMatchObject({ listType: "made", genre: null });
  });

  it("resets genres saved before categories, and keeps sections apart", () => {
    expect(reviveState({ listType: "genre", genre: "Drama" })).toMatchObject({ genre: null });
    expect(reviveState({ listType: "genre", genre: "sitcoms" }, "films")).toMatchObject({ genre: null });
    expect(reviveState({ listType: "genre", genre: "sitcoms" }, "shows")).toMatchObject({ genre: "sitcoms" });
  });
});

describe("previewBigSize", () => {
  it("keeps short lines at full size", () => {
    expect(previewBigSize("ME")).toBe(132);
  });

  it("shrinks a single word so it fits on one line", () => {
    const size = previewBigSize("HORROR");
    expect(size).toBeLessThan(132);
    expect(size * 0.56 * 6).toBeLessThanOrEqual(348);
  });

  it("sizes two words by the longer one, so they wrap between words", () => {
    expect(previewBigSize("SCIENCE FICTION")).toBe(previewBigSize("SCIENCE"));
  });

  it("never goes below the minimum for long handles", () => {
    expect(previewBigSize("@AVERYLONGHANDLENAME22")).toBe(56);
  });
});

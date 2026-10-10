import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryById, genreLabel, genreNoun, isStoredGenre, matchesRule } from "@/lib/categories";
import { headingFor, headingLine, pageBigLine } from "@/lib/listType";

const rule = (section: "films" | "shows", id: string) => categoryById(section, id)!.rule;

describe("category rules", () => {
  it("needs every listed genre", () => {
    expect(matchesRule(rule("films", "rom-coms"), { genreIds: [10749, 35, 18], year: 1989 })).toBe(true);
    expect(matchesRule(rule("films", "rom-coms"), { genreIds: [10749], year: 1989 })).toBe(false);
  });

  it("holds era categories to their years, inclusive", () => {
    const r = rule("films", "80s-action");
    expect(matchesRule(r, { genreIds: [28], year: 1980 })).toBe(true);
    expect(matchesRule(r, { genreIds: [28], year: 1989 })).toBe(true);
    expect(matchesRule(r, { genreIds: [28], year: 1990 })).toBe(false);
    expect(matchesRule(r, { genreIds: [28], year: null })).toBe(false);
    expect(matchesRule(rule("films", "horror-pre-2000"), { genreIds: [27], year: 2000 })).toBe(false);
  });

  it("leaves keyword checks to the server lookup", () => {
    expect(matchesRule(rule("films", "blaxploitation"), { genreIds: [], year: 1973 })).toBe(true);
  });

  it("gives Shows no genres", () => {
    expect(CATEGORIES.shows).toEqual([]);
  });

  it("keeps ids unique within each section", () => {
    for (const list of Object.values(CATEGORIES)) {
      expect(new Set(list.map((c) => c.id)).size).toBe(list.length);
    }
  });
});

describe("category copy", () => {
  it("names new categories and older genre lists", () => {
    expect(genreLabel("films", "80s-action")).toBe("80s Action");
    expect(genreNoun("films", "80s-action")).toBe("80s action films");
    expect(genreNoun("films", "Horror")).toBe("horror films");
    expect(isStoredGenre("Horror")).toBe(true);
    expect(isStoredGenre("80s-action")).toBe(true);
    expect(isStoredGenre("sitcoms")).toBe(false);
  });

  it("gives the page its large line", () => {
    expect(pageBigLine("made", null)).toBe("That made me");
    expect(pageBigLine("alltime", null)).toBe("All-time ten");
    expect(pageBigLine("genre", null)).toBe("By genre");
    expect(pageBigLine("genre", "80s-action")).toBe("80s Action");
  });

  it("writes headings per section", () => {
    expect(headingFor("made", null, "", "shows")).toEqual({ eyebrow: "The ten shows that made", big: "Me" });
    expect(headingFor("alltime", null, "@k", "shows")).toEqual({ eyebrow: "The all-time top ten of", big: "@k" });
    expect(headingFor("genre", "80s-action", "")).toEqual({ eyebrow: "My top ten", big: "80s Action" });
    expect(headingLine("genre", "rom-coms", "@k")).toBe("The top ten rom-coms of @k");
  });
});

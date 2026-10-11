import { describe, expect, it } from "vitest";
import { DECADES, decadeCategory, isDecade, matchesRule, scopeById } from "@/lib/categories";
import { displayCase, headingFor, headingLine, pageBigLine } from "@/lib/listType";
import { reviveState } from "@/lib/store";
import { parseSavePayload } from "@/lib/validate";

const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const base = { name: "", quote: "", layout: "top", theme: "silver", filmIds: ids };

describe("decades", () => {
  it("runs 1950s to 2020s", () => {
    expect(DECADES[0]).toBe(1950);
    expect(DECADES.at(-1)).toBe(2020);
    expect(isDecade(1985)).toBe(false);
    expect(isDecade(1940)).toBe(false);
  });

  it("scopes search to the decade's years, inclusive", () => {
    const r = decadeCategory(1980).rule;
    expect(matchesRule(r, { genreIds: [], year: 1980 })).toBe(true);
    expect(matchesRule(r, { genreIds: [], year: 1989 })).toBe(true);
    expect(matchesRule(r, { genreIds: [], year: 1990 })).toBe(false);
  });

  it("resolves by id for films only", () => {
    expect(scopeById("films", "1980s")?.label).toBe("1980s");
    expect(scopeById("films", "80s-action")?.label).toBe("80s Action");
    expect(scopeById("films", "1985s")).toBeNull();
    expect(scopeById("shows", "1980s")).toBeNull();
  });

  it("writes headings", () => {
    expect(pageBigLine("decade", null, "films", 1990)).toBe("1990s");
    expect(pageBigLine("decade", null, "films", null)).toBe("By decade");
    expect(headingFor("decade", null, "", "films", 1970)).toEqual({ eyebrow: "My top ten", big: "1970s" });
    expect(headingFor("decade", null, "@k", "films", 1970)).toEqual({ eyebrow: "The top ten 1970s films of", big: "@k" });
    expect(headingLine("decade", null, "", "films", 2000)).toBe("My top ten 2000s films");
  });
});

describe("displayCase", () => {
  it("capitalizes but keeps a decade's s lowercase", () => {
    expect(displayCase("The top ten 1980s films of")).toBe("THE TOP TEN 1980s FILMS OF");
    expect(displayCase("1950s")).toBe("1950s");
    expect(displayCase("80s Action")).toBe("80s ACTION");
    expect(displayCase("Sci-Fi & Fantasy")).toBe("SCI-FI & FANTASY");
  });
});

describe("saving by section and decade", () => {
  it("needs a valid decade for decade lists", () => {
    expect(parseSavePayload({ ...base, listType: "decade" }).ok).toBe(false);
    expect(parseSavePayload({ ...base, listType: "decade", decade: 1985 }).ok).toBe(false);
    const r = parseSavePayload({ ...base, listType: "decade", decade: 1980 });
    expect(r.ok && [r.value.listType, r.value.decade, r.value.section]).toEqual(["decade", 1980, "films"]);
  });

  it("saves shows, but only as That made me or All-time ten", () => {
    const r = parseSavePayload({ ...base, section: "shows", listType: "alltime" });
    expect(r.ok && r.value.section).toBe("shows");
    expect(parseSavePayload({ ...base, section: "shows", listType: "decade", decade: 1990 }).ok).toBe(false);
    expect(parseSavePayload({ ...base, section: "shows", listType: "genre", genre: "rom-coms" }).ok).toBe(false);
    expect(parseSavePayload({ ...base, section: "radio" }).ok).toBe(false);
  });

  it("drops a decade sent with another type", () => {
    const r = parseSavePayload({ ...base, listType: "alltime", decade: 1980 });
    expect(r.ok && r.value.decade).toBeNull();
  });
});

describe("decade in stored state", () => {
  it("keeps a valid film decade and drops the rest", () => {
    expect(reviveState({ listType: "decade", decade: 1960 })).toMatchObject({ listType: "decade", decade: 1960 });
    expect(reviveState({ listType: "decade", decade: 1965 })).toMatchObject({ decade: null });
    expect(reviveState({ listType: "decade", decade: 1990 }, "shows")).toMatchObject({ listType: "made", decade: null });
  });
});

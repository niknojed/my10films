import { describe, expect, it } from "vitest";
import { cleanText, isSlug, parseSavePayload } from "@/lib/validate";

const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const base = { name: " K ", quote: "", layout: "top", theme: "velvet", filmIds: ids };

describe("parseSavePayload", () => {
  it("accepts a valid list and trims text", () => {
    const r = parseSavePayload(base);
    expect(r.ok && r.value.name).toBe("K");
  });
  it.each([
    ["nine films", { ...base, filmIds: ids.slice(1) }],
    ["a duplicate", { ...base, filmIds: [...ids.slice(1), 2] }],
    ["a non-integer id", { ...base, filmIds: [...ids.slice(1), 1.5] }],
    ["a string id", { ...base, filmIds: [...ids.slice(1), "7"] }],
    ["an unknown layout", { ...base, layout: "wide" }],
    ["an unknown theme", { ...base, theme: "neon" }],
    ["an array body", []],
    ["null", null],
  ])("rejects %s", (_, body) => {
    expect(parseSavePayload(body).ok).toBe(false);
  });
  it("caps name and quote length", () => {
    const r = parseSavePayload({ ...base, name: "x".repeat(99), quote: "y".repeat(999) });
    expect(r.ok && [r.value.name.length, r.value.quote.length]).toEqual([22, 80]);
  });
});

describe("cleanText", () => {
  it("removes control and zero-width characters", () => {
    expect(cleanText("a\u0000b\u200bc\n d", 20)).toBe("a b c d");
  });
  it("returns an empty string for non-strings", () => {
    expect(cleanText(42, 20)).toBe("");
  });
});

describe("isSlug", () => {
  it("accepts generated slugs and rejects paths", () => {
    expect(isSlug("abcdefgh23")).toBe(true);
    expect(isSlug("../etc")).toBe(false);
    expect(isSlug("ABCDEFGH23")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("prefers x-real-ip, which the proxy overwrites", () => {
    expect(clientIp(h({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("ignores a spoofed first x-forwarded-for entry", () => {
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.9,203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("falls back to unknown", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
});

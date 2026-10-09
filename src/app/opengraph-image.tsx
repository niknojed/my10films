import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MAX_FILMS } from "@/lib/config";
import { POSTER_THEMES } from "@/lib/poster";
import { INITIAL_STATE } from "@/lib/store";

export const runtime = "nodejs";
export const alt = "My 10 Films: rank the ten films that made you and save the poster";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The default theme, so the preview matches what a first-time visitor sees. No poster art: this image
// stands for the whole site, not anyone's list, and posters belong to their studios.
const C = POSTER_THEMES[INITIAL_STATE.theme];

async function font(file: string): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), "assets", file));
  } catch {
    return null;
  }
}

export default async function Image() {
  const [display, mono] = await Promise.all([
    font("big-shoulders-display-latin-900-normal.woff"),
    font("dm-mono-latin-500-normal.woff"),
  ]);
  const fonts = [
    ...(display ? [{ name: "Display", data: display, weight: 900 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Mono", data: mono, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const W = 132;
  const H = 198;
  const GAP = 12;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: C.bg,
          color: C.fg,
          padding: 56,
          gap: 28,
          fontFamily: "Mono",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 352 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, letterSpacing: 3, color: C.accent, whiteSpace: "nowrap" }}>THE TEN FILMS THAT MADE</div>
            <div style={{ fontFamily: "Display", fontWeight: 900, fontSize: 190, lineHeight: 0.85, marginTop: 18 }}>
              YOU
            </div>
          </div>
          <div style={{ fontSize: 18, letterSpacing: 3, color: C.mute }}>MY10FILMS.COM</div>
        </div>
        {/* Empty slots, drawn like the maker's: dashed mute outlines with the rank in the display face. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: GAP,
            width: 5 * W + 4 * GAP,
            alignContent: "center",
          }}
        >
          {Array.from({ length: MAX_FILMS }, (_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: W,
                height: H,
                border: `2px dashed ${C.mute}`,
                borderRadius: 3,
                opacity: 0.6,
                color: C.mute,
                fontFamily: "Display",
                fontWeight: 900,
                fontSize: 54,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

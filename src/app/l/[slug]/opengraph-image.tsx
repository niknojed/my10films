import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";
import { posterUrl } from "@/lib/img";
import { headingFor } from "@/lib/listType";
import { getSharedList } from "@/lib/server";

export const runtime = "nodejs";
export const alt = "A ranked list of ten films";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

const C = { bg: "#1C0A12", fg: "#F5E6CF", mute: "#B79A8C", accent: "#F2B33D", card: "#3A1A28" };

async function font(file: string): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), "assets", file));
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getSharedList(slug).catch(() => null);
  const [display, mono] = await Promise.all([
    font("big-shoulders-display-latin-900-normal.woff"),
    font("dm-mono-latin-500-normal.woff"),
  ]);
  const fonts = [
    ...(display ? [{ name: "Display", data: display, weight: 900 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Mono", data: mono, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const heading = list ? headingFor(list.listType, list.genre, list.name) : headingFor("made", null, "");
  const name = heading.big.toUpperCase();
  const films = list?.films ?? [];
  const W = 132;
  const H = 198;

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
          gap: 40,
          fontFamily: "Mono",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 348 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, letterSpacing: 3, color: C.accent }}>{heading.eyebrow.toUpperCase()}</div>
            <div
              style={{
                fontFamily: "Display",
                fontSize: name.length > 9 ? 76 : 132,
                lineHeight: 0.9,
                marginTop: 14,
                wordBreak: "break-word",
              }}
            >
              {name}
            </div>
          </div>
          <div style={{ fontSize: 18, letterSpacing: 3, color: C.mute }}>{SITE_NAME.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: 5 * W + 4 * 12, alignContent: "center" }}>
          {films.map((film, i) => (
            <div
              key={film.id}
              style={{ display: "flex", position: "relative", width: W, height: H, background: C.card, overflow: "hidden" }}
            >
              {film.poster ? (
                // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                <img src={posterUrl(film.poster, "w185")} width={W} height={H} style={{ objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 10,
                    fontFamily: "Display",
                    fontSize: 24,
                    lineHeight: 0.95,
                    color: C.accent,
                  }}
                >
                  {film.title.toUpperCase().slice(0, 40)}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  display: "flex",
                  padding: "3px 7px",
                  background: C.bg,
                  color: C.accent,
                  fontSize: 15,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

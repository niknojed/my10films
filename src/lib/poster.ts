import { MAX_FILMS, SITE_NAME } from "./config";
import { headingFor } from "./listType";
import type { Film, Format, Layout, ListType, Theme } from "./types";

export const FONT_DISPLAY = '"Big Shoulders Display","Arial Narrow",Impact,sans-serif';
export const FONT_MONO = '"DM Mono",ui-monospace,Menlo,Consolas,monospace';
export const FONT_BODY = '"Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif';

export const POSTER_SIZE: Record<Format, { w: number; h: number }> = {
  feed: { w: 1800, h: 2100 },
  story: { w: 1080, h: 1920 },
};

interface ThemeColors {
  bg: string;
  fg: string;
  mute: string;
  accent: string;
  stripes?: boolean;
}

export const POSTER_THEMES: Record<Theme, ThemeColors> = {
  velvet: { bg: "#1C0A12", fg: "#F5E6CF", mute: "#B79A8C", accent: "#F2B33D" },
  silver: { bg: "#E6E7EB", fg: "#15161C", mute: "#5F6270", accent: "#8E1B3A" },
  slate: { bg: "#0D0D0F", fg: "#F4F4F2", mute: "#9A9AA0", accent: "#F4F4F2", stripes: true },
};

const CARD_PALETTES = [
  { bg: "#5A1228", c: "#7C1D3A", fg: "#F6D9A8" },
  { bg: "#E9A93A", c: "#F4C465", fg: "#2A1408" },
  { bg: "#0F4C4A", c: "#17696A", fg: "#F2E6CF" },
  { bg: "#151A2C", c: "#232C4A", fg: "#E6E3F0" },
  { bg: "#E7E0D2", c: "#D4CAB6", fg: "#1E1A17" },
  { bg: "#B4472A", c: "#CC6040", fg: "#FFF1DC" },
  { bg: "#5B5F2B", c: "#74793A", fg: "#F5EFC9" },
  { bg: "#2747B0", c: "#3B60D4", fg: "#F3F0E4" },
  { bg: "#E7B4B8", c: "#F1CACC", fg: "#3B0F1C" },
  { bg: "#0E0E10", c: "#26262B", fg: "#F2B33D" },
] as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Grid {
  rects: Rect[];
  height: number;
}

/* ---------- layouts: ten rects and a total height for a given width ---------- */

export function rowsGrid(width: number, rows: number[], gap: number): Grid {
  const rects: Rect[] = [];
  let y = 0;
  for (const n of rows) {
    const w = (width - (n - 1) * gap) / n;
    const h = w * 1.5;
    for (let i = 0; i < n; i++) rects.push({ x: i * (w + gap), y, w, h });
    y += h + gap;
  }
  return { rects, height: y - gap };
}

/** No. 1 at triple size beside a three-by-three of the other nine. */
export function featureNineGrid(width: number, gap: number): Grid {
  const u = (width - 5 * gap) / 6;
  const ch = u * 1.5;
  const height = 3 * ch + 2 * gap;
  const rects: Rect[] = [{ x: 0, y: 0, w: 3 * u + 2 * gap, h: height }];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) rects.push({ x: 3 * u + 3 * gap + c * (u + gap), y: r * (ch + gap), w: u, h: ch });
  }
  return { rects, height };
}

/** No. 1 at half width, 2 to 5 in a two-by-two beside it, 6 to 10 in a row below. */
export function featureFourFiveGrid(width: number, gap: number): Grid {
  const half = (width - gap) / 2;
  const bh = half * 1.5;
  const q = (half - gap) / 2;
  const qh = (bh - gap) / 2;
  const rects: Rect[] = [{ x: 0, y: 0, w: half, h: bh }];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) rects.push({ x: half + gap + c * (q + gap), y: r * (qh + gap), w: q, h: qh });
  }
  const u = (width - 4 * gap) / 5;
  for (let i = 0; i < 5; i++) rects.push({ x: i * (u + gap), y: bh + gap, w: u, h: u * 1.5 });
  return { rects, height: bh + gap + u * 1.5 };
}

export function gridFor(format: Format, layout: Layout, width: number, gap: number): Grid {
  if (format === "feed") return layout === "top" ? featureNineGrid(width, gap) : rowsGrid(width, [5, 5], gap);
  return layout === "top" ? featureFourFiveGrid(width, gap) : rowsGrid(width, [3, 3, 4], gap);
}

/* ---------- drawing helpers ---------- */

type Ctx = CanvasRenderingContext2D;

function roundedRect(ctx: Ctx, r: Rect, radius: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(r.x, r.y, r.w, r.h, radius);
  else ctx.rect(r.x, r.y, r.w, r.h);
}

function tracking(ctx: Ctx, px: number) {
  if ("letterSpacing" in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`;
}

export function ellipsize(ctx: Pick<Ctx, "measureText">, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function wrap(ctx: Ctx, text: string, maxW: number): string[] | null {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    if (ctx.measureText(word).width > maxW) return null;
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxW) cur = next;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitBlock(ctx: Ctx, text: string, maxW: number, maxH: number, maxSize: number, minSize: number, maxLines: number) {
  const lh = 0.9;
  for (let s = maxSize; s >= minSize; s -= Math.max(1, maxSize * 0.03)) {
    ctx.font = `900 ${s}px ${FONT_DISPLAY}`;
    const lines = wrap(ctx, text, maxW);
    if (lines && lines.length <= maxLines && lines.length * s * lh <= maxH) return { size: s, lines };
  }
  ctx.font = `900 ${minSize}px ${FONT_DISPLAY}`;
  const lines = (wrap(ctx, text, maxW) ?? [text]).slice(0, maxLines).map((l) => ellipsize(ctx, l, maxW));
  return { size: minSize, lines };
}

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return Math.imul(h, 2654435761) >>> 0;
}

/** Generated title card for a film TMDB has no poster for. */
export function drawTitleCard(ctx: Ctx, r: Rect, film: Film) {
  const { x, y, w, h } = r;
  const hs = hash(film.title + film.year);
  const p = CARD_PALETTES[(hs >>> 20) % CARD_PALETTES.length]!;
  const variant = (hs >>> 11) % 4;
  const pad = w * 0.08;
  ctx.save();
  roundedRect(ctx, r, w * 0.025);
  ctx.clip();
  ctx.fillStyle = p.bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = p.c;
  if (variant === 0) {
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.36, w * 0.36, 0, Math.PI * 2);
    ctx.fill();
  } else if (variant === 1) {
    for (let i = 0; i < 6; i++) ctx.fillRect(x + pad, y + h * 0.15 + i * h * 0.062, w * (0.84 - i * 0.12), h * 0.03);
  } else if (variant === 2) {
    ctx.fillRect(x, y, w, h * 0.5);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.58);
    ctx.lineTo(x + w * 0.2, y + h * 0.32);
    ctx.arc(x + w * 0.5, y + h * 0.32, w * 0.3, Math.PI, 0);
    ctx.lineTo(x + w * 0.8, y + h * 0.58);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = p.fg;
  ctx.textBaseline = "alphabetic";
  const ms = Math.max(w * 0.056, 6);
  if (film.year) {
    ctx.font = `500 ${ms}px ${FONT_MONO}`;
    tracking(ctx, ms * 0.06);
    ctx.textAlign = "right";
    ctx.fillText(film.year, x + w - pad, y + pad + ms * 0.8);
  }
  tracking(ctx, 0);
  ctx.textAlign = "left";
  const blk = fitBlock(ctx, film.title.toUpperCase(), w - pad * 2, h * 0.46, w * 0.27, w * 0.085, 5);
  ctx.font = `900 ${blk.size}px ${FONT_DISPLAY}`;
  blk.lines.forEach((_, j) => {
    const line = blk.lines[blk.lines.length - 1 - j]!;
    ctx.fillText(line, x + pad, y + h - pad - j * blk.size * 0.9);
  });
  ctx.restore();
}

function drawArt(ctx: Ctx, r: Rect, img: CanvasImageSource, iw: number, ih: number) {
  const scale = Math.max(r.w / iw, r.h / ih);
  const sw = r.w / scale;
  const sh = r.h / scale;
  ctx.save();
  roundedRect(ctx, r, r.w * 0.025);
  ctx.clip();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, r.x, r.y, r.w, r.h);
  ctx.restore();
}

function drawRankTab(ctx: Ctx, r: Rect, rank: number, T: ThemeColors) {
  const s = Math.max(r.w * 0.075, 13);
  const label = String(rank).padStart(2, "0");
  ctx.save();
  ctx.font = `500 ${s}px ${FONT_MONO}`;
  tracking(ctx, 0);
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = T.bg;
  ctx.fillRect(r.x, r.y, tw + s * 1.1, s * 1.7);
  ctx.fillStyle = T.accent;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, r.x + s * 0.45, r.y + s * 1.2);
  ctx.restore();
}

function drawEmptySlot(ctx: Ctx, r: Rect, rank: number, T: ThemeColors) {
  ctx.save();
  ctx.strokeStyle = T.mute;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(2, r.w * 0.008);
  ctx.setLineDash([r.w * 0.04, r.w * 0.03]);
  const lw = ctx.lineWidth;
  roundedRect(ctx, { x: r.x + lw, y: r.y + lw, w: r.w - lw * 2, h: r.h - lw * 2 }, r.w * 0.025);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = T.mute;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${r.w * 0.4}px ${FONT_DISPLAY}`;
  ctx.fillText(String(rank), r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

export interface PosterInput {
  films: readonly Film[];
  name: string;
  quote: string;
  format: Format;
  layout: Layout;
  theme: Theme;
  listType: ListType;
  genre: string | null;
}

/** Loaded poster art keyed by film id. A missing or null entry draws the generated title card. */
export type ArtMap = ReadonlyMap<number, HTMLImageElement | null>;

export function drawPoster(canvas: HTMLCanvasElement, input: PosterInput, art: ArtMap): boolean {
  const feed = input.format === "feed";
  const { w: W, h: H } = POSTER_SIZE[input.format];
  const T = POSTER_THEMES[input.theme];
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const M = feed ? 96 : 64;
  const gap = feed ? 20 : 14;
  const cw = W - 2 * M;
  let y = M;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, W, H);

  if (T.stripes) {
    const bh = feed ? 64 : 48;
    const sw = bh * 1.1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(M, y, cw, bh);
    ctx.clip();
    ctx.fillStyle = T.fg;
    for (let sx = M - bh; sx < M + cw + bh; sx += sw * 2) {
      ctx.beginPath();
      ctx.moveTo(sx, y + bh);
      ctx.lineTo(sx + bh, y);
      ctx.lineTo(sx + bh + sw, y);
      ctx.lineTo(sx + sw, y + bh);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    y += bh + (feed ? 44 : 32);
  }

  // header
  const heading = headingFor(input.listType, input.genre, input.name);
  const es = feed ? 30 : 23;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = T.accent;
  ctx.font = `500 ${es}px ${FONT_MONO}`;
  tracking(ctx, es * 0.14);
  y += es;
  ctx.fillText(ellipsize(ctx, heading.eyebrow.toUpperCase(), cw - es * 5), M, y);
  ctx.textAlign = "right";
  ctx.fillStyle = T.mute;
  ctx.fillText("01—10", W - M, y);
  ctx.textAlign = "left";
  tracking(ctx, 0);

  const head = heading.big.toUpperCase();
  let hs = feed ? 230 : 170;
  ctx.font = `900 ${hs}px ${FONT_DISPLAY}`;
  while (hs > 60 && ctx.measureText(head).width > cw) {
    hs -= 6;
    ctx.font = `900 ${hs}px ${FONT_DISPLAY}`;
  }
  y += hs * 0.82 + (feed ? 18 : 14);
  ctx.fillStyle = T.fg;
  ctx.fillText(ellipsize(ctx, head, cw), M - hs * 0.02, y);
  y += feed ? 46 : 34;

  // grid, scaled down when the space under the header is short
  const quote = input.quote.trim();
  const qs = feed ? 38 : 28;
  const qH = quote ? qs * 2.4 : 0;
  const footH = feed ? 70 : 56;
  const creditsMin = feed ? 300 : 250;
  const after = feed ? 40 : 28;
  const avail = H - M - footH - creditsMin - qH - y - after;
  let grid = gridFor(input.format, input.layout, cw, gap);
  let gw = cw;
  if (grid.height > avail) {
    gw = (cw * avail) / grid.height;
    grid = gridFor(input.format, input.layout, gw, gap);
  }
  const ox = M + (cw - gw) / 2;
  grid.rects.forEach((r, i) => {
    const film = input.films[i];
    const rect: Rect = { x: ox + r.x, y: y + r.y, w: r.w, h: r.h };
    if (!film) return drawEmptySlot(ctx, rect, i + 1, T);
    const img = art.get(film.id);
    if (img && img.naturalWidth > 0) drawArt(ctx, rect, img, img.naturalWidth, img.naturalHeight);
    else drawTitleCard(ctx, rect, film);
    drawRankTab(ctx, rect, i + 1, T);
  });
  y += grid.height + after;

  if (quote) {
    ctx.fillStyle = T.fg;
    ctx.font = `400 ${qs}px ${FONT_BODY}`;
    ctx.fillText(ellipsize(ctx, `“${quote}”`, cw), M, y + qs);
    y += qH;
  }

  // ranked titles in two columns, sized to the space left
  const cTop = y;
  const cBot = H - M - footH;
  const rowH = (cBot - cTop) / 5;
  const ts = Math.min(rowH * 0.66, feed ? 66 : 46);
  const ns = ts * 0.42;
  const gutter = feed ? 60 : 36;
  const colW = (cw - gutter) / 2;
  ctx.strokeStyle = T.mute;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < MAX_FILMS; i++) {
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const cx = M + col * (colW + gutter);
    const ruleY = cTop + row * rowH;
    const by = ruleY + rowH * 0.5 + ts * 0.36;
    const film = input.films[i];
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(cx, ruleY);
    ctx.lineTo(cx + colW, ruleY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `500 ${ns}px ${FONT_MONO}`;
    ctx.fillStyle = T.accent;
    ctx.textAlign = "left";
    ctx.fillText(String(i + 1).padStart(2, "0"), cx, by);
    const nx = cx + ns * 1.9;
    let yw = 0;
    if (film?.year) {
      ctx.fillStyle = T.mute;
      ctx.textAlign = "right";
      ctx.fillText(film.year, cx + colW, by);
      yw = ctx.measureText(film.year).width + ns;
    }
    ctx.textAlign = "left";
    ctx.font = `700 ${ts}px ${FONT_DISPLAY}`;
    ctx.fillStyle = film ? T.fg : T.mute;
    ctx.fillText(film ? ellipsize(ctx, film.title.toUpperCase(), colW - (nx - cx) - yw) : "—", nx, by);
  }

  // foot
  const fs = feed ? 24 : 19;
  ctx.font = `500 ${fs}px ${FONT_MONO}`;
  tracking(ctx, fs * 0.14);
  ctx.fillStyle = T.mute;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(M, cBot);
  ctx.lineTo(W - M, cBot);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.fillText(SITE_NAME.toUpperCase(), M, H - M);
  ctx.textAlign = "right";
  ctx.fillText(String(new Date().getFullYear()), W - M, H - M);
  tracking(ctx, 0);
  return true;
}

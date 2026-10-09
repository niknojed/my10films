"use client";

import { useEffect } from "react";
import { THEMES } from "@/lib/config";
import { loadState } from "@/lib/store";
import type { Theme } from "@/lib/types";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const bg = getComputedStyle(root).getPropertyValue("--color-bg").trim();
  if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
}

/**
 * Shows a page in a fixed theme, such as a shared list in its creator's theme. The inline script sets
 * it before first paint; on leaving the page, the visitor's own saved theme comes back.
 * Without a theme it applies the visitor's saved one. The not-found page needs that, because Next
 * renders it in the browser, where the layout's head script never runs.
 */
export default function PageTheme({ theme }: { theme?: Theme }) {
  useEffect(() => {
    apply(theme ?? loadState().theme);
    return () => apply(loadState().theme);
  }, [theme]);

  if (!theme || !(THEMES as readonly string[]).includes(theme)) return null;
  return <script dangerouslySetInnerHTML={{ __html: `document.documentElement.dataset.theme=${JSON.stringify(theme)}` }} />;
}

"use client";

import { useEffect } from "react";
import { THEMES } from "@/lib/config";
import type { Section } from "@/lib/sections";
import { loadState } from "@/lib/store";
import type { Theme } from "@/lib/types";

function apply(theme: Theme, section: Section) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.section = section;
  const bg = getComputedStyle(root).getPropertyValue("--color-bg").trim();
  if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
}

/**
 * Shows a page in a fixed theme and section, such as a shared list in its creator's theme, with the
 * Shows accent for a list of shows. The inline script sets both before first paint; on leaving the
 * page, the visitor's own saved theme comes back. Maker sets its own section when one is shown.
 * Without a theme it applies the visitor's saved one. The not-found page needs that, because Next
 * renders it in the browser, where the layout's head script never runs.
 */
export default function PageTheme({ theme, section = "films" }: { theme?: Theme; section?: Section }) {
  useEffect(() => {
    apply(theme ?? loadState().theme, section);
    return () => apply(loadState().theme, "films");
  }, [theme, section]);

  if (!theme || !(THEMES as readonly string[]).includes(theme)) return null;
  const set = `var d=document.documentElement;d.dataset.theme=${JSON.stringify(theme)};d.dataset.section=${JSON.stringify(section === "shows" ? "shows" : "films")}`;
  return <script dangerouslySetInnerHTML={{ __html: set }} />;
}

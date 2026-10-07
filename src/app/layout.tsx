import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/900";
import "@fontsource/dm-mono/400";
import "@fontsource/dm-mono/500";
import "@fontsource/schibsted-grotesk/400";
import "@fontsource/schibsted-grotesk/600";
import "./globals.css";
import { SITE_NAME, siteUrl } from "@/lib/config";

const description =
  "Pick the ten films that made you, put them in order, and save one poster for your feed or Story. No account.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME}: the ten films that made you`, template: `%s · ${SITE_NAME}` },
  description,
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description, url: "/" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8e9ed" },
    { media: "(prefers-color-scheme: dark)", color: "#150a10" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10"
        >
          Skip to content
        </a>
        <div className="wrap grid gap-9 pb-14 pt-6">
          <main id="main" className="grid gap-9">
            {children}
          </main>
          <footer className="grid gap-3 border-t border-line pt-4 text-[0.8125rem] text-mute">
            <nav aria-label="Site" className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/">Make a poster</Link>
              <Link href="/about">Credits and takedowns</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
            <p className="max-w-[70ch]">
              Film data and poster images come from TMDB. This product uses the TMDB API but is not endorsed or
              certified by TMDB. Posters belong to their studios and distributors.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Credits and takedowns" };

export default function About() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <article className="prose-page">
      <h1 className="h-hero">Credits</h1>
      <p>
        {SITE_NAME} is a free tool for choosing the ten films that shaped you and turning them into one poster. It
        carries no advertising and sells nothing.
      </p>

      <h2>Film data and images</h2>
      {/* TMDB's approved logo. Their terms require it to be less prominent than this site's own mark. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tmdb.svg" alt="TMDB" width={92} height={12} className="block" />
      <p>
        Film titles, release years and poster images come from TMDB (The Movie Database). This product uses the TMDB
        API but is not endorsed or certified by TMDB.
      </p>
      <p>
        Poster artwork belongs to the studios, distributors and artists who made it. It appears here to identify the
        films people chose. This site claims no rights in it.
      </p>

      <h2>Takedown requests</h2>
      <p>
        If you hold rights in an image shown here and want it removed, or you want a shared list taken down, write to{" "}
        {email ? (
          <a href={`mailto:${email}`} className="underline">
            {email}
          </a>
        ) : (
          <strong>the site owner</strong>
        )}{" "}
        with the page address and the film title. Requests are handled promptly.
      </p>

      <h2>Typefaces</h2>
      <p>Big Shoulders Display, Schibsted Grotesk and DM Mono, each under the SIL Open Font License.</p>
    </article>
  );
}

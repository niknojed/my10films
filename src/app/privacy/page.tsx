import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <article className="prose-page">
      <h1 className="h-hero">Privacy</h1>
      <p>There are no accounts, no advertising and no tracking cookies on this site.</p>

      <h2>While you build a list</h2>
      <p>
        Your picks, their order, and the name and line you type are stored in your own browser. They reach this
        site&apos;s server only if you ask for a share link. Clearing your browser&apos;s site data removes them.
      </p>
      <p>
        Search terms are sent to this site&apos;s server, which forwards them to TMDB to find matching films. Poster
        images load from TMDB&apos;s image servers, so TMDB sees your IP address when they load.
      </p>

      <h2>When you get a share link</h2>
      <p>
        The server stores the ten films, their order, your chosen layout and theme, and the name and line you typed.
        Anyone with the link can see them. The films are counted toward a Most picked list, which isn't shown on the site at the moment.
      </p>
      <p>
        The server also stores a one-way hash of your IP address with the list. It is used for two things: limiting
        how many lists one person can save in an hour, and counting each person once toward Most picked. The address
        itself is never stored.
      </p>

      <h2>Removing a shared list</h2>
      <p>
        Send the link to{" "}
        {email ? (
          <a href={`mailto:${email}`} className="underline">
            {email}
          </a>
        ) : (
          <strong>the site owner</strong>
        )}{" "}
        and it will be deleted along with its counts.
      </p>
    </article>
  );
}

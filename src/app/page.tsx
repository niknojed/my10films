import type { Metadata } from "next";
import Maker from "@/components/Maker";
import { SHOW_MOST_PICKED, SITE_NAME } from "@/lib/config";
import { getMostPicked } from "@/lib/server";

export const revalidate = 600;

export const metadata: Metadata = { alternates: { canonical: "/" } };

const STEPS = [
  "Search for a film by title and add it. Each film fills the next open slot.",
  "Put them in order. Number 1 gets top billing, the largest poster on the default layout. Drag a poster to reorder it (on a phone, drag by the grip), or use the arrow buttons.",
  "Expand the poster, add your name or handle and one line if you want, pick a theme, and select Save poster. Feed posters are 1800 × 2100 pixels. Story posters are 1080 × 1920.",
];

const IDEAS = [
  "Start with the first film you remember seeing in a theater.",
  "Take one from each stage of your life: childhood, your teens, your twenties, the last few years.",
  "Choose the ten you'd show someone so they'd understand you.",
  "Keep the ones you've watched forty times. The films that made you don't have to be the best ones you've seen.",
];

const QUESTIONS = [
  { q: "Do I need an account?", a: "No. Picking, ordering and saving all work without signing in." },
  {
    q: "Why ten films?",
    a: "Ten leaves room to cover different eras and genres, and the ranked list at the bottom of the poster reads like a film's credits. On the default layout, number 1 gets the largest slot.",
  },
  {
    q: "Where do the posters come from?",
    a: "Film titles, years and poster images come from TMDB (The Movie Database). Posters belong to their studios and distributors.",
  },
  {
    q: "What does a share link do?",
    a: "It saves your list to a public page anyone with the link can see. The page gets its own preview image when you post it.",
  },
  {
    q: "Can I change my list later?",
    a: "Yes. Your list is saved in this browser, so you can come back to reorder or swap films. A share link keeps the list as it was when you made the link. Make a new link after changes.",
  },
  { q: "Is this connected to my 9 albums?", a: "No. It's an independent site that uses the same format for film." },
];

export default async function Home() {
  const mostPicked = SHOW_MOST_PICKED ? await getMostPicked() : [];
  return (
    <>
      <header className="grid gap-3 border-b-2 border-ink pb-6">
        <p className="mono text-accent">{SITE_NAME}</p>
        <h1 className="h-hero">The ten films that made you</h1>
        <p className="max-w-[46ch] text-mute">
          Search for ten films, rank them, and save the poster for your feed or Story.
        </p>
      </header>
      <Maker mostPicked={mostPicked} />

      {/* Server-rendered so the explanation is in the initial HTML. */}
      <section className="guide" aria-label="About My 10 Films">
        <div className="guide-block">
          <h2 className="h-sec">What My 10 Films is</h2>
          <p>
            My 10 Films is a free poster maker for the films that shaped you. Search any film, put ten in order, and
            save one image sized for a feed post or a Story. There&rsquo;s no account. Your list stays in your browser
            until you choose to share it.
          </p>
          <p>
            It&rsquo;s a film version of the &ldquo;my 9 albums&rdquo; format: one image that says something about you
            through what you chose. Pick the ten that made you, your all-time ten, or your ten favorites in one genre.
          </p>
        </div>

        <div className="guide-block">
          <h2 className="h-sec">How to make your poster</h2>
          <ol className="guide-steps">
            {STEPS.map((step, i) => (
              <li key={i}>
                <span className="mono text-accent" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="guide-block">
          <h2 className="h-sec">Ideas when you can&rsquo;t choose</h2>
          <ul className="guide-ideas">
            {IDEAS.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>

        <div className="guide-block">
          <h2 className="h-sec">Questions</h2>
          <div className="guide-faq">
            {QUESTIONS.map(({ q, a }) => (
              <div key={q}>
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

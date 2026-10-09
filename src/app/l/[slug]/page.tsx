import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Art from "@/components/Art";
import PageTheme from "@/components/PageTheme";
import { headingFor, headingLine } from "@/lib/listType";
import { getSharedList } from "@/lib/server";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const list = await getSharedList(slug).catch(() => null);
  if (!list) return { title: "List not found", robots: { index: false } };
  const title = headingLine(list.listType, list.genre, list.name);
  const description = list.films.map((f, i) => `${i + 1}. ${f.title}`).join(" · ");
  return {
    title,
    description,
    // Shared lists carry visitor-written text, so they stay out of search indexes.
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `/l/${list.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedListPage({ params }: Params) {
  const { slug } = await params;
  const list = await getSharedList(slug);
  if (!list) notFound();
  const [first, ...rest] = list.films;
  const heading = headingFor(list.listType, list.genre, list.name);

  return (
    <>
      {/* The page wears the creator's theme, set before the content below paints. */}
      <PageTheme theme={list.theme} />
      <header className="grid gap-3 border-b-2 border-ink pb-6">
        <p className="mono text-accent">{heading.eyebrow}</p>
        <h1 className="h-hero [overflow-wrap:anywhere]">{heading.big}</h1>
        {list.quote ? <p className="max-w-[46ch] text-lg">“{list.quote}”</p> : null}
      </header>

      <section aria-label="The list" className="grid gap-6">
        {list.layout === "top" && first ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-start">
            <Art film={first} size="w500" rank={1} />
            <ul className="grid grid-cols-3 gap-3">
              {rest.map((film, i) => (
                <li key={film.id}>
                  <Art film={film} size="w342" rank={i + 2} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="shared-grid">
            {list.films.map((film, i) => (
              <li key={film.id}>
                <Art film={film} size="w342" rank={i + 1} />
              </li>
            ))}
          </ul>
        )}

        <ol className="credits">
          {list.films.map((film, i) => (
            <li key={film.id}>
              <span className="mono text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="t">{film.title}</span>
              <span className="mono text-mute">{film.year}</span>
            </li>
          ))}
        </ol>
      </section>

      <p>
        <Link href="/" className="btn btn-primary">
          Make your own ten
        </Link>
      </p>
    </>
  );
}

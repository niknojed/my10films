import Maker from "@/components/Maker";
import { SHOW_MOST_PICKED, SITE_NAME } from "@/lib/config";
import { getMostPicked } from "@/lib/server";

export const revalidate = 600;

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
    </>
  );
}

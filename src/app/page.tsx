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
          Pick them, put them in order, save one poster. No account. Your list stays in this browser until you share
          it.
        </p>
      </header>
      <Maker mostPicked={mostPicked} />
    </>
  );
}

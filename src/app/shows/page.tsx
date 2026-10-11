import type { Metadata } from "next";
import Maker from "@/components/Maker";

const description =
  "Pick the ten TV shows that made you, put them in order, and save one poster for your feed or Story. No account.";

export const metadata: Metadata = {
  title: { absolute: "My 10 Shows: the ten shows that made you" },
  description,
  alternates: { canonical: "/shows" },
  openGraph: { title: "My 10 Shows", description, url: "/shows" },
  // Setting twitter here replaces the layout's, so the large card is restated. The images come from
  // this folder's opengraph-image and twitter-image.
  twitter: { card: "summary_large_image", title: "My 10 Shows", description },
};

export default function Shows() {
  return <Maker mostPicked={[]} section="shows" />;
}

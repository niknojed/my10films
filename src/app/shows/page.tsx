import type { Metadata } from "next";
import Maker from "@/components/Maker";

const description =
  "Pick the ten TV shows that made you, put them in order, and save one poster for your feed or Story. No account.";

export const metadata: Metadata = {
  title: { absolute: "My 10 Shows: the ten shows that made you" },
  description,
  alternates: { canonical: "/shows" },
  openGraph: { title: "My 10 Shows", description, url: "/shows" },
  twitter: { title: "My 10 Shows", description },
};

export default function Shows() {
  return <Maker mostPicked={[]} section="shows" />;
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

// Shared lists (/l/) stay out: they're noindex and carry visitor-written text.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}

import { PREVIEW_SIZE, sectionImage } from "@/lib/sectionImage";

export const runtime = "nodejs";
export const alt = "My 10 Films: rank the ten films that made you and save the poster";
export const size = PREVIEW_SIZE;
export const contentType = "image/png";

export default function Image() {
  return sectionImage("films");
}

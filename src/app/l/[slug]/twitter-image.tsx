// Shared lists use their own preview on X too. Without this file the site-wide twitter-image would apply.
// Route segment config can't be re-exported, so it's repeated here.
export { default, alt, size, contentType } from "./opengraph-image";

export const runtime = "nodejs";
export const revalidate = 86400;

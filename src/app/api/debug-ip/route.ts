import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY: shows how Hostinger's proxy passes the client address, so IP hashing can read
// the right header. Echoes only the caller's own request headers. Remove after the check.
const HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "forwarded",
  "x-client-ip",
  "true-client-ip",
  "cf-connecting-ip",
  "x-cluster-client-ip",
  "x-forwarded-host",
  "x-forwarded-proto",
];

export function GET(req: NextRequest) {
  const seen = Object.fromEntries(HEADERS.map((h) => [h, req.headers.get(h)]));
  return NextResponse.json(seen, { headers: { "Cache-Control": "no-store" } });
}

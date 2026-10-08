/**
 * The caller's address as Hostinger's proxy reports it. The proxy overwrites x-real-ip, but it keeps
 * whatever the client sent at the front of x-forwarded-for and appends the real address, so only the
 * last x-forwarded-for entry is trustworthy. Checked against the live proxy on 2026-10-08.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const last = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last || "unknown";
}

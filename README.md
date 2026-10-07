# My 10 Films

Pick the ten films that made you, rank them, and save one poster for a feed or Story. Share links give each list a public page with a preview image, and shared lists feed a Most picked ranking.

Next.js 15 (App Router), Tailwind 4, Supabase, TMDB.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

| Variable | Needed for | Where it comes from |
| --- | --- | --- |
| `TMDB_READ_TOKEN` | Search, saving lists | themoviedb.org > Settings > API > "API Read Access Token" |
| `SUPABASE_URL` | Share links, Most picked | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Share links, Most picked | Supabase project settings. Server only. |
| `HASH_SALT` | Share links | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | Share URLs, preview images | Your public origin, no trailing slash |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Credits and privacy pages | Your takedown address |

The maker runs with only `TMDB_READ_TOKEN`. Without the Supabase values, share links answer "not set up" and Most picked stays hidden.

## Database

Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor, or `supabase db push` with the CLI. Row level security is on with no policies, so only the server's service role can read or write.

## Before launch

1. **TMDB logo.** TMDB's terms require one of its approved logos, shown smaller than this site's own mark. Download one from themoviedb.org/about/logos-attribution, save it as `public/tmdb.svg`, and add the `<img>` where the comment in `src/app/about/page.tsx` marks it. The required text notice is already in the footer and on the credits page.
2. **TMDB terms.** Read the current API terms for caching and image rules. This code caches search results for one hour and film records for one day, and never stores image files.
3. **Commercial use.** The free TMDB tier covers non-commercial use only. Ads, affiliate links or paid features need a commercial agreement with TMDB first.
4. **Contact address.** Set `NEXT_PUBLIC_CONTACT_EMAIL` so takedown requests have somewhere to go.
5. **Proxy headers.** IP hashing reads `x-forwarded-for`. Vercel sets it. Behind another proxy, confirm the client cannot spoof the header.

## How it works

- **Search** (`/api/search`) proxies TMDB so the token stays on the server.
- **Lists stay in the browser** (`localStorage`) until someone asks for a share link.
- **Saving** (`/api/lists`) takes ten film ids. The server looks each one up on TMDB and stores TMDB's title, year and poster path, so film data never comes from the browser.
- **Abuse limits.** Ten saves an hour per hashed IP. An identical list from the same person returns its existing link. A film's Most picked count is the number of distinct people who listed it.
- **Most picked** appears once ten or more films have counts (`MOST_PICKED_MIN` in `src/lib/config.ts`). No seeded data.
- **Poster export** draws to canvas in the browser at 1800 × 2100 or 1080 × 1920. Posters load from TMDB with CORS; `/api/img` is a same-origin fallback that stores nothing.
- **Shared pages** (`/l/[slug]`) are `noindex` because they carry visitor-written text.

## Not built yet

- Moderation for the name and one-line fields on shared pages. They are length-capped and stripped of control characters, with no word filtering.
- A self-serve way to delete a shared list. Removal is by email request.
- Analytics.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

# My 10 Films

A site where people pick the ten films that made them, rank them, and save one poster for a feed (1800 × 2100) or Story (1080 × 1920). It's a film version of my9albums.org. Live at https://my10films.com. The name "My 10 Films" is set in `src/lib/config.ts` (`SITE_NAME`).

- Repo: github.com/niknojed/my10films (public), branch `main`
- Local: `~/Sites/my10films`
- Stack: Next.js 15 (App Router), React 19, Tailwind 4, Supabase, TMDB API, Vitest 5
- Node 22 everywhere. Locally it comes from Homebrew `node@22`, put first on PATH in `~/.zshrc`. Vitest 5 won't run on Node 20.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test        # 34 unit tests: validation, poster grids, list state, client IP, list types
npm run build
```

## Structure

- `src/app/page.tsx`: home. Server-fetches Most picked, renders `<Maker>`.
- `src/components/Maker.tsx`: client shell. `useReducer` state, persisted to `localStorage` (`my10films.v1`), cross-tab sync.
- `src/components/Search.tsx`: debounced search against `/api/search`, keyboard navigation, error and retry states. Enter pressed before results arrive is held and applied when results for that exact query land.
- `src/components/Board.tsx`: ranked slots. Pointer drag (whole card with a mouse, grip on touch), arrow buttons, focus kept after moves, live-region announcements.
- `src/components/PosterPanel.tsx`: canvas preview, format, layout and theme controls, PNG export (share sheet on touch, download elsewhere), share-link creation. Expand opens a native `<dialog>`: full screen on phones, poster beside the options from 64rem. The preview and options render in one place at a time, so the canvas remounts and redraws on open and close.
- `src/components/ListTypeChips.tsx` and `src/lib/listType.ts`: list types `made` (the default), `alltime` and `genre`. Genre lists pick a curated category from `src/lib/categories.ts` (films only: 80s Action, Blaxploitation, Horror Before 2000, Indie, Rom-Coms, Sci-Fi). Shows have no genres (decided 2026-10-10): `SECTION_LIST_TYPES` in `src/lib/sections.ts` gives Shows only That made me and All-time ten, and a saved Shows list on `genre` falls back to `made`. Blaxploitation uses TMDB's keyword "blaxploitation cinema"; there is no keyword named plain "blaxploitation". Lists saved before categories keep their TMDB genre name, which `isStoredGenre` still accepts for display only. `headingFor` gives the poster and share-page heading; `headingLine` gives the sentence for titles and the share sheet. A genre list can't be saved or shared until a genre is chosen.
- `src/lib/poster.ts`: canvas renderer. Layouts: feed + top billing = no. 1 large beside a 3×3; feed + equal = 5×2; story + top = no. 1 half-width, 2×2 beside it, a row of 5 below; story + equal = rows of 3, 3, 4. Films with no TMDB poster get a generated title card.
- `src/lib/useArt.ts`: loads poster images for canvas. Direct from TMDB with CORS first, then the `/api/img` same-origin pass-through.
- `src/app/api/search`: TMDB search proxy for both sections (`section=films|shows`). With `cat=<category id>` results stay inside the category (genres and years from the search results; keyword categories check each title's keywords, capped at 15 lookups), and an empty query browses the category through TMDB discover. `all=1` searches everything. The token stays on the server.
- Sections: `src/lib/sections.ts`. `/` is Films, `/shows` is Shows, switched by `SectionSwitch`. Each section keeps its own list and theme in storage (`my10films.v1`, `my10films.shows.v1`). `data-section` on `<html>` (set by the layout script, kept by `Maker`) gives Shows a broadcast-blue accent and rounder frames; the poster adds faint scan lines and a "My 10 Shows" footer. Share links are films-only until the database stores a media type.
- `Maker` renders the page heading: "My 10 Films" or "My 10 Shows" small, then the list type large ("That made me", "All-time ten", or the category), as one `<h1>`.
- `src/app/api/lists`: POST, saves a shared list. Checks same origin, caps the body at 4 KB, and checks every film id against TMDB before saving. Calls the `create_list` RPC.
- `src/app/api/img`: poster pass-through. Validates path and size and stores nothing.
- `src/app/l/[slug]`: shared list page (`noindex`) plus `opengraph-image.tsx`, which reads fonts from `assets/`.
- `src/app/page.tsx`: also server-renders the explanatory section below the maker (what it is, how to make a poster, ideas, questions), styled by `.guide*` in `globals.css`. When a control's label changes, update the copy there too.
- SEO: `src/app/opengraph-image.tsx` and `twitter-image.tsx` are the site-wide preview, drawn in the default theme with empty slots and no poster art. `/l/[slug]` has its own `opengraph-image` and `twitter-image`, which take precedence on share pages. Without its `twitter-image`, X would show the site-wide image for shared lists. Canonicals are set per page on `/`, `/about` and `/privacy`, never in the root layout, which would leak them onto `/l/` pages. `src/app/sitemap.ts` lists those three pages, and `robots.ts` points to it.
- `src/app/about`, `src/app/privacy`: credits with the TMDB notice and logo (`public/tmdb.svg`), takedown contact, privacy.
- `src/lib/ip.ts`: client address for IP hashing. See Hosting below for why it reads `x-real-ip`.
- `supabase/migrations/0001_init.sql`: `lists` and `list_films` tables. RLS is on with no policies, so only the service role can read or write. Two RPCs:
  - `create_list`: atomic save. A repeat of the same list by the same person returns its existing slug. 10 saves an hour per hashed IP.
  - `most_picked`: counts distinct people per film.
- `supabase/migrations/0003_list_types.sql`: adds `lists.list_type` (default `made`) and `lists.genre`, and recreates `create_list` with two defaulted parameters. Run it before deploying code that reads or sends list types.
- `supabase/migrations/0002_store_ids_only.sql`: `list_films` keeps only `tmdb_id` and `position`. `most_picked` returns `(tmdb_id, picks)`.
- `filmsById` in `src/lib/server.ts`: share pages, preview images and Most picked fetch titles, years and posters from TMDB by id, through `getFilm`'s 1-day fetch cache. A film TMDB has removed shows as a "No longer listed" title card on share pages and is dropped from Most picked.

## Decisions already made

- **No revenue at launch.** This keeps it on TMDB's free non-commercial tier. Ads, affiliate links or paid features need a TMDB commercial agreement first.
- **Posters come from TMDB.** TMDB doesn't own poster copyright, and no service licenses poster art for user-made images. The site shows TMDB attribution, a takedown contact and a credits page. Poster image files are never stored on our side.
- **Scope is full parity with my9albums:** the maker, share links and Most picked.
- **Ten films, with two layouts:** top billing and equal billing.
- **Most picked is turned off** (`SHOW_MOST_PICKED = false` in `src/lib/config.ts`, since 2026-10-08), because it was noise at launch. Saved lists still count toward it in the database. When it's turned back on, it stays hidden until at least 10 films have real counts (`MOST_PICKED_MIN`). No seeded data.
- **Themes:** order and labels are Silver screen (`silver`, the default), Cinema (`slate`), then Velvet (`velvet`). The stored values never change, because saved lists and the database check constraint use them. The whole site wears the chosen theme: `data-theme` on `<html>`, set before first paint by an inline script in `layout.tsx` (default `silver`), kept in sync by `Maker`, with one token block per theme in `globals.css`. Shared list pages wear the creator's theme instead (`PageTheme`), and the visitor's own theme returns when they navigate away. The OS light or dark setting only applies when JavaScript is off.
- **Privacy:** IP addresses are stored only as an HMAC hash using `HASH_SALT`.
- **TMDB terms (checked 2026-10-08):** section 1.C forbids caching TMDB data for more than 6 months, so the database stores TMDB ids only. Never add title, year or poster columns back. The same section bans "derivatives" of TMDB content. The poster export may count as one under a strict reading. The decision was to proceed as is.
- **Dependencies:** `package.json` overrides Next's bundled postcss to 8.5.x to clear audit advisories without moving to Next 16. Remove the override when upgrading Next.

## Hosting

- Hostinger Node.js web app, deployed from GitHub `main`. Every push to `main` redeploys.
- Settings: framework preset Next.js, Node 22, build `npm run build`, start `npm start`.
- Env vars are set in hPanel: `TMDB_READ_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HASH_SALT`, `NEXT_PUBLIC_SITE_URL=https://my10films.com`, `NEXT_PUBLIC_CONTACT_EMAIL`. `NEXT_PUBLIC_*` values are fixed in at build time, so changing one needs a redeploy.
- Hosts, checked 2026-10-09: http redirects to https on both hosts, but `https://www.my10films.com` serves the site directly instead of redirecting to the apex. The fix is in Hostinger. Canonical tags point to the apex meanwhile.
- `NEXT_PUBLIC_SITE_URL` is required in production. Behind the proxy the app doesn't see `my10films.com` as its own host, so the save route's same-origin check passes only through this value. Without it every save returns 403.
- A malformed `SUPABASE_URL` is treated as unconfigured and logged once, so the build doesn't fail. Check build logs for `SUPABASE_URL is not an http(s) URL`.
- Proxy headers, checked live on 2026-10-08: Hostinger overwrites `x-real-ip` with the real client address. It keeps a client-sent `x-forwarded-for` value at the front and appends the real address. `clientIp` reads `x-real-ip`, then the last `x-forwarded-for` entry. Never the first.
- Supabase: `0001_init.sql` has been run on the production project. Migrations are run by hand in the SQL editor, after the code that needs them has deployed.

## Verification status

- **Passed locally:** typecheck, unit tests, production build, and a browser pass with mocked TMDB data at 1280px and 390px.
- **Passed live on 2026-10-08:** TMDB search, adding ten, arrow reordering with focus and announcements, reload persistence, canvas export (1800 × 2100, no CORS taint), saving a share link to Supabase, the shared page (`noindex`), and its preview image.
- **Not yet seen live:** Most picked, which stays hidden until there's enough data.

## Next steps

1. **Most picked:** decide when to turn it back on, then check it with real counts.

## Known gaps

- No moderation on the name and one-line fields shown on shared pages. They are length-capped and stripped of control characters only.
- No self-serve deletion of a shared list. Removal is by email request, then `delete from public.lists where slug = '...'` in the Supabase SQL editor. Film rows cascade.
- No analytics.

## Git setup on this Mac

- This repo pushes as **niknojed**. The Mac's Keychain holds a different GitHub login that can't push to `niknojed` repos.
- This repo is configured locally to avoid it:
  - The remote URL is `https://niknojed@github.com/niknojed/my10films.git`.
  - `.git/config` has `[credential] helper =`, which turns off the Keychain helper for this repo only.
- Pushes authenticate through VS Code's GitHub sign-in as niknojed.
- From a plain shell (including Claude Code), `gh` holds both accounts, with the work account active. Push with a one-off helper that changes no config:
  `git -c credential.helper= -c 'credential.helper=!f(){ echo username=niknojed; echo "password=$(gh auth token --user niknojed)"; }; f' push origin main`
- Don't switch the active `gh` account.
- Don't change the global git credential config. Other repos on this Mac depend on it.
- `my10films.zip` in the folder is a leftover delivery copy, ignored through `.git/info/exclude`, and safe to delete.

## Working preferences for this project

- **Code:** production error handling, real state management, complete logic. Mobile-first, with keyboard and reduced-motion support from the first pass.
- **Design:** keep the existing tokens in `src/app/globals.css` and the type system: Big Shoulders Display, Schibsted Grotesk, DM Mono.
- **Copy:** plain and expert-to-expert. No marketing language. Avoid the "it's not X, it's Y" construction.
- **Decisions:** when there's a real fork, name both paths, the tradeoff, and a recommended pick.

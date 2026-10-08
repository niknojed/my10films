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
npm test        # 25 unit tests: validation, poster grids, list state, client IP
npm run build
```

## Structure

- `src/app/page.tsx`: home. Server-fetches Most picked, renders `<Maker>`.
- `src/components/Maker.tsx`: client shell. `useReducer` state, persisted to `localStorage` (`my10films.v1`), cross-tab sync.
- `src/components/Search.tsx`: debounced search against `/api/search`, keyboard navigation, error and retry states. Enter pressed before results arrive is held and applied when results for that exact query land.
- `src/components/Board.tsx`: ranked slots. Pointer drag (whole card with a mouse, grip on touch), arrow buttons, focus kept after moves, live-region announcements.
- `src/components/PosterPanel.tsx`: canvas preview, format, layout and theme controls, PNG export (share sheet on touch, download elsewhere), share-link creation.
- `src/lib/poster.ts`: canvas renderer. Layouts: feed + top billing = no. 1 large beside a 3×3; feed + equal = 5×2; story + top = no. 1 half-width, 2×2 beside it, a row of 5 below; story + equal = rows of 3, 3, 4. Films with no TMDB poster get a generated title card.
- `src/lib/useArt.ts`: loads poster images for canvas. Direct from TMDB with CORS first, then the `/api/img` same-origin pass-through.
- `src/app/api/search`: TMDB search proxy. The token stays on the server.
- `src/app/api/lists`: POST, saves a shared list. Checks same origin, caps the body at 4 KB, and re-fetches every film from TMDB by id, so film data never comes from the browser. Calls the `create_list` RPC.
- `src/app/api/img`: poster pass-through. Validates path and size and stores nothing.
- `src/app/l/[slug]`: shared list page (`noindex`) plus `opengraph-image.tsx`, which reads fonts from `assets/`.
- `src/app/about`, `src/app/privacy`: credits with the TMDB notice and logo (`public/tmdb.svg`), takedown contact, privacy.
- `src/lib/ip.ts`: client address for IP hashing. See Hosting below for why it reads `x-real-ip`.
- `supabase/migrations/0001_init.sql`: `lists` and `list_films` tables. RLS is on with no policies, so only the service role can read or write. Two RPCs:
  - `create_list`: atomic save. A repeat of the same list by the same person returns its existing slug. 10 saves an hour per hashed IP.
  - `most_picked`: counts distinct people per film.

## Decisions already made

- **No revenue at launch.** This keeps it on TMDB's free non-commercial tier. Ads, affiliate links or paid features need a TMDB commercial agreement first.
- **Posters come from TMDB.** TMDB doesn't own poster copyright, and no service licenses poster art for user-made images. The site shows TMDB attribution, a takedown contact and a credits page. Poster image files are never stored on our side.
- **Scope is full parity with my9albums:** the maker, share links and Most picked.
- **Ten films, with two layouts:** top billing and equal billing.
- **Most picked stays hidden** until at least 10 films have real counts (`MOST_PICKED_MIN`). No seeded data.
- **Privacy:** IP addresses are stored only as an HMAC hash using `HASH_SALT`.
- **Dependencies:** `package.json` overrides Next's bundled postcss to 8.5.x to clear audit advisories without moving to Next 16. Remove the override when upgrading Next.

## Hosting

- Hostinger Node.js web app, deployed from GitHub `main`. Every push to `main` redeploys.
- Settings: framework preset Next.js, Node 22, build `npm run build`, start `npm start`.
- Env vars are set in hPanel: `TMDB_READ_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HASH_SALT`, `NEXT_PUBLIC_SITE_URL=https://my10films.com`, `NEXT_PUBLIC_CONTACT_EMAIL`. `NEXT_PUBLIC_*` values are fixed in at build time, so changing one needs a redeploy.
- `NEXT_PUBLIC_SITE_URL` is required in production. Behind the proxy the app doesn't see `my10films.com` as its own host, so the save route's same-origin check passes only through this value. Without it every save returns 403.
- A malformed `SUPABASE_URL` is treated as unconfigured and logged once, so the build doesn't fail. Check build logs for `SUPABASE_URL is not an http(s) URL`.
- Proxy headers, checked live on 2026-10-08: Hostinger overwrites `x-real-ip` with the real client address. It keeps a client-sent `x-forwarded-for` value at the front and appends the real address. `clientIp` reads `x-real-ip`, then the last `x-forwarded-for` entry. Never the first.
- Supabase: `0001_init.sql` has been run on the production project.

## Verification status

- **Passed locally:** typecheck, unit tests, production build, and a browser pass with mocked TMDB data at 1280px and 390px.
- **Passed live on 2026-10-08:** TMDB search, adding ten, arrow reordering with focus and announcements, reload persistence, canvas export (1800 × 2100, no CORS taint), saving a share link to Supabase, the shared page (`noindex`), and its preview image.
- **Not yet seen live:** Most picked, which stays hidden until there's enough data.

## Next steps

1. **TMDB API terms:** confirm the caching and image rules. Current caching is 1 hour for search and 1 day for film records.
2. **Most picked:** check it once 10+ films have real counts.

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

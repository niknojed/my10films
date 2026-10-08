# My 10 Films

A site where people pick the ten films that made them, rank them, and save one poster for a feed (1800 × 2100) or Story (1080 × 1920). It's a film version of my9albums.org. Working name "My 10 Films", set in `src/lib/config.ts` (`SITE_NAME`).

- Repo: github.com/niknojed/my10films (public), branch `main`
- Local: `~/Sites/my10films`
- Stack: Next.js 15 (App Router), React 19, Tailwind 4, Supabase, TMDB API, Vitest

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test        # 22 unit tests: validation, poster grids, list state
npm run build
```

## Structure

- `src/app/page.tsx`: home. Server-fetches Most picked, renders `<Maker>`.
- `src/components/Maker.tsx`: client shell. `useReducer` state, persisted to `localStorage` (`my10films.v1`), cross-tab sync.
- `src/components/Search.tsx`: debounced search against `/api/search`, keyboard navigation, error and retry states.
- `src/components/Board.tsx`: ranked slots. Pointer drag (whole card with a mouse, grip on touch), arrow buttons, focus kept after moves, live-region announcements.
- `src/components/PosterPanel.tsx`: canvas preview, format, layout and theme controls, PNG export (share sheet on touch, download elsewhere), share-link creation.
- `src/lib/poster.ts`: canvas renderer. Layouts: feed + top billing = no. 1 large beside a 3×3; feed + equal = 5×2; story + top = no. 1 half-width, 2×2 beside it, a row of 5 below; story + equal = rows of 3, 3, 4. Films with no TMDB poster get a generated title card.
- `src/lib/useArt.ts`: loads poster images for canvas. Direct from TMDB with CORS first, then the `/api/img` same-origin pass-through.
- `src/app/api/search`: TMDB search proxy. The token stays on the server.
- `src/app/api/lists`: POST, saves a shared list. Checks same origin, caps the body at 4 KB, and re-fetches every film from TMDB by id, so film data never comes from the browser. Calls the `create_list` RPC.
- `src/app/api/img`: poster pass-through. Validates path and size and stores nothing.
- `src/app/l/[slug]`: shared list page (`noindex`) plus `opengraph-image.tsx`, which reads fonts from `assets/`.
- `src/app/about`, `src/app/privacy`: credits with the TMDB notice, takedown contact, privacy.
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

## Verification status

- **Passed:** typecheck, unit tests, production build, and a browser pass with mocked TMDB data at 1280px and 390px. That covered search errors, adding ten, keyboard and mouse reordering, canvas export with no CORS taint, reload persistence, and no horizontal overflow.
- **Never run against live services:** TMDB, Supabase, the migration, the save-to-link flow, the share page with real data, and the preview image route.

## Next steps

1. **Deploy on Hostinger.** It needs the Business web hosting plan or a Cloud plan.
   - hPanel → Websites → Add Website → Node.js web app → Import Git repository.
   - Connect GitHub as **niknojed** and select `my10films`.
   - Settings: framework preset Next.js, branch `main`, Node 22, build `npm run build`.
   - Set env vars before the first build. `NEXT_PUBLIC_*` values are fixed in at build time.
   - Every push to `main` redeploys automatically.
   - Don't use Hostinger's "Connect a database" wizard for Supabase. It sets the anon key, and this app needs `SUPABASE_SERVICE_ROLE_KEY`.
   - Unknown: whether the Business plan has enough build memory. An out-of-memory build failure means the app needs a Cloud plan.
2. **Environment variables:**
   - `TMDB_READ_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `HASH_SALT` (32+ random characters)
   - `NEXT_PUBLIC_SITE_URL` (live origin, no trailing slash)
   - `NEXT_PUBLIC_CONTACT_EMAIL`

   The maker runs with only the TMDB token. Without the Supabase values, share links return 503 and Most picked stays hidden.
3. **Supabase:** run `supabase/migrations/0001_init.sql` once in the SQL editor.
4. **TMDB logo:** download an approved logo from themoviedb.org/about/logos-attribution, save it as `public/tmdb.svg`, and place it where the comment in `src/app/about/page.tsx` marks the spot. It must be smaller than this site's own mark.
5. **TMDB API terms:** confirm the caching and image rules. Current caching is 1 hour for search and 1 day for film records.
6. **Live smoke test after deploy:** search, the poster export, a share link, the shared page and its preview image, and Most picked once there's data.
7. **Proxy headers:** IP hashing reads `x-forwarded-for`. Confirm Hostinger sets it and clients can't spoof it.

## Known gaps

- No moderation on the name and one-line fields shown on shared pages. They are length-capped and stripped of control characters only.
- No self-serve deletion of a shared list. Removal is by email request.
- No analytics.
- The domain and final name are undecided.

## Git setup on this Mac

- This repo pushes as **niknojed**. The Mac's Keychain holds a different GitHub login that can't push to `niknojed` repos.
- This repo is configured locally to avoid it:
  - The remote URL is `https://niknojed@github.com/niknojed/my10films.git`.
  - `.git/config` has `[credential] helper =`, which turns off the Keychain helper for this repo only.
- Pushes authenticate through VS Code's GitHub sign-in as niknojed.
- Don't change the global git credential config. Other repos on this Mac depend on it.
- `my10films.zip` in the folder is a leftover delivery copy, ignored through `.git/info/exclude`, and safe to delete.

## Working preferences for this project

- **Code:** production error handling, real state management, complete logic. Mobile-first, with keyboard and reduced-motion support from the first pass.
- **Design:** keep the existing tokens in `src/app/globals.css` and the type system: Big Shoulders Display, Schibsted Grotesk, DM Mono.
- **Copy:** plain and expert-to-expert. No marketing language. Avoid the "it's not X, it's Y" construction.
- **Decisions:** when there's a real fork, name both paths, the tradeoff, and a recommended pick.

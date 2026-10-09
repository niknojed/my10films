# SEO quick wins: homepage preview image, canonical + sitemap, explanatory content

Three high-impact, low-effort fixes from a live audit of my10films.com (Oct 9, 2026). Read the current code first. The UI has changed since this spec was written (list types, poster view, theme order), so match what's there and keep the existing tokens, fonts and components.

## Audit findings this fixes

- **No homepage preview image.** The homepage has no og:image, so links to my10films.com show up bare on social and in messages. Shared lists already have one (`src/app/l/[slug]/opengraph-image.tsx`).
- **No canonical tag and no sitemap.** `robots.ts` exists but doesn't point to a sitemap.
- **Very little readable content.** About 200 words, mostly interface labels. The only subheadings are "Pick", "Rank" and "Poster". Competing sites (my9movies.com, my9movies.net) have sections explaining the format and how to use it.

## 1. Homepage preview image

- Add `src/app/opengraph-image.tsx` at 1200×630, built with `ImageResponse` from `next/og`, Node runtime.
- Load the fonts the same way the shared-list image does: read the `.woff` files from `assets/` with `readFile(join(process.cwd(), "assets", ...))`. Fall back to no custom font if a read fails.
- Add `src/app/twitter-image.tsx` that re-exports the same image, `alt`, `size` and `contentType`.
- **Design:** use the default theme's colors, `POSTER_THEMES[INITIAL_STATE.theme]`, so the preview matches what first-time visitors see.
  - Left column, about 360px wide:
    - mono eyebrow "THE TEN FILMS THAT MADE" in the accent color
    - display word "YOU" at about 190px, weight 900
    - "MY10FILMS.COM" in mono, mute color, at the bottom
  - Right side: a 5×2 grid of empty poster frames, each 132×198 with a 12px gap. Use dashed outlines in the mute color with the numbers 1–10 in the display face, matching the empty slots in the app.
  - **No studio poster art in this image.** It's a site-wide image that isn't tied to anyone's list, and posters belong to their studios.
- **alt:** "My 10 Films: rank the ten films that made you and save the poster"
- **Check:** shared lists must keep their own preview image. The `/l/[slug]` image takes precedence over the root one; confirm both after the build.

## 2. Canonical tags and sitemap

- Add `alternates: { canonical: "/" }` to the homepage metadata, in `page.tsx` or the root layout's default.
- Add `/about` and `/privacy` canonicals in their own metadata. Leave `/l/` pages as they are: noindex.
- Add `src/app/sitemap.ts` listing `/`, `/about` and `/privacy` as absolute URLs from `siteUrl()`.
  - `changeFrequency`: weekly for the homepage, monthly for the others.
  - `lastModified`: use the build time.
- Add `sitemap: \`${siteUrl()}/sitemap.xml\`` to `robots.ts`.
- **Check the host:** confirm which of `my10films.com` and `www.my10films.com` serves the site, and that the other redirects to it with a 301 (`curl -sI`). `NEXT_PUBLIC_SITE_URL` must be that exact origin. If the redirect is missing, report it. That fix happens in Hostinger's settings, not in code.

## 3. Explanatory content below the tool

- **Server-render** a `<section>` in `page.tsx` after `<Maker>`, so the text is in the initial HTML.
- **Headings:** keep the one existing H1. Add H2s for each block below, with the questions as H3s.
- **Styling:** reuse the existing typography classes and tokens.
  - Running text at about 65 characters wide.
  - "How to make your poster" as an ordered list, since the order matters.
  - The ideas as a plain list with no numbers.
  - Mobile-first. Two columns are fine from roughly 61rem up.
- **Copy rules:**
  - Use the copy below as written; adjust only where the UI differs.
  - If a step mentions a control, use its current on-screen label.
  - No marketing language.
  - Don't use the "it's not X, it's Y" construction or its variants.

### What My 10 Films is

My 10 Films is a free poster maker for the films that shaped you. Search any film, put ten in order, and save one image sized for a feed post or a Story. There's no account. Your list stays in your browser until you choose to share it.

It's a film version of the "my 9 albums" format: one image that says something about you through what you chose. Pick the ten that made you, your all-time ten, or your ten favorites in one genre.

### How to make your poster

1. Search for a film by title and add it. Each film fills the next open slot.
2. Put them in order. Number 1 gets top billing, the largest poster on the default layout. Drag to reorder, or use the arrow buttons.
3. Open the poster, add your name or handle and one line if you want, pick a theme, and save it. Feed posters are 1800 × 2100 pixels. Story posters are 1080 × 1920.

### Ideas when you can't choose

- Start with the first film you remember seeing in a theater.
- Take one from each stage of your life: childhood, your teens, your twenties, the last few years.
- Choose the ten you'd show someone so they'd understand you.
- Keep the ones you've watched forty times. The films that made you don't have to be the best ones you've seen.

### Questions

**Do I need an account?**
No. Picking, ordering and saving all work without signing in.

**Why ten films?**
Ten leaves room to cover different eras and genres, and the ranked list at the bottom of the poster reads like a film's credits. Number 1 gets the largest slot.

**Where do the posters come from?**
Film titles, years and poster images come from TMDB (The Movie Database). Posters belong to their studios and distributors.

**What does a share link do?**
It saves your list to a public page anyone with the link can see. The page gets its own preview image when you post it.

**Can I change my list later?**
Yes. Your list is saved in this browser, so you can come back to reorder or swap films. A share link keeps the list as it was when you made the link. Make a new link after changes.

**Is this connected to my 9 albums?**
No. It's an independent site that uses the same format for film.

## Out of scope for this pass

- New title and meta description wording
- Per-genre landing pages
- An indexable Most picked page
- Structured data
- Analytics

## Done when

- `npm run typecheck`, `npm test` and `npm run build` pass.
- On a production build (`npm run build && npm start`), check:
  - `curl -s localhost:3000/ | grep -E 'og:image|twitter:image|rel="canonical"'` shows all three tags.
  - `/opengraph-image` and `/twitter-image` return 200 with `image/png`.
  - `/sitemap.xml` lists the three URLs as absolute links on the live origin.
  - `/robots.txt` includes the sitemap line.
  - A shared list's preview image still comes from its own route. Use any existing `/l/` slug, or skip this check if none exists locally.
- The new section looks right at 390px and 1280px wide in both light and dark themes, with no horizontal scrolling.
- Commit, push to `main` and let Hostinger redeploy. Then list the manual steps below.

## Manual steps for K after deploy

1. **Google Search Console:** add a Domain property for my10films.com and verify it with the DNS TXT record in Hostinger's DNS settings.
2. **Submit** `https://my10films.com/sitemap.xml`. Use URL Inspection on the homepage and click **Request indexing**.
3. **Check previews:** paste the homepage URL into the Facebook Sharing Debugger and the LinkedIn Post Inspector to confirm the image, and click **Scrape again** so they drop the old empty preview.

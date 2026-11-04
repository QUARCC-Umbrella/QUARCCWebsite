# QUARCC Website

Astro-based QUARCC website with:

- file-based blog content in `src/content/blog`
- local structured site data for teams, events, and portfolio fallbacks
- static Astro pages and layouts
- React islands only where interactivity is still useful (`AsciiLogoAnimation`, CLI footer, portfolio dashboards)

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
```

## Content Structure

- `src/content/blog/*.md`: blog posts with typed frontmatter
- `src/content/events/*.json`: event entries
- `src/content/teams/*.json`: team sections and members
- `src/content/portfolios/*.json`: rendered paper-fund fallback snapshots
- `src/data/site.ts`: shared page copy for home/about/join

## Blog Frontmatter

Each blog post supports:

- `title`
- `description`
- `pubDate`
- `updatedDate` optional
- `heroImage` optional
- `heroImageAlt` optional
- `tags` optional
- `draft` optional
- `featured` optional

## Live Paper Fund API

The strategy pipeline, holdings and market-data service live in the separate
[`QUARCC-Umbrella/quant-fund/live-strategies`](https://github.com/QUARCC-Umbrella/quant-fund/tree/main/live-strategies)
directory. This repo only renders the result. It currently serves two live
books: **QUARCC Market Neutral US Quant Fund** and **QUARCC US Long-Short
Equities** (the submitted Quarcc-black A-030 book).

The site fetches:

```text
${PUBLIC_PAPER_FUND_API_BASE}/portfolios
```

Set `PUBLIC_PAPER_FUND_API_BASE` to the deployed `live-strategies` API. If it
is unset, the page defaults to the same-origin `/portfolios` snapshot in
`Public/portfolios`, and `src/content/portfolios/quarcc-v4b.json` is the
build-time fallback.

The live service writes both files; the weekday Action in `quant-fund`
commits them here when `WEBSITE_REPO_TOKEN` is configured.

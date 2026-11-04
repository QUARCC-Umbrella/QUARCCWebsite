# QUARCC Website

Astro-based QUARCC website with:

- file-based blog content in `src/content/blog`
- local structured site data for teams, events, trophies, and portfolio fallbacks
- static Astro pages and layouts
- React islands only where interactivity is still useful (`AsciiLogoAnimation`, the fund pages in `src/components/fund/`)

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
- `src/content/trophies/*.json`: trophy entries
- `src/content/{home,about,join}`: page copy for home/about/join
- `src/content/portfolios/*.json`: rendered paper-fund fallback snapshots

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

## Research Papers

The PDFs linked from the blog are served from `Public/papers`. Their sources are in
`papers/*.tex`. After editing a source, run `python3 papers/build_papers.py` with a
local Chromium (`--chrome PATH`) to rebuild them with KaTeX. Nothing leaves the machine.

## Live Paper Fund API

The strategy pipeline, holdings and market-data service live in a separate
service. This repo only renders the result. It currently serves two paper books:
**QUARCC Market Neutral US Quant Fund** and **QUARCC US Long-Short Portfolio**.

The site fetches:

```text
${PUBLIC_PAPER_FUND_API_BASE}/portfolios
```

Set `PUBLIC_PAPER_FUND_API_BASE` to the deployed paper-fund API. If it
is unset, the page defaults to the same-origin `/portfolios.json` snapshot in
`Public/portfolios.json`, and `src/content/portfolios/market-neutral-us-equities.json` is the
build-time fallback.

The live service writes both files; the weekday Action in the pipeline repository
commits them here when `WEBSITE_REPO_TOKEN` is configured.

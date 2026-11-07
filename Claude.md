you are an SEO Expert Web dev.

update quarcc.com with the folder in new website look folder.

create a checklist to make sure everything gets done and then double check with screenshots to see if you are actually at the mock ups or different.
i want the website to keep all the current utilities.
make a sitemap, schema, and robots.txt to ensure the website stays indexable. ensuer the right pages are listed as articles so google expects them to change.

## Decisions (2026-11-07)

- Mockups: `new website look/QUARCC/*.svg` (homepage, About, Events, Blog, Teams, Trophies, Join, Paper funds), 1440px wide.
- Nav on every page: About / Events / Blog / Teams / Trophies / Paper funds + "Join QUARCC". Logo links to `/`.
- Home "Live strategies" shows the 2 real paper funds (live feed), not the mockup's 4 placeholder strategies.
- Home "Research that ships" shows the latest 3 blog posts.
- Unverified home claims hidden: alumni FIRM LOGO strip, "Apply for Winter 2027", "FIAM Finalists Fall 2026", "QUARCC Open", WRDS. Competition card/table come from trophies data.
- Copy follows the mockups (content JSON updated).
- Canonical domain: `https://www.quarcc.com`.
- Fonts: Instrument Serif (headings), Geist (body), Geist Mono (labels), all self-hosted in `Public/fonts`.
- Commit on `nic-edits-colours` once screenshots pass. No push.

## Checklist (status 2026-11-07)

### Design system
- [x] Global tokens, fonts, buttons, cards, chips, section headers (`src/styles/site.css`, `pages.css`)
- [x] Header: logo, nav with active state, Join QUARCC button, mobile menu
- [x] Footer: logo + tagline, Explore / Community / Contact, copyright, QUARCC watermark
- [x] Partner CTA ("We filter the signal from the noise.") on every page except 404
- [x] ASCII logo hero art (canvas, drawn from the logo) + home hero background (`Public/images/home-hero.webp`)

### Pages (match mockup)
- [x] Home `/`, About, Events, Blog, Teams, Trophies, Join, Paper funds
- [x] No mockup, restyled to match: blog post, fund fact sheet, `/faq`, 404

### Keep current utilities
- [x] Live paper-fund feed (polls API / `portfolios.json`), fund table, fact sheets
- [x] Blog posts with KaTeX, hero images, related posts; tags (now filterable on /blog)
- [x] Upcoming/past events split by date automatically
- [x] Trophy details (detail text, images, link) open inline ("Details +")
- [x] Team member email / LinkedIn / website links
- [x] FAQ page + FAQPage schema
- [x] `/news` redirects kept (noindex, absolute canonical, not linked, not in sitemap)

### SEO
- [x] `site` set; canonical (trailing slash, matches host), Open Graph, Twitter tags on every page
- [x] JSON-LD: Organization + WebSite (all pages), BlogPosting (posts), Report (an Article type) with daily dateModified (fund fact sheets), Event list, FAQPage, AboutPage, ContactPage, BreadcrumbList
- [x] `sitemap.xml` with lastmod (posts: updatedDate/pubDate, funds: last mark) and changefreq (funds daily)
- [x] `robots.txt` with Sitemap line
- [x] 404 page noindex, no canonical
- [x] No internal link to a missing page or a redirect (Markdown links get trailing slashes at build)

### Verify
- [x] `npm run build` passes; `astro check` 0 errors (was 25 before; added tsconfig.json); eslint clean
- [x] Screenshots at 1440px vs each mockup. Layout similarity (calibrated: unrelated mockup pages score 0.75-0.82):
  Home 0.89, About 0.95, Events 0.96, Blog 0.93, Teams 0.96, Trophies 0.94, Join 0.95, Paper funds 0.92.
  Home's gap is the intended content swaps (2 real funds instead of 4 placeholders, alumni strip hidden).
- [x] Mobile (390px) check, no horizontal overflow
- [x] Link check on built `dist/`

### Follow-ups for the owner
- [ ] `src/content/events/Fixed Income at Mackenzie Investments.json` has date `2026-04-31` (April has 30 days); it's left out of Event schema until fixed
- [ ] `algo-trading-with-python.json` links to `https://goo.gl/maps/example2` and `https://github.com/quarcc/algo-workshop`, which look like placeholders
- [ ] quarcc.com -> www.quarcc.com is a 302; make it a 301 at the DNS/CDN level
- [ ] Submit https://www.quarcc.com/sitemap.xml in Google Search Console after deploy

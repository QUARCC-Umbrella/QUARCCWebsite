# Vibe-Coded & "Claude-ifact" Audit

An inventory of design clichés, LLM prose tells, placeholder/broken data, leftover code from iterative AI rewrites, and repository debris across the QUARCC website.

---

## 1. Visual Design & Aesthetic ("Claude Dark-Editorial Starter Pack")

- **Typography & color triad (`src/styles/site.css` L3–57, L77):** Uses the ubiquitous AI dark-editorial pairing — **Instrument Serif** display headlines (`82px–88px`, `line-height: 0.9`), **Geist** body (`font-weight: 330`), and **Geist Mono** all-caps `11px` (`letter-spacing: 0.12em`) eyebrows — over dark purple-black (`#0a060e`), neon purple (`#b244d0`), lilac (`#c7add0`), and warm cream (`#efe6d6`).
- **Ambient purple radial-gradient "orb" glows everywhere:** The same `radial-gradient(closest-side, rgba(178, 68, 208, ...), transparent)` blob is stamped behind nearly every hero, feature card, and section:
  - `.page-hero::before` (`src/styles/site.css` L408–418)
  - `.card--glow::before` (`src/styles/site.css` L518–529)
  - `.partner__box::before` (`src/styles/site.css` L580–589)
  - `.home-research::after`, `.compete__feature::before`, `.home-people` (`src/styles/pages.css` L251–261, L335–343, L438)
  - `.thumb--g0`, `.thumb--g1`, `.thumb--g2`, `.thumb--lg` (`src/styles/pages.css` L817–845)
  - `.feature-card::before`, `.quote-card::before` (`src/styles/pages.css` L1121–1130, L1459–1467)
  - `.post-hero::before` (`src/styles/blog.css` L9–19)
  - `.fund-page::before` (`src/pages/paper-fund/[slug].astro` L84–94)
- **Glowing `.live-dot` badges on static content (`src/styles/site.css` L389–397):** Haloed purple indicator dots are placed next to static club status text (`"Workshops ongoing"`, `"Open for all students"` in `src/content/about/default.json` L57–66) and static path cards (`"The club"`, `"QRG"` in `src/pages/join.astro` L59), alongside the paper-fund cards (`src/components/fund/FundCards.jsx` L78, L104).
- **Glassmorphism / frosted-blur panels:** `.strategies` (`backdrop-filter: blur(24px)`, `box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45)`, `src/styles/pages.css` L82–93), `.research-card` (`backdrop-filter: blur(10px)`, `src/styles/pages.css` L284), and `.home-hero__halo` (`backdrop-filter: blur(5px)`, `src/styles/pages.css` L43–56).
- **Oversized faint footer watermark (`src/components/SiteFooter.astro` L52, `src/styles/site.css` L731–744):** `<div class="site-footer__mark" aria-hidden="true">QUARCC</div>` rendered at `min(384px, 30vw)` and `6.5%` opacity — the classic Vercel/Linear-clone footer cliché.
- **Zero-padded `01 / 02 / 03` counters everywhere:** Applied to Partner CTA items (`src/components/PartnerCta.astro` L28), FAQ items (`src/components/FaqList.astro` L19), and `"Three steps, no forms"` cards (`src/pages/join.astro` L87).
- **ASCII art on every surface + fake non-interactive terminal:**
  - Animated ASCII digit clouds on the home hero (`src/pages/index.astro` L49), hollow ASCII logos behind every inner-page hero (`src/components/PageHero.astro` L15), dithered ASCII area fills under every line chart (`src/components/fund/AsciiFill.jsx`), and synthetic ASCII digit-noise thumbnails with monospace slug pills (`factor-risk-qp`, `quarcc-purple`) on `/blog/` (`src/pages/blog/index.astro` L75–78, L102–105) instead of rendering the posts' actual `heroImage` charts/photos.
  - A decorative, non-functional terminal box on `/about/` (`src/pages/about.astro` L48–59, `src/styles/site.css` L816–873) showing `[user@quarcc ~]$` with a blinking CSS `.cursor` — a vestige of the old fastfetch-terminal concept in `Requirements.md` grafted onto a serif editorial site.
- **Dash-flanked mono labels, pill-chip clutter & repetitive layout template:**
  - `── Label ──` `.dash-label` dividers (`src/styles/site.css` L369–387) and hobby pill chips (`Puzzles`, `Chess`, `Anime`, `Music`, `Video games`, `Working out`) placed underneath a `50px` Instrument Serif pull-quote card (`src/pages/join.astro` L112–118, `src/content/join/default.json` L93–104).
  - Every inner page repeats the same `SectionHead` (`1fr 440px`) + `grid-2`/`grid-3`/`grid-4` hairline-bordered card formula, and `src/layouts/BaseLayout.astro` L95 stamps the identical glowing `PartnerCta` banner onto every page (including FAQ, blog posts, and fund fact sheets).
- **Half-reskinned legacy theme on Paper Fund Fact Sheets (`src/components/fund/fund.css`):** Still declares `@font-face` for `"Geist Serif"` (L1–6), Tailwind Zinc neutrals (`#fafafa`, `#e4e4e7`, `#a1a1aa`, `#71717a`, `#1f1f22`, `#0e0e10`, `#080808`, `#111114`, `#0d0c10`), and dead `var(--color-bg, #080808)` (L581). `src/styles/site.css` L938–953 (`/* Reskin the fund components (fund.css) to the new palette. */`) overrides only the CSS custom properties, leaving hardcoded `#fafafa` headings/cells, `#080808` sticky headers/columns, and `#0d0c10` disclosure boxes that clash with the `#0a060e` / `#efe6d6` theme.
- **Raw system emojis clashing with austere serif branding:** `🥇`, `🥈`, `🥉`, `🏆` rendered at `34px`/`26px` on `/trophies/` (`src/pages/trophies.astro` L74, L109; `src/styles/pages.css` L1139–1143, L1240–1242), plus `📊⚡` and `🏆📝` in event descriptions.

---

## 2. Copywriting & Prose ("Claude-isms" & AI Slop)

- **Quant/SaaS cliché taglines:**
  - `"We filter the signal from the noise"` (`src/components/PartnerCta.astro` L15)
  - `"Signal lost"` on the 404 page (`src/pages/404.astro` L8)
  - `"Made in Montréal"` footer badge (`src/components/SiteFooter.astro` L49)
  - `"Two halves, one club"` (`src/content/about/default.json` L75)
  - `"Three steps, no forms"` (`src/content/join/default.json` L70)
  - `"Speakers, workshops and the odd poker night"` and `"Who's been in the room"` (`src/pages/events.astro` L92, L142)
- **Pure LLM "academic framework" blog post (`src/content/blog/state-switching-theorem.md`):**
  - 15 numbered sections separated by `---` horizontal rules with zero empirical data, zero backtest results, zero code, and zero citations.
  - Title and description literally advertise it as `"A Scientific Framework..."` and `"A research-style overview..."` (L2–3).
  - Packed with LLM `"not merely X; rather Y"` antithesis and self-praise: `"not merely to classify historical regimes. Its goal is operational:"` (L33), `"Scientifically, this construction has several advantages. First,... Second,... Third,..."` (L108), `"not merely future regime probabilities"` (L217), `"a sophisticated and economically meaningful detection criterion"` (L227), `"Despite its sophistication, the framework carries important limitations. First,... Fifth,..."` (L323–333), `"a robust state-switch detection architecture that is both interpretable and operationally useful"` (L359).
- **Obvious AI LinkedIn-style write-up (`src/content/trophies/concordia-trading-cup-2025.json` L7):**
  - Uses hallmark LLM cadence: `"not just a collection of models, but a system where each component contributed a unique perspective"`, `"a meta-model that didn’t just average predictions; it learned how to listen"`, `"underscored that at the intersection of computer science and finance, outcomes hinge not only on modeling strength but also on the clarity of the narrative behind it"`, and `"On to the next one, with both the math and the message in mind."`
- **AI marketing buzzwords in event descriptions (`src/content/events/*.json`):**
  - `FX Algorithmic trading.json` L6: `"exclusive deep dive into the world of..."`, `"In an era where milliseconds matter..."`, `"leverages high-frequency data and sophisticated algorithms to navigate the global FX landscape"`, `"intersection of financial theory and software engineering"`.
  - `Fixed Income at Mackenzie Investments.json` L6: `"We are thrilled to welcome..."`, `"dive into the complexities of..."`, `"Whether you’re looking to... or curious about..., this is a session you won’t want to miss."`
  - `etf-market-making-national-bank.json` L6: `"Ever wonder what goes into... 📊⚡"`, `"incredibly excited to welcome..."`, `"build robust trading systems and navigate complex markets"`, `"intersection of coding, data science, and finance"`, `"level up your quant skills"`.
  - `quantitative-strategies-at-tdam.json` L6: `"We’re excited to welcome..."`, `"this is a talk you won’t want to miss."`
  - `python-for-data-analysis-workshop.json` L6: `"Stop wrestling with spreadsheets."`, `"Go from raw data to actionable insights faster than ever before."`
- **Uniform Claude-edited blog cadence & UK/US spelling drift:**
  - The three November 2026 posts (`factor-risk-quadratic-programming.md`, `quarcc-purple-market-neutral-us-equities.md`, `us-long-short-portfolio.md`) share identical `pubDate: 2026-11-02` / `updatedDate: 2026-11-04` timestamps and identical bold-lead-in `## Limitations` bullet lists.
  - British/Claude spellings (`optimisation`, `modelled`, `annualised`, `realisation`, `visualisation`, `centring`, `centred`, `colour`, `organised`, `Montréal`) are mixed inconsistently with American spellings (`Optimization`, `modeled`, `realized`, `monetize`, `penalize`, `favor`, `color`, `Montreal`) across pages, blog posts, and code comments.
- **Raw notes elevated to hero copy & copy-pasted sentences:**
  - The casual hobby list in `src/content/faq/default.json` L25 is promoted into a `50px` pull-quote card on the Join page (`src/content/join/default.json` L93–104).
  - `"The club hosts events. The research group is for those who want to constantly take on new projects."` is repeated nearly verbatim across `src/content/about/default.json` L77, `src/content/join/default.json` L20, and `src/content/faq/default.json` L33.

---

## 3. Content & Data Artifacts (Placeholders, Broken Dates & Mismatches)

- **Dummy seed event still live (`src/content/events/algo-trading-with-python.json` L7–10):** Contains placeholder values `location: "Math Building"`, `room: "M 202"`, `locationLink: "https://goo.gl/maps/example2"`, and `link: "https://github.com/quarcc/algo-workshop"`.
- **Invalid calendar date patched around in code instead of fixed:** `src/content/events/Fixed Income at Mackenzie Investments.json` L3 has `"date": "2026-04-31"` (April has 30 days). Instead of fixing the JSON, `src/lib/content.ts` L106–110 adds `isValidIsoDate` and `src/pages/events.astro` L14–15, L75 adds a workaround comment and filter.
- **Mismatched trophy filenames, typos & raw pasted LinkedIn text:**
  - `src/content/trophies/concordia-trading-cup-2025.json` holds `"McGill Financial Asset Management Hackathon ’25"`, not Concordia Trading Cup.
  - `src/content/trophies/hackathon-trophies-2025.json` holds `"McGill Financial Asset Management Hackathon ’24"` with a raw LinkedIn post pasted verbatim (`!!`, `🏆`, `📈`, `🫡`, `« ... »`, unpunctuated team list `our team(Valentino Magniette-Bosseboeuf Nicholas Cook Kenny Chavez Casey Jussaume Lucas Miranda)`).
  - `src/content/trophies/mchacks-xiii-2026.json` L7 contains the typo `"competeted"`.
  - `src/content/trophies/hec-trading-competition-2026.json` L7 ends in a stray `" \n\n ."`.
- **Copy-pasted dummy member emails (`src/content/teams/executives.json`, `qrg.json`, `sma.json`):** Almost every member has `"email": "sma@quarcc.com"`, forcing `src/components/MemberCard.astro` L5 to hide all member emails (`// Cards link to LinkedIn only; emails in the team data are not shown on the site.`), contradicting `Claude.md` L39.
- **Hardcoded trophy metrics (`src/pages/trophies.astro` L13–18):** Three of the four stat strip cards (`3×`, `$10,000`, `3rd`) are hardcoded directly in the Astro template rather than derived from `src/content/trophies/*.json`.
- **Inconsistent naming:** `gettrophies()` in `src/lib/content.ts` L78 breaks camelCase (unlike `getEvents`, `getTeams`, `getPortfolios`), and `src/content/events/` mixes kebab-case filenames with Title-Case-with-spaces filenames (`Fixed Income at Mackenzie Investments.json`, `FX Algorithmic trading.json`).

---

## 4. Code, CSS & SEO Over-Engineering

- **4,221 lines of magic-number CSS:** `src/styles/site.css` (1,121 lines), `src/styles/pages.css` (1,998 lines), and `src/components/fund/fund.css` (1,102 lines) rely heavily on exact 1440px mockup pixel constants (`padding-top: 212px`, `width: 1255px`, `margin-top: 87px`, `grid-template-columns: 420px 273px 274px 1fr`, `308px 1fr`, `aspect-ratio: 847 / 545`, `font-size: 14.5px`, `font-weight: 330` / `420`). `src/styles/pages.css` also has two consecutive `@media (max-width: 640px)` blocks (L1847 and L1878) and `!important` overrides (L643–652, L1412–1413).
- **Over-engineered decorative canvas scripts:**
  - `src/components/AsciiArt.astro` (417 lines): Implements a Mulberry32 PRNG, bilinear density-map resampling, two-pass separable box blur, value-noise billows, offscreen glyph sprite atlas, and `requestAnimationFrame` character re-roller just for faint background textures.
  - `src/components/fund/AsciiFill.jsx` (116 lines): Implements a 4×4 Bayer ordered-dither matrix and per-cell hash noise to render ASCII fills under sparklines.
- **Dead / orphaned code & broken asset references from earlier iterations:**
  - `src/components/fund/FundFactsheet.jsx` L23, L77–100 probes `DROP_CAP = "/images/initialis/q.png"` on every fact sheet load, but `Public/images/initialis/q.png` does not exist (silent 404).
  - `Public/fonts/GeistSerif-Regular.woff2` and the `@font-face` in `src/components/fund/fund.css` L1–6 are dead weight because `src/styles/site.css` L941 overrides `--fx-serif` with `"Instrument Serif"`.
  - `src/assets/team/grass.png` and `src/assets/team/linen.png` are unreferenced textures sitting in the team photos folder, swept up at build time by `import.meta.glob` in `src/components/MemberCard.astro` L17.
  - `README.md` L8 still references a deleted `AsciiLogoAnimation` React island.
- **Distinctive Claude code-comment voice:** Long, chatty, self-justifying explanations scattered throughout CSS and JS (e.g. `site.css` L420, L730, L737; `pages.css` L17–20, L1879–1886, L1924–1925; `fund.css` L1077, L1094–1096; `src/components/fund/format.js` L6).
- **LLM "SEO Expert" cargo-culting:** Triggered by `Claude.md` L1 (`"you are an SEO Expert Web dev."`), `src/pages/sitemap.xml.ts` L31–64 emits `<changefreq>` and `<priority>` tags (ignored by modern search engines like Google) alongside verbose JSON-LD graphs on every page.

---

## 5. Repository Hygiene (Literal AI Session Debris)

- **`Claude.md` committed at the repo root:** Contains the raw prompt (`"you are an SEO Expert Web dev."`), dated AI decision log, self-graded layout similarity scores (`Home 0.89, About 0.95...`), and an unchecked follow-up list.
- **`Requirements.md` committed at the repo root:** Contains an obsolete prompt from a previous design iteration (`"Replace all instances of the 'Omarchy green' with a darker vibrant purple"`, `"fastfetch.png"`, `"Interactive CLI"`, and a stray trailing quote `browser."-`).
- **Uncleaned mockup archives & case-insensitive directory hack:** `new website look/`, `new website look.zip`, `QUARCC (Copy) (1).zip`, and a loose `QUARCC logo.svg` remain in the repo root, while the capitalized `Public/` folder requires a `publicDir: "Public"` workaround in `astro.config.mjs` L15 so Linux builds do not break.

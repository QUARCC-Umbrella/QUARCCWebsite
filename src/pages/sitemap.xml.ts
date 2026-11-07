import type { APIRoute } from "astro";
import { fundUrl, getBlogPosts, getEvents, getPortfolios, gettrophies, isValidIsoDate, postUrl, toContentSlug } from "../lib/content";
import { LIVE_FUNDS } from "../lib/funds";
import { absoluteUrl } from "../lib/site";

// Built at deploy time. lastmod is only set where the content carries a real date;
// changefreq tells crawlers which pages move (fund pages re-mark every trading day).
type Entry = { path: string; lastmod?: Date; changefreq: string; priority: string };

const latest = (dates: (Date | undefined)[]) =>
  dates.filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime())).sort((a, b) => b.getTime() - a.getTime())[0];

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts();
  const events = (await getEvents()).map((entry) => entry.data);
  const trophies = (await gettrophies()).map((entry) => entry.data);
  const funds = (await getPortfolios()).filter((entry) => LIVE_FUNDS.includes(toContentSlug(entry.id)));

  const postDate = (post: (typeof posts)[number]) => post.data.updatedDate ?? post.data.pubDate;
  const fundDate = (fund: (typeof funds)[number]) => (fund.data.asOf ? new Date(fund.data.asOf) : undefined);
  const today = new Date();
  const pastOrToday = (d?: Date) => (d && d <= today ? d : undefined);

  const lastPost = latest(posts.map(postDate));
  const lastMark = latest(funds.map(fundDate));
  const lastEvent = pastOrToday(
    latest(events.filter((event) => isValidIsoDate(event.date)).map((event) => new Date(`${event.date}T00:00:00Z`))),
  );
  const lastTrophy = latest(trophies.map((trophy) => new Date(`${trophy.date}T00:00:00Z`)));

  const entries: Entry[] = [
    { path: "/", lastmod: latest([lastPost, lastMark]), changefreq: "daily", priority: "1.0" },
    { path: "/paper-fund/", lastmod: lastMark, changefreq: "daily", priority: "0.9" },
    ...funds.map((fund) => ({
      path: fundUrl(toContentSlug(fund.id)),
      lastmod: fundDate(fund),
      changefreq: "daily",
      priority: "0.8",
    })),
    { path: "/blog/", lastmod: lastPost, changefreq: "weekly", priority: "0.9" },
    ...posts.map((post) => ({
      path: postUrl(post.id),
      lastmod: postDate(post),
      changefreq: "monthly",
      priority: "0.8",
    })),
    { path: "/events/", lastmod: lastEvent, changefreq: "weekly", priority: "0.7" },
    { path: "/trophies/", lastmod: lastTrophy, changefreq: "monthly", priority: "0.7" },
    { path: "/about/", changefreq: "monthly", priority: "0.7" },
    { path: "/teams/", changefreq: "monthly", priority: "0.6" },
    { path: "/join/", changefreq: "monthly", priority: "0.7" },
    { path: "/faq/", changefreq: "monthly", priority: "0.5" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${absoluteUrl(entry.path)}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod.toISOString()}</lastmod>` : ""}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};

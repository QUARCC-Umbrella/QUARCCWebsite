import { getCollection } from "astro:content";

export function toContentSlug(id: string) {
  return id.replace(/\.(md|mdx|json)$/i, "");
}

function sortByOrder<T extends { id: string; data: Record<string, unknown> }>(items: T[]) {
  return items.sort(
    (left, right) =>
      Number(left.data.order ?? 0) - Number(right.data.order ?? 0) ||
      String(left.data.name ?? left.id).localeCompare(String(right.data.name ?? right.id)),
  );
}

export async function getBlogPosts() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  // Newest first; posts published the same day keep a stable alphabetical order.
  return posts.sort(
    (left, right) =>
      right.data.pubDate.getTime() - left.data.pubDate.getTime() || left.id.localeCompare(right.id),
  );
}

export async function getLatestBlogPosts(limit = 3) {
  const posts = await getBlogPosts();
  return posts.slice(0, limit);
}

export const postUrl = (id: string) => `/blog/${toContentSlug(id)}/`;
export const fundUrl = (slug: string) => `/paper-fund/${slug}/`;

export function postLabel(post: { id: string; data: { label?: string } }) {
  return post.data.label || toContentSlug(post.id);
}

// "Quantitative Finance" and "quantitative-finance" are the same tag.
export function tagSlug(tag: string) {
  return tag
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

export async function getEvents() {
  return sortByOrder(await getCollection("events"));
}

export async function getTeams() {
  return sortByOrder(await getCollection("teams"));
}

export async function getPortfolios() {
  return sortByOrder(await getCollection("portfolios"));
}

export async function getHomeContent() {
  const [entry] = await getCollection("home");
  return entry.data;
}

export async function getAboutContent() {
  const [entry] = await getCollection("about");
  return entry.data;
}

export async function getJoinContent() {
  const [entry] = await getCollection("join");
  return entry.data;
}

export async function getFaq() {
  const [entry] = await getCollection("faq");
  return entry.data.items;
}

export async function gettrophies() {
  const trophies = await getCollection("trophies");
  return trophies.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// "Nov 2, 2026" – the mono date style used on cards.
export function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Event dates are kept as "YYYY-MM-DD" strings and read by parts, so display never
// depends on the build machine's time zone.
export function dateParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m, day: d, monthName: MONTHS[(m || 1) - 1] };
}

export function isValidIsoDate(iso: string) {
  const { year, month, day } = dateParts(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Montreal is UTC-5 in winter, UTC-4 in summer (DST from the 2nd Sunday of March to the 1st Sunday of November).
export function montrealOffset(iso: string) {
  const { year, month, day } = dateParts(iso);
  const nthSunday = (m: number, n: number) => {
    const first = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + 7 * (n - 1);
  };
  const afterStart = month > 3 || (month === 3 && day >= nthSunday(3, 2));
  const beforeEnd = month < 11 || (month === 11 && day < nthSunday(11, 1));
  return afterStart && beforeEnd ? "-04:00" : "-05:00";
}

export function eventStart(event: { date: string; startTime: string }) {
  return `${event.date}T${event.startTime}:00${montrealOffset(event.date)}`;
}

export function eventEnd(event: { date: string; endTime: string }) {
  return `${event.date}T${event.endTime}:00${montrealOffset(event.date)}`;
}

export function season(iso: string) {
  const { year, month } = dateParts(iso);
  const name = month <= 4 ? "Winter" : month <= 8 ? "Summer" : "Fall";
  return `${name} ${year}`;
}

export function linkLabel(url?: string) {
  if (!url) return "";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("github.com")) return "GitHub";
  if (url.includes("linkedin.com")) return "LinkedIn";
  if (url.includes("discord")) return "Discord";
  return "Details";
}

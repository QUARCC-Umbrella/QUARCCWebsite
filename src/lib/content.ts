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
  return posts.sort(
    (left, right) => right.data.pubDate.getTime() - left.data.pubDate.getTime(),
  );
}

export async function getLatestBlogPosts(limit = 3) {
  const posts = await getBlogPosts();
  return posts.slice(0, limit);
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

export async function gettrophies() {
  return sortByOrder(await getCollection("trophies"));
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


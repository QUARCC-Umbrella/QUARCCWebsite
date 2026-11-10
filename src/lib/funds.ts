// Content entries in src/content/portfolios that are published as live funds.
// Any other entries in that folder are not published as live funds.
// Listed in display order.
export const LIVE_FUNDS = ["us-long-short-equities", "market-neutral-us-equities"];

export const byLiveOrder = <T extends { slug: string }>(a: T, b: T) =>
  LIVE_FUNDS.indexOf(a.slug) - LIVE_FUNDS.indexOf(b.slug);

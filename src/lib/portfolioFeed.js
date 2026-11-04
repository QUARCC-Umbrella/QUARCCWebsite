// The configured live API serves /portfolios. Without one, read the checked-in
// snapshot, which needs its extension: Amplify treats an extensionless path as a
// directory, so /portfolios redirects to /portfolios/ and 404s.
export const SNAPSHOT_URL = "/portfolios.json";

export function portfolioFeedUrl() {
  const configured = import.meta.env.PUBLIC_PAPER_FUND_API_BASE;
  return configured ? `${configured.replace(/\/$/, "")}/portfolios` : SNAPSHOT_URL;
}

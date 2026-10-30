import { useEffect, useState } from "react";
import PortfolioDetail from "./PortfolioDetail.jsx";

export default function PortfolioDetailClient({ portfolio }) {
  const [live, setLive] = useState(portfolio);

  useEffect(() => {
    const configured = import.meta.env.PUBLIC_PAPER_FUND_API_BASE;
    const apiBase = configured || window.location.origin;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`${apiBase.replace(/\/$/, "")}/portfolios`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : payload.portfolios || [];
        const found = items.find(
          (item) =>
            item.slug === portfolio.slug ||
            item.id === portfolio.id ||
            item.name === portfolio.name,
        );
        if (found) {
          setLive((current) => ({ ...current, ...found }));
        }
      } catch {
        // Keep the checked-in snapshot.
      }
    }

    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [portfolio.id, portfolio.name, portfolio.slug]);

  return <PortfolioDetail portfolio={live} />;
}

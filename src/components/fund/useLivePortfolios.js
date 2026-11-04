import { useEffect, useState } from "react";
import { portfolioFeedUrl } from "../../lib/portfolioFeed.js";

// Start from the build-time snapshot, then poll the live API (or the same-origin
// /portfolios.json snapshot) and merge whatever it returns over each entry.
export default function useLivePortfolios(initial) {
  const [portfolios, setPortfolios] = useState(initial);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(portfolioFeedUrl(), {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : payload.portfolios || [];
        setPortfolios((current) =>
          current.map((portfolio) => {
            const found = items.find(
              (item) => item.slug === portfolio.slug || item.id === portfolio.id || item.name === portfolio.name,
            );
            return found ? { ...portfolio, ...found } : portfolio;
          }),
        );
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
  }, []);

  return portfolios;
}

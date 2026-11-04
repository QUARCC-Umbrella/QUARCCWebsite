import React, { useEffect, useMemo, useState } from "react";
import PortfolioDashboard from "./PortfolioDashboard.jsx";
import { portfolioFeedUrl } from "../lib/portfolioFeed.js";
import "./PaperFundClient.css";

function normalizePortfolios(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.portfolios)) {
    return payload.portfolios;
  }

  return [];
}

function mergePortfolios(staticPortfolios, livePortfolios) {
  const liveMap = new Map(
    livePortfolios.map((portfolio) => [portfolio.slug || portfolio.id || portfolio.name, portfolio]),
  );

  return staticPortfolios.map((portfolio) => {
    const live =
      liveMap.get(portfolio.id) ||
      liveMap.get(portfolio.slug) ||
      liveMap.get(portfolio.name);

    if (!live) {
      return portfolio;
    }

    return {
      ...portfolio,
      name: live.name || portfolio.name,
      strategy: live.strategy || portfolio.strategy,
      status: live.status || portfolio.status,
      summary: live.summary || portfolio.summary,
      asOf: live.asOf || portfolio.asOf,
      exposures: live.exposures || portfolio.exposures,
      performance: live.performance || portfolio.performance,
      stats: {
        ...portfolio.stats,
        ...(live.stats || {}),
      },
      holdings: Array.isArray(live.holdings) ? live.holdings : portfolio.holdings,
      chartData: Array.isArray(live.chartData) ? live.chartData : portfolio.chartData,
    };
  });
}

export default function PaperFundClient({ portfolios = [], showDashboardHeader = true }) {
  const [livePortfolios, setLivePortfolios] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPortfolios() {
      setStatus("loading");
      setError("");

      try {
        const response = await fetch(portfolioFeedUrl(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Live API returned ${response.status}`);
        }

        const payload = await response.json();
        setLivePortfolios(normalizePortfolios(payload));
        setStatus("ready");
      } catch (loadError) {
        if (loadError.name === "AbortError") {
          return;
        }

        setStatus("error");
        setError(loadError.message || "Unable to load live portfolio data.");
      }
    }

    loadPortfolios();
    const timer = window.setInterval(loadPortfolios, 60_000);

    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, []);

  const mergedPortfolios = useMemo(
    () => mergePortfolios(portfolios, livePortfolios),
    [portfolios, livePortfolios],
  );

  return (
    <div className="paper-fund-live">
      <div className={`paper-fund-status paper-fund-status-${status}`}>
        {status === "loading" ? "Loading live portfolio data." : null}
        {status === "ready" ? "Live portfolio feed connected." : null}
        {status === "error"
          ? `${error} Static portfolio snapshots shown below.`
          : null}
      </div>

      <div className="paper-fund-grid">
        {mergedPortfolios.map((portfolio) => (
          <PortfolioDashboard
            key={portfolio.id}
            portfolio={portfolio}
            showHeader={showDashboardHeader}
          />
        ))}
      </div>
    </div>
  );
}

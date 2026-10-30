import React, { useMemo } from "react";
import "./PortfolioDashboard.css";
import PortfolioChart from "./PortfolioChart";

const PortfolioDashboard = ({ portfolio, showHeader = true }) => {
  const {
    name,
    strategy,
    status,
    stats,
    holdings,
    chartData,
    summary,
    asOf,
    exposures,
    performance,
  } = portfolio;
  const isLive = status === "Active";

  // Generate sample chart data if none provided (for demo)
  const processedChartData = useMemo(() => {
    if (chartData && chartData.length > 0) {
      return chartData;
    }

    // Generate sample equity curve for demo purposes
    const data = [];
    let equity = 1000000;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 30; i >= 0; i--) {
      const time = Math.floor((now - i * dayMs) / 1000);
      // Random walk with upward bias
      equity = equity * (1 + (Math.random() - 0.48) * 0.02);
      data.push({ time, value: equity });
    }

    // Add current point
    data.push({
      time: Math.floor(now / 1000),
      value: parseFloat(stats.equity.replace(/[$,]/g, "")) || equity,
    });

    return data;
  }, [chartData, stats.equity]);

  // Sort holdings by P/L (absolute value) and take top 5
  const topHoldings = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    return [...holdings]
      .sort((a, b) => Math.abs(parseFloat(b.pl)) - Math.abs(parseFloat(a.pl)))
      .slice(0, 5);
  }, [holdings]);

  // Helper to format P/L with color
  const formatPL = (pl) => {
    const num = parseFloat(pl);
    const isPositive = num >= 0;
    const formatted = Math.abs(num).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return {
      color: isPositive ? "#32cd32" : "#ff4444",
      display: `${isPositive ? "+" : "-"}$${formatted}`,
    };
  };

  return (
    <div className="portfolio-dashboard">
      {showHeader ? (
        <div className="portfolio-header">
          <div className="portfolio-heading">
            <h3 className="portfolio-title">{name}</h3>
            <p className="portfolio-strategy">{strategy}</p>
            <p className="portfolio-summary">{summary}</p>
            {asOf ? (
              <p className="portfolio-as-of">
                Live marks:{" "}
                {new Date(asOf).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                  timeZoneName: "short",
                })}
              </p>
            ) : null}
          </div>
          <span className={`portfolio-status ${isLive ? "" : "inactive"}`}>
            ● {status.toUpperCase()}
          </span>
        </div>
      ) : null}

      <div className="portfolio-stats">
        <div className="stat-item">
          <span className="stat-label">Total Equity</span>
          <span className="stat-value">{stats.equity}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Day Change</span>
          <span
            className="stat-value"
            style={{
              color: stats.dayChange.startsWith("+") ? "#32cd32" : "#ff5d73",
            }}
          >
            {stats.dayChange}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Sharpe Ratio</span>
          <span className="stat-value">{stats.sharpe}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Beta</span>
          <span className="stat-value">{stats.beta}</span>
        </div>
      </div>

      {exposures ? (
        <div className="portfolio-exposures">
          <span>Gross {(exposures.gross * 100).toFixed(0)}%</span>
          <span>
            Net {exposures.net >= 0 ? "+" : ""}
            {(exposures.net * 100).toFixed(1)}%
          </span>
          <span>{exposures.names} names</span>
          {performance?.annVol ? (
            <span>Vol {(performance.annVol * 100).toFixed(1)}%</span>
          ) : null}
          {performance?.maxDrawdown ? (
            <span>Max DD {(performance.maxDrawdown * 100).toFixed(1)}%</span>
          ) : null}
        </div>
      ) : null}

      <div className="portfolio-holdings">
        <h4 className="portfolio-section-title">Current Positions</h4>
        {topHoldings.length === 0 ? (
          <p className="portfolio-empty">No open positions</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Avg Price</th>
                <th>Current</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {topHoldings.map((pos, index) => {
                const plInfo = formatPL(pos.pl);
                return (
                  <tr key={index}>
                    <td>{pos.symbol}</td>
                    <td>
                      {Number(pos.qty).toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>${pos.avgPrice}</td>
                    <td>${pos.currentPrice}</td>
                    <td style={{ color: plInfo.color, fontWeight: "bold" }}>
                      {plInfo.display}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="portfolio-chart-container">
        <PortfolioChart
          data={processedChartData}
          height={220}
          accentColor="#58a6ff"
        />
      </div>
    </div>
  );
};

export default PortfolioDashboard;

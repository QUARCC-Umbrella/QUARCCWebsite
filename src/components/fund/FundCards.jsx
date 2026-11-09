import { useMemo } from "react";
import AsciiFill from "./AsciiFill.jsx";
import useLivePortfolios from "./useLivePortfolios.js";
import { NA, displayName, navBn, num, period, signed } from "./format.js";

const YEAR_MS = 365.25 * 864e5;

// Last 12 months of the daily NAV series (falls back to the whole series when shorter).
function lastYear(daily = []) {
  const rows = daily.filter((d) => Number.isFinite(d.fund));
  if (rows.length < 2) return rows;
  const end = Date.parse(rows[rows.length - 1].date);
  const cut = rows.filter((d) => Date.parse(d.date) >= end - YEAR_MS);
  return cut.length >= 2 ? cut : rows;
}

function AreaChart({ daily, width, height, tone, dot = false, glyph = 8 }) {
  const xy = useMemo(() => {
    const points = lastYear(daily);
    if (points.length < 2) return null;
    const values = points.map((d) => d.fund);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const t0 = Date.parse(points[0].date);
    const t1 = Date.parse(points[points.length - 1].date);
    const pad = 4;
    return points.map((d) => [
      ((Date.parse(d.date) - t0) / (t1 - t0 || 1)) * (width - (dot ? 8 : 0)),
      pad + (1 - (d.fund - lo) / (hi - lo || 1)) * (height - pad * 2 - 6),
    ]);
  }, [daily, width, height, dot]);
  const fill = useMemo(() => xy?.map(([x, y]) => [x / width, y / height]), [xy, width, height]);
  if (!xy) return <div style={{ height }} />;
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const stroke = tone === "lilac" ? "#d9c4e2" : "#c45be0";
  const [lx, ly] = xy[xy.length - 1];
  return (
    <div className="fc-chart">
      <AsciiFill points={fill} color={stroke} size={glyph} />
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        {dot ? <circle cx={lx} cy={ly} r="3.5" fill={stroke} /> : null}
      </svg>
    </div>
  );
}

function stats(portfolio) {
  const facts = portfolio.factsheet ?? {};
  const rows = facts.performance ?? [];
  return {
    nav: navBn(facts.keyFacts?.nav, 2),
    y1: period(rows, "1y").fund,
    ytd: period(rows, "YTD").fund,
    sharpe: facts.keyStatistics?.sharpe?.fund,
    asset: facts.keyFacts?.assetClass ?? portfolio.strategy,
    names: portfolio.exposures?.names,
    daily: facts.series?.daily ?? [],
  };
}

function oneDecimal(value) {
  return signed(value, 1);
}

export default function FundCards({ portfolios: initial, variant = "feature" }) {
  const portfolios = useLivePortfolios(initial);

  if (variant === "compact") {
    return (
      <div className="fc-compact">
        {portfolios.map((portfolio, index) => {
          const s = stats(portfolio);
          return (
            <a key={portfolio.slug} className="fc-mini" href={`/paper-fund/${portfolio.slug}/`}>
              <div className={`fc-mini__panel ${index % 2 ? "is-lilac" : ""}`}>
                <div className="fc-mini__top">
                  <span className="fc-live"><span className="live-dot" /> Live</span>
                  <span className="fc-mini__ret">
                    {oneDecimal(s.ytd)}
                    <small>YTD</small>
                  </span>
                </div>
                <AreaChart daily={s.daily} width={560} height={150} tone={index % 2 ? "lilac" : "purple"} dot glyph={7} />
              </div>
              <strong className="fc-mini__name">{displayName(portfolio.name)}</strong>
              <span className="fc-mini__meta">
                Sharpe {num(s.sharpe, 2)} · {s.asset} · {s.names ?? NA} names
              </span>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fc-feature">
      {portfolios.map((portfolio, index) => {
        const s = stats(portfolio);
        return (
          <article key={portfolio.slug} className={`fc-card ${index % 2 ? "is-lilac" : ""}`}>
            <div className="fc-card__top">
              <span className="fc-live"><span className="live-dot" /> Marked daily</span>
              <a className="fc-card__link" href={`/paper-fund/${portfolio.slug}/`}>
                Fact sheet <span className="arrow">→</span>
              </a>
            </div>
            <h2 className="fc-card__name">
              <a href={`/paper-fund/${portfolio.slug}/`}>{displayName(portfolio.name)}</a>
            </h2>
            <p className="fc-card__meta">
              {s.asset} · {s.names ?? NA} names
            </p>
            <div className="fc-card__stats">
              <div className="fc-nav">
                <strong>{s.nav}</strong>
                <span>NAV</span>
              </div>
              <div>
                <strong>{signed(s.y1, 2)}</strong>
                <span>1Y</span>
              </div>
              <div>
                <strong>{signed(s.ytd, 2)}</strong>
                <span>YTD</span>
              </div>
              <div>
                <strong>{num(s.sharpe, 2)}</strong>
                <span>Sharpe</span>
              </div>
            </div>
            <div className="fc-card__chart">
              <AreaChart daily={s.daily} width={524} height={120} tone={index % 2 ? "lilac" : "purple"} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

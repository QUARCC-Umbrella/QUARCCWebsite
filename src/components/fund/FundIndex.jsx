import useLivePortfolios from "./useLivePortfolios.js";
import { displayName, level, marksStamp, num, parsePct, pct, period, signed, tone } from "./format.js";
import "./fund.css";

function Spark({ daily }) {
  if (!daily?.length) return null;
  const last = Date.parse(daily[daily.length - 1].date);
  const points = daily.filter((d) => Date.parse(d.date) >= last - 365.25 * 864e5 && Number.isFinite(d.fund));
  if (points.length < 2) return null;
  const values = points.map((d) => d.fund);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const w = 112;
  const h = 32;
  const t0 = Date.parse(points[0].date);
  const path = points
    .map((d, i) => {
      const x = ((Date.parse(d.date) - t0) / (last - t0 || 1)) * w;
      const y = h - 2 - ((d.fund - lo) / (hi - lo || 1)) * (h - 4);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join("");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg className="fxi-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={path} fill="none" stroke={up ? "#d1baff" : "#ff8fa0"} strokeWidth="1.4" />
    </svg>
  );
}

const COLUMNS = [
  ["Level", "level"],
  ["1D", "day"],
  ["YTD", "ytd"],
  ["1Y", "y1"],
  ["Since inc., ann.", "si"],
  ["Volatility", "vol"],
  ["Sharpe", "sharpe"],
  ["Max DD", "dd"],
];

function rowFor(portfolio) {
  const facts = portfolio.factsheet ?? {};
  const rows = facts.performance ?? [];
  const day = parsePct(portfolio.stats?.dayChange);
  return {
    level: { text: level(facts.keyFacts?.nav) },
    day: { text: signed(day, 2), tone: tone(day) },
    ytd: { text: signed(period(rows, "YTD").fund, 2), tone: tone(period(rows, "YTD").fund) },
    y1: { text: signed(period(rows, "1y").fund, 2), tone: tone(period(rows, "1y").fund) },
    si: { text: signed(period(rows, "Since inception").fund, 2), tone: tone(period(rows, "Since inception").fund) },
    vol: { text: pct(facts.keyStatistics?.volatility?.fund, 1) },
    sharpe: { text: num(facts.keyStatistics?.sharpe?.fund, 2) },
    dd: { text: pct(facts.keyStatistics?.maxDrawdown?.fund, 1), tone: "is-neg" },
  };
}

export default function FundIndex({ portfolios: initial }) {
  const portfolios = useLivePortfolios(initial);
  const latest = portfolios.map((p) => p.asOf).filter(Boolean).sort().pop();

  return (
    <div className="fxi-table" role="table" aria-label="QUARCC paper funds">
      <div className="fxi-row fxi-head" role="row">
        <span role="columnheader">Fund</span>
        {COLUMNS.map(([name]) => (
          <span key={name} role="columnheader">
            {name}
          </span>
        ))}
        <span role="columnheader">1Y trend</span>
      </div>
      {portfolios.map((portfolio) => {
        const row = rowFor(portfolio);
        return (
          <a key={portfolio.slug} className="fxi-row" role="row" href={`/paper-fund/${portfolio.slug}`}>
            <span className="fxi-name" role="cell">
              <strong>{displayName(portfolio.name)}</strong>
              <small>
                {portfolio.factsheet?.keyFacts?.assetClass ?? portfolio.strategy} ·{" "}
                {portfolio.exposures?.names ?? "—"} names
              </small>
            </span>
            {COLUMNS.map(([name, key]) => (
              <span key={key} role="cell" className={`fxi-cell ${row[key].tone ?? ""}`} data-label={name}>
                {row[key].text}
              </span>
            ))}
            <span role="cell" className="fxi-trend">
              <Spark daily={portfolio.factsheet?.series?.daily} />
            </span>
          </a>
        );
      })}
      <p className="fxi-stamp">
        Marks {marksStamp(latest)} · Returns after modelled costs · Level is growth of 100 since
        inception
      </p>
    </div>
  );
}

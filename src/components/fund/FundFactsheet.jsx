import { useEffect, useState } from "react";
import FundChart from "./FundChart.jsx";
import { SNAPSHOT_URL } from "../../lib/portfolioFeed.js";
import {
  displayName,
  navBn,
  liveSince as liveSinceOf,
  longDate,
  marksStamp,
  num,
  parsePct,
  pct,
  period,
  signed,
  titleCase,
  tone,
} from "./format.js";
import "./fund.css";

const COLORS = { fund: "#d1baff", benchmark: "#c9a86a", sp500: "#7c7c86" };
const DROP_CAP = "/images/initialis/q.png";

const SECTIONS = [
  ["overview", "Overview"],
  ["performance", "Performance"],
  ["risk", "Risk"],
  ["holdings", "Holdings"],
  ["exposure", "Exposure"],
  ["mandate", "Mandate"],
];

function Section({ id, title, aside, children }) {
  return (
    <section className="fx-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="fx-section-head">
        <h2 id={`${id}-title`}>{title}</h2>
        {aside ? <span className="fx-section-aside">{aside}</span> : null}
      </header>
      {children}
    </section>
  );
}

function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0][0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    SECTIONS.forEach(([id]) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);
  return (
    <nav className="fx-nav" aria-label="Fact sheet sections">
      <ul>
        {SECTIONS.map(([id, name]) => (
          <li key={id}>
            <a href={`#${id}`} aria-current={active === id ? "true" : undefined}>
              {name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DropCap({ text }) {
  // The initial is an exported Initialis PNG; without it the paragraph reads as normal text.
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const image = new Image();
    image.onload = () => setOk(true);
    image.src = DROP_CAP;
  }, []);
  if (!ok || !/^q/i.test(text)) return <p className="fx-lede">{text}</p>;
  return (
    <p className="fx-lede has-cap">
      <img
        className="fx-cap"
        src={DROP_CAP}
        alt=""
        width="96"
        height="96"
        style={{ shapeOutside: `url("${DROP_CAP}")` }}
      />
      <span className="sr-only">{text[0]}</span>
      {text.slice(1)}
    </p>
  );
}

function Quote({ portfolio, facts, liveSince }) {
  const rows = facts.performance;
  const day = parsePct(portfolio.stats?.dayChange);
  const items = [
    ["YTD", period(rows, "YTD").fund],
    ["1 year", period(rows, "1y").fund],
    ["Since inception, ann.", period(rows, "Since inception").fund],
    [liveSince ? `Since ${longDate(liveSince)} (live)` : "Since formation", portfolio.performance?.sinceFormation],
  ];
  return (
    <div className="fx-quote">
      <div className="fx-quote-main">
        <span className="fx-label">Net asset value · US$1bn at inception</span>
        <div className="fx-quote-row">
          <span className="fx-level">{navBn(facts.keyFacts?.nav)}</span>
          <span className={`fx-change ${tone(day)}`}>
            {day === null ? "—" : `${day >= 0 ? "▲" : "▼"} ${signed(day, 2)}`}
            <small>1 day</small>
          </span>
        </div>
        <span className="fx-stamp">
          Marks {marksStamp(portfolio.asOf)} · USD · Total return after modelled costs
        </span>
      </div>
      <dl className="fx-quote-stats">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={tone(value)}>{signed(value, 2)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Facts({ portfolio, facts, liveSince }) {
  const k = facts.keyFacts;
  const rows = [
    ["Asset class", k.assetClass],
    ["Strategy", portfolio.strategy],
    ["Benchmark", k.benchmark],
    ["Inception (simulated)", k.inception],
    ["Live since", liveSince ? longDate(liveSince) : "—"],
    ["Holdings", k.holdings],
    ["Gross / net", k.grossNet],
    ["Rebalancing", k.rebalancing],
    ["Est. costs", `${pct(facts.costs.total, 2)} of NAV a year`],
    ["Turnover, one way", `About ${pct(facts.costs.turnover, 0)} a year`],
  ].filter(([, value]) => value);
  return (
    <dl className="fx-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const isSp500 = (name) => /s&p\s*500/i.test(name ?? "");

// Fund, benchmark and the S&P 500, without repeating the S&P when it is the benchmark.
function seriesFor(benchmarkName) {
  return isSp500(benchmarkName)
    ? [["fund", "Fund"], ["benchmark", "S&P 500 (benchmark)"]]
    : [["fund", "Fund"], ["benchmark", "Benchmark"], ["sp500", "S&P 500"]];
}

function ReturnsTable({ rows, series: SERIES }) {
  const cumulative = ["1m", "3m", "6m", "YTD", "1y"];
  const annual = ["3y", "5y", "Since inception"];
  const head = { "1m": "1M", "3m": "3M", "6m": "6M", YTD: "YTD", "1y": "1Y", "3y": "3Y", "5y": "5Y", "Since inception": "Since inc." };
  const cell = (key, series) => period(rows, key)[series];
  const excess = (key) => {
    const r = period(rows, key);
    return r.fund === undefined || r.benchmark === undefined ? null : r.fund - r.benchmark;
  };
  return (
    <div className="fx-scroll">
      <table className="fx-table fx-table-wide">
        <thead>
          <tr className="fx-group">
            <th />
            <th colSpan={cumulative.length}>Cumulative</th>
            <th colSpan={annual.length}>Annualised</th>
          </tr>
          <tr>
            <th scope="col">Return</th>
            {[...cumulative, ...annual].map((key) => (
              <th key={key} scope="col" className={key === "3y" ? "fx-split" : undefined}>
                {head[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERIES.map(([series, name]) => (
            <tr key={series} className={series === "fund" ? "is-fund" : undefined}>
              <th scope="row">{name}</th>
              {[...cumulative, ...annual].map((key) => (
                <td key={key} className={`${tone(cell(key, series))} ${key === "3y" ? "fx-split" : ""}`}>
                  {pct(cell(key, series), 2)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="is-excess">
            <th scope="row">Excess vs benchmark</th>
            {[...cumulative, ...annual].map((key) => (
              <td key={key} className={`${tone(excess(key))} ${key === "3y" ? "fx-split" : ""}`}>
                {signed(excess(key), 2)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CalendarTable({ calendar, series: SERIES }) {
  const years = Object.keys(calendar.fund);
  return (
    <div className="fx-scroll">
      <table className="fx-table fx-table-wide">
        <thead>
          <tr>
            <th scope="col">Calendar year</th>
            {years.map((year, i) => (
              <th key={year} scope="col">
                {year}
                {i === years.length - 1 ? <sup>YTD</sup> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERIES.map(([series, name]) => (
            <tr key={series} className={series === "fund" ? "is-fund" : undefined}>
              <th scope="row">{name}</th>
              {years.map((year) => (
                <td key={year} className={tone(calendar[series]?.[year])}>
                  {pct(calendar[series]?.[year], 2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskTable({ facts, series: SERIES }) {
  const spBench = !SERIES.some(([key]) => key === "sp500");
  const s = facts.keyStatistics;
  const t = facts.top;
  const rows = [
    ["Volatility, annualised", s.volatility, pct],
    ["Sharpe ratio", s.sharpe, (v) => num(v, 2)],
    ["Sortino ratio", { fund: t.sortino, sp500: t.sp500?.sortino, benchmark: spBench ? t.sp500?.sortino : null }, (v) => num(v, 2)],
    ["Max drawdown", s.maxDrawdown, pct],
    ["Worst month", s.maxMonthLoss, pct],
    ["Worst day", s.maxDayLoss, pct],
    ["Ulcer index", { fund: t.ulcer, sp500: t.sp500?.ulcer, benchmark: spBench ? t.sp500?.ulcer : null }, pct],
  ];
  return (
    <div className="fx-scroll">
      <table className="fx-table">
        <thead>
          <tr>
            <th scope="col">Since inception</th>
            {SERIES.map(([series, name]) => (
              <th key={series} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, values, format]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {SERIES.map(([series]) => (
                <td key={series} className={series === "fund" ? "is-fund" : undefined}>
                  {format(values?.[series] ?? null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Relative({ facts }) {
  const s = facts.keyStatistics;
  const t = facts.top;
  const rows = [
    ["Beta, monthly", num(s.betaMonthly, 2)],
    ["Beta, daily", num(s.betaDaily, 2)],
    ["Alpha, a year", `${signed(s.alpha, 2)}${s.alphaT || t.alphaT ? ` · t ${num(s.alphaT ?? t.alphaT, 2)}` : ""}`],
    ["Tracking error vs benchmark", pct(s.trackingError, 2)],
    ["Upside capture", pct(t.upsideCapture, 0)],
    ["Downside capture", pct(t.downsideCapture, 0)],
  ];
  return (
    <dl className="fx-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function drawdown(daily, key) {
  let peak = -Infinity;
  return daily
    .filter((d) => Number.isFinite(d[key]))
    .map((d) => {
      peak = Math.max(peak, d[key]);
      return { date: d.date, value: d[key] / peak - 1 };
    });
}

function MarketState({ state }) {
  const groups = [
    ["S&P 500 return in the month", state.sp500Month],
    ["S&P 500 vs its 10-month average", state.sp500Trend],
    ["VIX level", state.vixRange],
  ].filter(([, rows]) => rows?.length);
  const max = Math.max(...groups.flatMap(([, rows]) => rows.map((r) => Math.abs(r.value || 0))), 0.001);
  return (
    <div className="fx-bars">
      {groups.map(([title, rows]) => (
        <div key={title} className="fx-bars-group">
          <h4>{title}</h4>
          {rows.map((row) => (
            <div className="fx-bar-row" key={row.label}>
              <span>{row.label}</span>
              <div className="fx-bar-track">
                <i
                  className={row.value >= 0 ? "is-pos" : "is-neg"}
                  style={{
                    left: row.value >= 0 ? "50%" : `${50 - (Math.abs(row.value) / max) * 50}%`,
                    width: `${(Math.abs(row.value) / max) * 50}%`,
                  }}
                />
              </div>
              <strong className={tone(row.value)}>{signed(row.value, 1)}</strong>
              <em>{row.months} mo</em>
            </div>
          ))}
        </div>
      ))}
      <p className="fx-note">
        Return above the benchmark, percentage points a year, grouped by the market state at the
        prior month-end.
      </p>
    </div>
  );
}

function Holdings({ topHoldings, side }) {
  const rows = topHoldings[side];
  const total = rows.reduce((acc, row) => acc + row.weight, 0);
  return (
    <div className="fx-holdings">
      <div className="fx-holdings-head">
        <h3>Top 10 {side}</h3>
        <span>{pct(total, 1)} of NAV</span>
      </div>
      <table className="fx-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Ticker</th>
            <th scope="col">Company</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.symbol}>
              <td className="fx-rank">{i + 1}</td>
              <th scope="row" className="fx-ticker">{row.symbol}</th>
              <td className="fx-company">{titleCase(row.name)}</td>
              <td className={tone(row.weight)}>{pct(row.weight, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sectors({ rows }) {
  const max = Math.max(...rows.flatMap((r) => [Math.abs(r.long), Math.abs(r.short)]), 0.01);
  return (
    <div className="fx-sectors">
      <div className="fx-sector-row fx-sector-head" aria-hidden="true">
        <span />
        <span>Short</span>
        <span>Long</span>
        <span>Net</span>
      </div>
      {rows.map((row) => (
        <div className="fx-sector-row" key={row.sector}>
          <span>{row.sector}</span>
          <div className="fx-sector-bar is-short">
            <i style={{ width: `${(Math.abs(row.short) / max) * 100}%` }} />
          </div>
          <div className="fx-sector-bar is-long">
            <i style={{ width: `${(Math.abs(row.long) / max) * 100}%` }} />
          </div>
          <strong className={tone(row.net)}>{signed(row.net, 2)}</strong>
        </div>
      ))}
      <p className="fx-note">% of NAV by GICS sector. Net is long minus short.</p>
    </div>
  );
}

function Constraints({ rows }) {
  const label = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  return (
    <div className="fx-scroll">
      <table className="fx-table">
        <thead>
          <tr>
            <th scope="col">Constraint</th>
            <th scope="col">Limit</th>
            <th scope="col">Fund</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(rows).map(([key, row]) => (
            <tr key={key}>
              <th scope="row">{label(key)}</th>
              <td>{row.limit}</td>
              <td>{row.fund}</td>
              <td className={row.ok ? "fx-ok" : "fx-breach"}>{row.ok ? "✓ Within" : "✕ Breach"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FundFactsheet({ portfolio }) {
  const facts = portfolio.factsheet;
  if (!facts) return <p className="fx-empty">Fact-sheet data is not available yet.</p>;

  const liveSince = liveSinceOf(portfolio);
  const daily = facts.series.daily || facts.series.growth || [];
  const exposures = portfolio.exposures ?? {};
  const benchmarkName = facts.keyFacts?.benchmark ?? "Benchmark";
  const series = seriesFor(benchmarkName);
  const spIsBenchmark = isSp500(benchmarkName);

  return (
    <article className="fx">
      <header className="fx-hero">
        <p className="fx-kicker">
          <span>QUARCC</span>
          <span>Paper fund</span>
          <span className="fx-status">
            <i /> {portfolio.status}
          </span>
        </p>
        <h1>{displayName(portfolio.name)}</h1>
        <Quote portfolio={portfolio} facts={facts} liveSince={liveSince} />
      </header>

      <SectionNav />

      <Section id="overview" title="Overview">
        <div className="fx-overview">
          <div>
            <FundChart
              label="Growth of US$1bn since the start of the range"
              height={340}
              rebase
              ranges
              liveSince={liveSince}
              toggles={[
                { key: "benchmark", on: true },
                ...(spIsBenchmark ? [] : [{ key: "sp500", on: false }]),
              ]}
              yFormat={(v) => `$${(v / 100).toFixed(1)}bn`}
              tipFormat={(v) => `$${(v / 100).toFixed(3)}bn`}
              series={[
                { key: "fund", name: "Fund", color: COLORS.fund, width: 2, data: daily.map((d) => ({ date: d.date, value: d.fund })) },
                { key: "benchmark", name: benchmarkName, color: COLORS.benchmark, dash: true, data: daily.map((d) => ({ date: d.date, value: d.benchmark })) },
                ...(spIsBenchmark
                  ? []
                  : [{ key: "sp500", name: "S&P 500", color: COLORS.sp500, data: daily.map((d) => ({ date: d.date, value: d.sp500 })) }]),
              ]}
            />
            <p className="fx-note">
              Growth of US$1bn, rebased to the start of the selected range.
              {liveSince ? ` Shaded: live marks since ${longDate(liveSince)}; earlier values are simulated.` : ""}
            </p>
          </div>
          <aside className="fx-overview-side">
            <DropCap text={portfolio.summary} />
            <Facts portfolio={portfolio} facts={facts} liveSince={liveSince} />
            <a className="fx-download" href={SNAPSHOT_URL} download="quarcc-paper-funds.json">
              Download data (JSON)
            </a>
          </aside>
        </div>
      </Section>

      <Section id="performance" title="Performance" aside={`As of ${facts.asOf}`}>
        <ReturnsTable rows={facts.performance} series={series} />
        <h3 className="fx-sub">Calendar-year returns</h3>
        <CalendarTable calendar={facts.calendar} series={series} />
        <div className="fx-disclosure" role="note">
          <strong>Simulated performance.</strong> Returns from {facts.inception}
          {liveSince ? ` to ${longDate(liveSince)}` : ""} are an out-of-sample simulation, after
          modelled trading and borrow costs.
          {liveSince ? ` From ${longDate(liveSince)} the book is marked daily against live US equity prices.` : ""}{" "}
          This is a paper portfolio: no capital is invested. Past performance does not guarantee
          future results.
        </div>
      </Section>

      <Section id="risk" title="Risk">
        <div className="fx-split-2">
          <div>
            <RiskTable facts={facts} series={series} />
          </div>
          <div>
            <h3 className="fx-sub fx-sub-flush">Relative to the S&amp;P 500</h3>
            <Relative facts={facts} />
          </div>
        </div>
        <h3 className="fx-sub">Drawdown</h3>
        <FundChart
          label="Drawdown from the running peak"
          height={200}
          baseline={0}
          liveSince={liveSince}
          toggles={[{ key: "sp500", on: true }]}
          yFormat={(v) => `${(v * 100).toFixed(0)}%`}
          tipFormat={(v) => `${(v * 100).toFixed(2)}%`}
          series={[
            { key: "fund", name: "Fund", color: COLORS.fund, width: 2, data: drawdown(daily, "fund") },
            { key: "sp500", name: "S&P 500", color: COLORS.sp500, data: drawdown(daily, "sp500") },
          ]}
        />
        {facts.marketState ? (
          <>
            <h3 className="fx-sub">Return vs benchmark by market state</h3>
            <MarketState state={facts.marketState} />
          </>
        ) : null}
      </Section>

      <Section id="holdings" title="Holdings" aside={facts.keyFacts?.holdings}>
        <div className="fx-split-2">
          <Holdings topHoldings={facts.topHoldings} side="longs" />
          <Holdings topHoldings={facts.topHoldings} side="shorts" />
        </div>
      </Section>

      <Section id="exposure" title="Exposure">
        <dl className="fx-chips">
          {[
            ["Gross", pct(exposures.gross, 1)],
            ["Net", signed(exposures.net, 1)],
            ["Long", pct(Math.abs(exposures.long ?? NaN), 1)],
            ["Short", pct(Math.abs(exposures.short ?? NaN), 1)],
            ["Names", exposures.names ?? "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <Sectors rows={facts.sectorExposure} />
      </Section>

      <Section id="mandate" title="Mandate">
        <p className="fx-objective">
          Outperform the benchmark, {benchmarkName}, with a long/short portfolio of US equities built from machine-learning return forecasts, inside the limits
          below.
        </p>
        <Constraints rows={facts.constraints} />
      </Section>

      <footer className="fx-footer">
        <p>
          {portfolio.name}. Paper portfolio for research and education; not an offer or
          investment advice. Simulated from {facts.inception}
          {liveSince ? `, live marks from ${longDate(liveSince)}` : ""}.
        </p>
        <p>Marks {marksStamp(portfolio.asOf)}</p>
      </footer>
    </article>
  );
}

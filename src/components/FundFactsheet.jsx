import "./FundFactsheet.css";

const pct = (value, digits = 2) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "—"
    : `${(value * 100).toFixed(digits)}%`;
const signed = (value, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "—"
    : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
const num = (value, digits = 2) =>
  value === null || value === undefined || Number.isNaN(value) ? "—" : value.toFixed(digits);
const usd = (value) =>
  value === null || value === undefined ? "—" : `US$${value.toFixed(3)}bn`;

function Section({ title, children, className = "" }) {
  return (
    <section className={`fund-section ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function LineChart({ series, height = 220, yFormat = (v) => v.toFixed(2), area = false }) {
  const values = series.flatMap((s) => s.data.map((d) => d.value)).filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.08 || Math.abs(hi || 1) * 0.05;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const width = 620;
  const top = 12;
  const bottom = height - 26;
  const left = 54;
  const right = width - 12;
  const n = Math.max(...series.map((s) => s.data.length), 1);
  const x = (i) => left + (i / Math.max(n - 1, 1)) * (right - left);
  const y = (v) => top + (1 - (v - yMin) / (yMax - yMin || 1)) * (bottom - top);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin));
  const first = series[0]?.data ?? [];
  const labelAt = (i) => (first[i]?.date ?? "").slice(0, 7);
  const fundPath = first
    .map((point, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(" ");
  const areaPath = fundPath
    ? `${fundPath} L${x(first.length - 1).toFixed(1)},${bottom} L${left},${bottom} Z`
    : "";

  return (
    <div className="fund-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              x2={right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="rgba(255,255,255,0.07)"
              strokeDasharray="3 4"
            />
            <text x={left - 8} y={y(tick) + 3} textAnchor="end" className="fund-axis">
              {yFormat(tick)}
            </text>
          </g>
        ))}
        {area && areaPath ? <path d={areaPath} fill="rgba(209, 186, 255, 0.10)" /> : null}
        {series.map((line) => (
          <path
            key={line.name}
            d={line.data
              .map((point, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.value).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke={line.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fund-axis">
            {labelAt(i)}
          </text>
        ))}
      </svg>
      <div className="fund-legend">
        {series.map((line) => (
          <span key={line.name}>
            <i style={{ background: line.color }} /> {line.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="fund-metric">
      <span className="fund-metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="fund-metric-sub">{sub}</span>
    </div>
  );
}

function Constraints({ rows }) {
  return (
    <table className="fund-table fund-constraints">
      <thead>
        <tr>
          <th>Constraint</th>
          <th>Mandate limit</th>
          <th>Fund</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(rows).map(([key, row]) => (
          <tr key={key}>
            <td>{key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</td>
            <td>{row.limit}</td>
            <td className={row.ok ? "fund-ok" : "fund-warn"}>{row.fund}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Performance({ rows }) {
  return (
    <table className="fund-table fund-performance">
      <thead>
        <tr>
          <th>Period</th>
          <th>Fund</th>
          <th>Benchmark</th>
          <th>S&amp;P 500</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.period}>
            <td>{row.period}</td>
            <td>{pct(row.fund, 2)}</td>
            <td>{pct(row.benchmark, 2)}</td>
            <td>{pct(row.sp500, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Calendar({ calendar }) {
  const years = Object.keys(calendar.fund);
  return (
    <table className="fund-table fund-calendar">
      <thead>
        <tr>
          <th>Calendar year</th>
          <th>Fund</th>
          <th>Benchmark</th>
          <th>S&amp;P 500</th>
        </tr>
      </thead>
      <tbody>
        {years.map((year) => (
          <tr key={year}>
            <td>{year}</td>
            <td>{pct(calendar.fund[year], 2)}</td>
            <td>{pct(calendar.benchmark[year], 2)}</td>
            <td>{pct(calendar.sp500[year], 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopHoldings({ topHoldings }) {
  const sum = (rows) => rows.reduce((acc, row) => acc + row.weight, 0);
  const table = (rows, title) => (
    <div className="fund-holdings-col">
      <div className="fund-holdings-head">
        <h4>{title}</h4>
        <span>{pct(sum(rows), 2)}</span>
      </div>
      <table className="fund-table">
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.symbol}>
              <td className="fund-rank">{index + 1}</td>
              <td>
                <strong>{row.symbol}</strong>
                {row.name ? <span className="fund-name">{row.name}</span> : null}
              </td>
              <td>{pct(row.weight, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="fund-holdings">
      {table(topHoldings.longs, "Longs")}
      {table(topHoldings.shorts, "Shorts")}
    </div>
  );
}

function KeyFacts({ facts }) {
  return (
    <dl className="fund-dl">
      <div>
        <dt>Asset class</dt>
        <dd>{facts.assetClass}</dd>
      </div>
      <div>
        <dt>Inception date</dt>
        <dd>{facts.inception}</dd>
      </div>
      <div>
        <dt>Net assets (NAV)</dt>
        <dd>{usd(facts.nav)}</dd>
      </div>
      <div>
        <dt>Benchmark</dt>
        <dd>{facts.benchmark}</dd>
      </div>
      <div>
        <dt>Holdings</dt>
        <dd>{facts.holdings}</dd>
      </div>
      <div>
        <dt>Gross / net exposure</dt>
        <dd>{facts.grossNet}</dd>
      </div>
    </dl>
  );
}

function Costs({ costs }) {
  return (
    <dl className="fund-dl">
      <div>
        <dt>Trading costs</dt>
        <dd>{pct(costs.trading, 2)} of NAV a year</dd>
      </div>
      <div>
        <dt>Borrow costs</dt>
        <dd>{pct(costs.borrow, 2)} of NAV a year</dd>
      </div>
      <div>
        <dt>Total costs</dt>
        <dd>{pct(costs.total, 2)} of NAV a year</dd>
      </div>
      <div>
        <dt>Turnover (one way)</dt>
        <dd>About {pct(costs.turnover, 0)} a year</dd>
      </div>
    </dl>
  );
}

function KeyStatistics({ stats }) {
  const rows = [
    ["Ending value", "endingValue", usd],
    ["Cumulative return", "cumulative", pct],
    ["Return, CAGR", "cagr", pct],
    ["Volatility", "volatility", pct],
    ["Sharpe ratio", "sharpe", (v) => num(v, 2)],
    ["Max drawdown", "maxDrawdown", pct],
    ["Max one-month loss", "maxMonthLoss", pct],
    ["Max one-day loss", "maxDayLoss", pct],
  ];
  return (
    <>
      <table className="fund-table fund-stats">
        <thead>
          <tr>
            <th />
            <th>Fund</th>
            <th>Benchmark</th>
            <th>S&amp;P 500</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, key, format]) => (
            <tr key={key}>
              <td>{label}</td>
              <td>{format(stats[key].fund)}</td>
              <td>{format(stats[key].benchmark)}</td>
              <td>{format(stats[key].sp500)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="fund-dl fund-stats-extra">
        <div>
          <dt>Tracking error vs benchmark</dt>
          <dd>{pct(stats.trackingError, 2)} a year</dd>
        </div>
        <div>
          <dt>Alpha vs S&amp;P 500 (s.e.)</dt>
          <dd>
            {pct(stats.alpha, 2)} a year
            {stats.alphaT ? ` · t-stat ${num(stats.alphaT, 2)}` : ""}
          </dd>
        </div>
        <div>
          <dt>Beta vs S&amp;P 500, monthly</dt>
          <dd>{num(stats.betaMonthly, 2)}</dd>
        </div>
        <div>
          <dt>Beta vs S&amp;P 500, daily</dt>
          <dd>{num(stats.betaDaily, 2)}</dd>
        </div>
      </dl>
    </>
  );
}

function MarketState({ state }) {
  const groups = [
    { title: "S&P 500 return in the month", rows: state.sp500Month },
    { title: "S&P 500 vs its 10-month average", rows: state.sp500Trend },
    { title: "VIX range (z-score)", rows: state.vixRange || [] },
  ].filter((group) => group.rows.length > 0);
  const max = Math.max(
    ...groups.flatMap((group) => group.rows.map((row) => Math.abs(row.value || 0))),
    0.001,
  );
  return (
    <div className="fund-market">
      {groups.map((group) => (
        <div key={group.title} className="fund-market-group">
          <h4>{group.title}</h4>
          {group.rows.map((row) => (
            <div className="fund-market-row" key={row.label}>
              <span>{row.label}</span>
              <div className="fund-market-bar">
                <i
                  className={row.value >= 0 ? "pos" : "neg"}
                  style={{
                    left: row.value >= 0 ? "50%" : `${50 - (Math.abs(row.value || 0) / max) * 48}%`,
                    width: `${(Math.abs(row.value || 0) / max) * 48}%`,
                  }}
                />
              </div>
              <strong>{signed(row.value, 1)}</strong>
              <em>{row.months}m</em>
            </div>
          ))}
        </div>
      ))}
      <p className="fund-note">
        Percentage points a year above the benchmark. State at the prior month-end; S&amp;P
        buckets are terciles of the live sample, VIX buckets use the fact-sheet thresholds.
      </p>
    </div>
  );
}

function SectorBars({ rows }) {
  const max = Math.max(...rows.map((row) => Math.abs(row.net)), 0.02);
  return (
    <div className="fund-sectors">
      {rows.map((row) => (
        <div className="fund-sector-row" key={row.sector}>
          <span>{row.sector}</span>
          <div className="fund-sector-track">
            <i
              className={row.net >= 0 ? "pos" : "neg"}
              style={{
                left: row.net >= 0 ? "50%" : `${50 - (Math.abs(row.net) / max) * 48}%`,
                width: `${(Math.abs(row.net) / max) * 48}%`,
              }}
            />
          </div>
          <strong>{signed(row.net, 2)}</strong>
        </div>
      ))}
      <p className="fund-note">Long minus short, % of NAV, by GICS sector.</p>
    </div>
  );
}

function Capture({ capture }) {
  const rows = [
    { name: "QUARCC Fund", ...capture.fund, accent: true },
    { name: "S&P 500", ...capture.sp500 },
  ];
  return (
    <div className="fund-capture">
      <div className="fund-capture-head">
        <span />
        <span>Up months</span>
        <span>Down months</span>
      </div>
      {rows.map((row) => (
        <div className="fund-capture-row" key={row.name}>
          <span>{row.name}</span>
          <strong className={row.up >= 0 ? "pos" : "neg"}>{signed(row.up, 1)}</strong>
          <strong className={row.down >= 0 ? "pos" : "neg"}>{signed(row.down, 1)}</strong>
        </div>
      ))}
      <p className="fund-note">Share of the S&amp;P 500 move captured in up and down months.</p>
    </div>
  );
}

export default function FundFactsheet({ portfolio }) {
  const facts = portfolio.factsheet;
  if (!facts) {
    return <p className="fund-empty">Fact-sheet data is not available yet.</p>;
  }
  const top = facts.top;
  const live = portfolio.stats;
  const growth = facts.series.daily || facts.series.growth;

  return (
    <div className="fund-sheet">
      <header className="fund-head">
        <div>
          <p className="fund-kicker">QUARCC · Fund fact sheet</p>
          <h1>{portfolio.name}</h1>
          <p className="fund-sub">
            {portfolio.strategy} · Out-of-sample results, January 2021 – present · Benchmark:
            3-month US T-bills + 4% a year
          </p>
        </div>
        <div className="fund-asof">
          <span>As at {facts.asOf}</span>
          <strong>Live paper fund</strong>
          <em>
            Marks: {new Date(portfolio.asOf).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/New_York",
              timeZoneName: "short",
            })}
          </em>
        </div>
      </header>

      <div className="fund-hero">
        <div className="fund-hero-main">
          <Section title="Growth of NAV since inception (US$bn)" className="fund-hero-section">
            <LineChart
              height={320}
              area
              series={[
                { name: "QUARCC Fund", color: "#d1baff", data: growth.map((d) => ({ date: d.date, value: d.fund })) },
                { name: "Benchmark: T-bills + 4%", color: "#f0b429", data: growth.map((d) => ({ date: d.date, value: d.benchmark })) },
                { name: "S&P 500", color: "#71717a", data: growth.map((d) => ({ date: d.date, value: d.sp500 })) },
              ]}
              yFormat={(v) => `$${v.toFixed(1)}bn`}
            />
          </Section>
        </div>
        <aside className="fund-hero-side">
          <div className="fund-hero-stats">
            <Metric label="Net assets" value={live.equity} sub="Paper NAV" />
            <Metric label="Day change" value={live.dayChange} sub="Live marks" />
            <Metric label="Sharpe ratio" value={live.sharpe} sub="Since inception" />
            <Metric label="Beta, monthly" value={live.beta} sub="vs S&P 500" />
          </div>
          <Section title="Calendar year returns">
            <Calendar calendar={facts.calendar} />
          </Section>
          <p className="fund-hero-note">
            Since inception {pct(facts.keyStatistics.cumulative.fund, 1)} · CAGR {pct(top.cagr, 1)} ·
            Vol {pct(top.volatility, 1)} · Max DD {pct(top.maxDrawdown, 1)}
          </p>
        </aside>
      </div>

      <div className="fund-metrics">
        <Metric label="Sortino ratio" value={num(top.sortino, 2)} sub={`S&P 500: ${num(top.sp500?.sortino, 2)}`} />
        <Metric label="Downside capture" value={pct(top.downsideCapture, 0)} sub="S&P 500: 100%" />
        <Metric label="Upside capture" value={pct(top.upsideCapture, 0)} sub="S&P 500: 100%" />
        <Metric label="Ulcer index" value={pct(top.ulcer, 2)} sub={`S&P 500: ${pct(top.sp500?.ulcer, 2)}`} />
        <Metric label="CAGR" value={pct(top.cagr, 1)} sub={`Benchmark: ${pct(top.benchmark?.cagr, 1)}`} />
        <Metric label="Sharpe ratio" value={num(top.sharpe, 2)} sub={`S&P 500: ${num(top.sp500?.sharpe, 2)}`} />
        <Metric label="Volatility" value={pct(top.volatility, 1)} sub={`S&P 500: ${pct(top.sp500?.volatility, 1)}`} />
        <Metric label="Max drawdown" value={pct(top.maxDrawdown, 1)} sub={`S&P 500: ${pct(top.sp500?.maxDrawdown, 1)}`} />
        <Metric label="Beta, monthly" value={num(top.betaMonthly, 2)} sub={`Daily: ${num(facts.keyStatistics.betaDaily, 2)}`} />
        <Metric
          label="Alpha, a year"
          value={pct(top.alpha, 2)}
          sub={`vs S&P 500${top.alphaT ? ` · t-stat ${num(top.alphaT, 2)}` : ""}`}
        />
      </div>

      <div className="fund-grid">
        <main className="fund-main">
          <Section title="Mandate & statement of investment policy">
            <p className="fund-objective">
              Track and outperform the benchmark, 3-month US T-bills + 4% a year, with a
              market-neutral long/short portfolio of US equities built from machine-learning
              return forecasts.
            </p>
            <Constraints rows={facts.constraints} />
          </Section>

          <div className="fund-pair">
            <Section title="Capture of the S&P 500, 2021–26">
              <Capture capture={facts.series.capture} />
            </Section>
            <Section title="Rolling 12-month Ulcer index (%)">
              <LineChart
                height={190}
                series={[
                  { name: "QUARCC Fund", color: "#d1baff", data: facts.series.ulcer.fund.map((d) => ({ date: d.date, value: d.value * 100 })) },
                  { name: "S&P 500", color: "#71717a", data: facts.series.ulcer.sp500.map((d) => ({ date: d.date, value: d.value * 100 })) },
                ]}
                yFormat={(v) => `${v.toFixed(1)}`}
              />
            </Section>
          </div>

          <Section title="Performance (%)">
            <Performance rows={facts.performance} />
            <p className="fund-note">
              Returns in %. 1m–1y cumulative; 3y, 5y and since inception annualised.
            </p>
          </Section>

          <Section title="Top 10 holdings (% of net assets)">
            <TopHoldings topHoldings={facts.topHoldings} />
          </Section>
        </main>

        <aside className="fund-side">
          <Section title="Key facts">
            <KeyFacts facts={facts.keyFacts} />
          </Section>
          <Section title="Costs">
            <Costs costs={facts.costs} />
            <p className="fund-note">Model estimate; actual costs vary with turnover and borrow.</p>
          </Section>
          <Section title="Key statistics">
            <KeyStatistics stats={facts.keyStatistics} />
          </Section>
          <Section title="Return vs benchmark by market state">
            <MarketState state={facts.marketState} />
          </Section>
          <Section title="Sector exposure (%)">
            <SectorBars rows={facts.sectorExposure} />
          </Section>
        </aside>
      </div>

      <footer className="fund-footer">
        <span>
          {portfolio.name} · Simulated performance from {facts.inception}, after all costs. Past
          performance does not guarantee future results.
        </span>
        <span>Live marks: {new Date(portfolio.asOf).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/New_York",
          timeZoneName: "short",
        })}</span>
      </footer>
    </div>
  );
}

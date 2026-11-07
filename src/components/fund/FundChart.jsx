import { useEffect, useMemo, useRef, useState } from "react";
import { NA, shortDate, longDate } from "./format.js";

const RANGES = [
  { key: "1Y", years: 1 },
  { key: "3Y", years: 3 },
  { key: "5Y", years: 5 },
  { key: "Max", years: null },
];

function useWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

function niceTicks(lo, hi, count) {
  const span = hi - lo || Math.abs(hi) || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) ticks.push(v);
  return ticks;
}

function nearest(times, t) {
  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid;
    else hi = mid;
  }
  return Math.abs(times[lo] - t) <= Math.abs(times[hi] - t) ? lo : hi;
}

/**
 * Time-scaled line chart. Each series is { key, name, color, data: [{ date, value }] }.
 * With `rebase`, every series is indexed to 100 at the start of the selected range.
 */
export default function FundChart({
  series,
  height = 320,
  rebase = false,
  ranges = false,
  toggles = [],
  liveSince = null,
  yFormat = (v) => v.toFixed(0),
  tipFormat = yFormat,
  baseline = null,
  label,
}) {
  const [ref, width] = useWidth(720);
  const [range, setRange] = useState("Max");
  const [hidden, setHidden] = useState(() => new Set(toggles.filter((t) => !t.on).map((t) => t.key)));
  const [hover, setHover] = useState(null);

  const compact = width < 520;
  const pad = { top: 14, right: compact ? 8 : 12, bottom: 26, left: compact ? 40 : 52 };

  const view = useMemo(() => {
    const visible = series.filter((s) => !hidden.has(s.key) && s.data.length);
    const all = series[0]?.data ?? [];
    const last = all.length ? Date.parse(all[all.length - 1].date) : 0;
    const years = RANGES.find((r) => r.key === range)?.years;
    const from = years ? last - years * 365.25 * 864e5 : -Infinity;
    const lines = visible.map((s) => {
      const points = s.data
        .map((d) => ({ t: Date.parse(d.date), date: d.date, value: d.value }))
        .filter((d) => d.t >= from && Number.isFinite(d.value));
      const base = rebase && points.length ? points[0].value : null;
      return {
        ...s,
        points: base ? points.map((d) => ({ ...d, value: (d.value / base) * 100 })) : points,
      };
    });
    const values = lines.flatMap((l) => l.points.map((p) => p.value));
    if (baseline !== null) values.push(baseline);
    const times = lines.flatMap((l) => l.points.map((p) => p.t));
    if (!values.length) return null;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const margin = (hi - lo) * 0.06 || 1;
    return {
      lines,
      t0: Math.min(...times),
      t1: Math.max(...times),
      y0: lo - margin,
      y1: hi + margin,
    };
  }, [series, hidden, range, rebase, baseline]);

  if (!view) return null;

  const { lines, t0, t1, y0, y1 } = view;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = (t) => pad.left + ((t - t0) / (t1 - t0 || 1)) * plotW;
  const y = (v) => pad.top + (1 - (v - y0) / (y1 - y0 || 1)) * plotH;
  const yTicks = niceTicks(y0, y1, compact ? 4 : 5);
  const xCount = compact ? 3 : 5;
  const xTicks = Array.from({ length: xCount }, (_, i) => t0 + (i / (xCount - 1)) * (t1 - t0));
  const liveT = liveSince ? Date.parse(liveSince) : null;
  const showLive = liveT && liveT > t0 && liveT < t1;
  const lead = lines[0];
  const leadTimes = lead?.points.map((p) => p.t) ?? [];

  function onMove(event) {
    if (!lead?.points.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const t = t0 + ((event.clientX - box.left - pad.left) / plotW) * (t1 - t0);
    const index = nearest(leadTimes, t);
    const at = lead.points[index].t;
    setHover({
      t: at,
      date: lead.points[index].date,
      rows: lines.map((l) => {
        const p = l.points[nearest(l.points.map((q) => q.t), at)];
        return { key: l.key, name: l.name, color: l.color, value: p?.value };
      }),
    });
  }

  const toggle = (key) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <figure className="fx-chart" aria-label={label}>
      {ranges || toggles.length ? (
        <div className="fx-chart-controls">
          {ranges ? (
            <div className="fx-seg" role="group" aria-label="Range">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={range === r.key}
                  onClick={() => setRange(r.key)}
                >
                  {r.key}
                </button>
              ))}
            </div>
          ) : null}
          <div className="fx-legend">
            {series.map((s) => {
              const toggleable = toggles.some((t) => t.key === s.key);
              const off = hidden.has(s.key);
              return toggleable ? (
                <button
                  key={s.key}
                  type="button"
                  className="fx-legend-item"
                  aria-pressed={!off}
                  onClick={() => toggle(s.key)}
                >
                  <i style={{ background: s.color }} data-dash={s.dash ? "" : undefined} /> {s.name}
                </button>
              ) : (
                <span key={s.key} className="fx-legend-item">
                  <i style={{ background: s.color }} data-dash={s.dash ? "" : undefined} /> {s.name}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="fx-chart-plot" ref={ref}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={label}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {showLive ? (
            <g className="fx-live-band">
              <rect x={x(liveT)} y={pad.top} width={Math.max(0, pad.left + plotW - x(liveT))} height={plotH} />
              <line x1={x(liveT)} x2={x(liveT)} y1={pad.top} y2={pad.top + plotH} />
              <text x={x(liveT) - 6} y={pad.top + 11} textAnchor="end">
                Live
              </text>
            </g>
          ) : null}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line className="fx-grid" x1={pad.left} x2={pad.left + plotW} y1={y(tick)} y2={y(tick)} />
              <text className="fx-axis" x={pad.left - 8} y={y(tick) + 3.5} textAnchor="end">
                {yFormat(tick)}
              </text>
            </g>
          ))}
          {baseline !== null ? (
            <line className="fx-baseline" x1={pad.left} x2={pad.left + plotW} y1={y(baseline)} y2={y(baseline)} />
          ) : null}
          {xTicks.map((tick, i) => (
            <text
              key={tick}
              className="fx-axis"
              x={x(tick)}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            >
              {shortDate(tick)}
            </text>
          ))}
          {[...lines].reverse().map((line) => (
            <path
              key={line.key}
              d={line.points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join("")}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width ?? 1.5}
              strokeDasharray={line.dash ? "4 3" : undefined}
              strokeLinejoin="round"
            />
          ))}
          {hover ? (
            <g className="fx-hover">
              <line x1={x(hover.t)} x2={x(hover.t)} y1={pad.top} y2={pad.top + plotH} />
              {hover.rows.map((row) =>
                Number.isFinite(row.value) ? (
                  <circle key={row.key} cx={x(hover.t)} cy={y(row.value)} r="3.5" fill={row.color} />
                ) : null,
              )}
            </g>
          ) : null}
        </svg>
        {hover ? (
          <div
            className="fx-tip"
            style={{
              left: Math.min(Math.max(x(hover.t), 80), width - 80),
            }}
          >
            <strong>{longDate(hover.date)}</strong>
            {hover.rows.map((row) => (
              <span key={row.key}>
                <i style={{ background: row.color }} />
                {row.name}
                <b>{Number.isFinite(row.value) ? tipFormat(row.value) : NA}</b>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </figure>
  );
}

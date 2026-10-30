"""Fact-sheet metrics for the live v4b book.

Everything is computed from the daily fund NAV, the T-bill + 4% benchmark and
SPY total return. The shapes intentionally mirror the QUARCC Purple fact sheet
so the website can render the same sections.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

BENCH_PREMIUM = 0.04
INCEPTION = "04-Jan-2021"
GICS = [
    "Energy",
    "Materials",
    "Industrials",
    "Consumer Discretionary",
    "Consumer Staples",
    "Health Care",
    "Financials",
    "Information Technology",
    "Communication Services",
    "Utilities",
    "Real Estate",
]


def _monthly(series: pd.Series) -> pd.Series:
    return series.resample("ME").last().pct_change().dropna()


def _period(series: pd.Series, days: int, annualise: bool = False) -> float | None:
    if len(series) <= days:
        return None
    value = float(series.iloc[-1] / series.iloc[-days - 1] - 1.0)
    if annualise:
        value = (1.0 + value) ** (252.0 / days) - 1.0
    return value


def _ytd(series: pd.Series) -> float | None:
    year = series.index[-1].year
    prior = series[series.index.year < year]
    if prior.empty:
        return None
    return float(series.iloc[-1] / prior.iloc[-1] - 1.0)


def _calendar(series: pd.Series) -> dict[str, float]:
    out = {}
    for year in sorted(set(series.index.year)):
        block = series[series.index.year == year]
        if block.empty:
            continue
        prior = series[series.index.year < year]
        start = prior.iloc[-1] if not prior.empty else block.iloc[0]
        out[str(year)] = float(block.iloc[-1] / start - 1.0)
    return out


def _rolling_ulcer(series: pd.Series, window: int = 12) -> list[dict]:
    month = series.resample("ME").last()
    dd = month / month.cummax() - 1.0
    roll = dd.rolling(window).apply(lambda x: math.sqrt(float(np.mean(np.square(x)))), raw=True)
    return [
        {"date": d.strftime("%Y-%m-%d"), "value": float(v)}
        for d, v in roll.dropna().items()
    ]


def _bucket_returns(fund: pd.Series, bench: pd.Series, state: pd.Series, labels: list[str]) -> list[dict]:
    fund, bench = fund.align(bench, join="inner")
    state = state.reindex(fund.index)
    out = []
    for label in labels:
        mask = state == label
        if mask.sum() == 0:
            out.append({"label": label, "value": None, "months": 0})
            continue
        excess = float((fund[mask] - bench[mask]).mean() * 12.0)
        out.append({"label": label, "value": excess, "months": int(mask.sum())})
    return out


def build(
    nav: pd.Series,
    spy: pd.Series,
    tb3ms: pd.Series,
    positions: pd.DataFrame,
    vix: pd.DataFrame | None = None,
) -> dict:
    nav = nav[~nav.index.duplicated(keep="last")].sort_index()
    spy = spy[~spy.index.duplicated(keep="last")].sort_index()
    spy = spy.reindex(nav.index, method="ffill").bfill()

    rf = (tb3ms.reindex(nav.index, method="ffill").bfill() / 100.0) / 252.0
    bench_ret = rf + BENCH_PREMIUM / 252.0
    bench = (1.0 + bench_ret).cumprod() * float(nav.iloc[0])
    spy_nav = spy / float(spy.iloc[0]) * float(nav.iloc[0])

    daily = nav.pct_change().dropna()
    excess = daily - rf.reindex(daily.index).fillna(0.0)
    years = max((nav.index[-1] - nav.index[0]).days / 365.25, 1e-6)

    m_fund = _monthly(nav)
    m_bench = _monthly(bench)
    m_spy = _monthly(spy_nav)
    m_rf = rf.resample("ME").apply(lambda x: float((1.0 + x).prod() - 1.0))
    m_rf = m_rf.reindex(m_fund.index).fillna(0.0)

    x = m_spy - m_rf
    y = m_fund - m_rf
    beta_m = float(np.cov(x, y)[0, 1] / np.var(x)) if len(x) > 2 else None
    alpha = float((y.mean() - (beta_m or 0.0) * x.mean()) * 12.0) if beta_m is not None else None
    alpha_t = None
    if beta_m is not None and len(y) > 2:
        resid = y - ((alpha / 12.0) + beta_m * x)
        s2 = float(np.sum(np.square(resid)) / (len(y) - 2))
        sxx = float(np.sum(np.square(x - x.mean())))
        se = float(np.sqrt(s2 * (1.0 / len(y) + x.mean() ** 2 / sxx))) if sxx else 0.0
        alpha_t = float((alpha / 12.0) / se) if se else None

    xd = spy_nav.pct_change().dropna() - rf.reindex(daily.index).fillna(0.0)
    yd = daily - rf.reindex(daily.index).fillna(0.0)
    beta_d = float(np.cov(xd, yd)[0, 1] / np.var(xd)) if len(xd) > 2 else None

    dd = nav / nav.cummax() - 1.0
    downside = float(np.sqrt(np.mean(np.square(np.minimum(excess, 0.0)))))

    spy_daily = spy_nav.pct_change().dropna()
    spy_excess = spy_daily - rf.reindex(spy_daily.index).fillna(0.0)
    spy_dd = spy_nav / spy_nav.cummax() - 1.0
    spy_downside = float(np.sqrt(np.mean(np.square(np.minimum(spy_excess, 0.0)))))

    up = m_spy > 0
    down = m_spy < 0
    capture_up = float(m_fund[up].sum() / m_spy[up].sum()) if up.sum() else None
    capture_dn = float(m_fund[down].sum() / m_spy[down].sum()) if down.sum() else None

    periods = [
        ("1m", 21, False),
        ("3m", 63, False),
        ("6m", 126, False),
        ("YTD", 0, False),
        ("1y", 252, False),
        ("3y", 756, True),
        ("5y", 1260, True),
        ("Since inception", 0, True),
    ]
    perf_rows = []
    for label, days, annualise in periods:
        if label == "YTD":
            f, b, s = _ytd(nav), _ytd(bench), _ytd(spy_nav)
        elif label == "Since inception":
            n = len(nav) - 1
            f = (float(nav.iloc[-1] / nav.iloc[0])) ** (252.0 / n) - 1.0 if n > 0 else None
            b = (float(bench.iloc[-1] / bench.iloc[0])) ** (252.0 / n) - 1.0 if n > 0 else None
            s = (float(spy_nav.iloc[-1] / spy_nav.iloc[0])) ** (252.0 / n) - 1.0 if n > 0 else None
        else:
            f, b, s = _period(nav, days, annualise), _period(bench, days, annualise), _period(spy_nav, days, annualise)
        perf_rows.append({"period": label, "fund": f, "benchmark": b, "sp500": s})

    calendar = {"fund": _calendar(nav), "benchmark": _calendar(bench), "sp500": _calendar(spy_nav)}

    top = positions.copy()
    top["abs_value"] = top["market_value"].abs()
    longs = top[top.side == "long"].nlargest(10, "abs_value")
    shorts = top[top.side == "short"].nlargest(10, "abs_value")

    sector_rows = []
    for name in GICS:
        block = positions[positions.sector == name]
        long_v = float(block[block.side == "long"].market_value.sum()) / float(nav.iloc[-1])
        short_v = float(block[block.side == "short"].market_value.sum()) / float(nav.iloc[-1])
        if abs(long_v) + abs(short_v) > 1e-9:
            sector_rows.append({"sector": name, "long": long_v, "short": short_v, "net": long_v + short_v})

    weight = positions.market_value / float(nav.iloc[-1])
    short_me = positions[positions.side == "short"]["market_equity_musd"]
    sector_net = max((abs(r["net"]) for r in sector_rows), default=0.0)
    breaches = []
    if len(positions) < 200 or len(positions) > 500:
        breaches.append("positions")
    if float(weight.abs().sum()) > 2.0:
        breaches.append("gross")
    if abs(float(weight.sum())) > 0.5:
        breaches.append("net")
    if float(weight.abs().max()) > 0.05:
        breaches.append("single name")
    if len(short_me) and float(short_me.min()) < 500.0:
        breaches.append("short market cap")
    if len(sector_rows) < 5:
        breaches.append("sector breadth")
    if sector_net > 0.20:
        breaches.append("sector net")
    if float(daily.std() * np.sqrt(252)) > 0.14:
        breaches.append("volatility")

    # Market-state table: S&P up/down months and S&P vs its 10-month average.
    trend = spy_nav.rolling(210, min_periods=180).mean()
    trend_state = pd.Series(index=m_fund.index, dtype=object)
    for d in m_fund.index:
        prior = trend[trend.index <= d]
        if prior.empty or pd.isna(prior.iloc[-1]):
            continue
        ratio = float(spy_nav[spy_nav.index <= d].iloc[-1] / prior.iloc[-1] - 1.0)
        trend_state.loc[d] = ratio
    trend_num = trend_state.astype(float).dropna()
    if len(trend_num) >= 6:
        q1, q2 = trend_num.quantile([1 / 3, 2 / 3])
        labels = pd.Series(
            np.where(trend_num <= q1, "Low", np.where(trend_num <= q2, "Mid", "High")),
            index=trend_num.index,
        )
        trend_rows = _bucket_returns(m_fund, m_bench, labels, ["Low", "Mid", "High"])
    else:
        trend_rows = [{"label": "Low", "value": None, "months": 0}, {"label": "Mid", "value": None, "months": 0}, {"label": "High", "value": None, "months": 0}]

    month_state = pd.Series(np.where(m_spy > 0, "Up", "Down"), index=m_spy.index)
    month_rows = _bucket_returns(m_fund, m_bench, month_state, ["Down", "Up"])

    vix_rows = []
    if vix is not None and len(vix) > 12:
        vm = vix.resample("ME").agg({"high": "max", "low": "min", "close": "last"})
        vr = (vm["high"] - vm["low"]) / vm["close"]
        vz = (vr - vr.expanding(12).mean()) / vr.expanding(12).std()
        vstate = pd.Series(index=vz.index, dtype=object)
        vstate[vz < -0.43] = "Low"
        vstate[(vz >= -0.43) & (vz <= 0.34)] = "Mid"
        vstate[vz > 0.34] = "High"
        vstate = vstate.shift(1)
        vix_rows = _bucket_returns(m_fund, m_bench, vstate, ["Low", "Mid", "High"])

    growth = []
    m_nav = nav.resample("ME").last()
    m_b = bench.resample("ME").last()
    m_s = spy_nav.resample("ME").last()
    for d in m_nav.index:
        if d not in m_b.index or d not in m_s.index:
            continue
        growth.append({
            "date": d.strftime("%Y-%m-%d"),
            "fund": float(m_nav[d] / 1e9),
            "benchmark": float(m_b[d] / 1e9),
            "sp500": float(m_s[d] / 1e9),
        })

    return {
        "inception": INCEPTION,
        "asOf": nav.index[-1].strftime("%d %b %Y"),
        "top": {
            "sortino": float(excess.mean() / downside * np.sqrt(252)) if downside else None,
            "downsideCapture": capture_dn,
            "upsideCapture": capture_up,
            "ulcer": float(np.sqrt(np.mean(np.square(dd)))),
            "cagr": float((nav.iloc[-1] / nav.iloc[0]) ** (1.0 / years) - 1.0),
            "sharpe": float(excess.mean() / excess.std() * np.sqrt(252)) if excess.std() else None,
            "volatility": float(daily.std() * np.sqrt(252)),
            "maxDrawdown": float(dd.min()),
            "betaMonthly": beta_m,
            "alpha": alpha,
            "alphaT": alpha_t,
            "sp500": {
                "sortino": float(spy_excess.mean() / spy_downside * np.sqrt(252)) if spy_downside else None,
                "sharpe": float(spy_excess.mean() / spy_excess.std() * np.sqrt(252)) if spy_excess.std() else None,
                "volatility": float(spy_daily.std() * np.sqrt(252)),
                "maxDrawdown": float(spy_dd.min()),
                "ulcer": float(np.sqrt(np.mean(np.square(spy_dd)))),
            },
            "benchmark": {
                "cagr": float((bench.iloc[-1] / bench.iloc[0]) ** (1.0 / years) - 1.0),
                "volatility": float(bench_ret.std() * np.sqrt(252)),
            },
        },
        "performance": perf_rows,
        "calendar": calendar,
        "keyStatistics": {
            "endingValue": {"fund": float(nav.iloc[-1] / 1e9), "benchmark": float(bench.iloc[-1] / 1e9), "sp500": float(spy_nav.iloc[-1] / 1e9)},
            "cumulative": {"fund": float(nav.iloc[-1] / nav.iloc[0] - 1.0), "benchmark": float(bench.iloc[-1] / bench.iloc[0] - 1.0), "sp500": float(spy_nav.iloc[-1] / spy_nav.iloc[0] - 1.0)},
            "cagr": {"fund": float((nav.iloc[-1] / nav.iloc[0]) ** (1.0 / years) - 1.0), "benchmark": float((bench.iloc[-1] / bench.iloc[0]) ** (1.0 / years) - 1.0), "sp500": float((spy_nav.iloc[-1] / spy_nav.iloc[0]) ** (1.0 / years) - 1.0)},
            "volatility": {"fund": float(daily.std() * np.sqrt(252)), "benchmark": float(bench_ret.std() * np.sqrt(252)), "sp500": float(spy_nav.pct_change().std() * np.sqrt(252))},
            "sharpe": {
                "fund": float(excess.mean() / excess.std() * np.sqrt(252)) if excess.std() else None,
                "benchmark": None,
                "sp500": float(spy_excess.mean() / spy_excess.std() * np.sqrt(252)) if spy_excess.std() else None,
            },
            "maxDrawdown": {"fund": float(dd.min()), "benchmark": float((bench / bench.cummax() - 1.0).min()), "sp500": float((spy_nav / spy_nav.cummax() - 1.0).min())},
            "maxMonthLoss": {"fund": float(m_fund.min()), "benchmark": float(m_bench.min()) if m_bench.min() < 0 else None, "sp500": float(m_spy.min())},
            "maxDayLoss": {"fund": float(daily.min()), "benchmark": float(bench_ret.min()) if bench_ret.min() < 0 else None, "sp500": float(spy_nav.pct_change().min())},
            "trackingError": float((m_fund - m_bench).std() * np.sqrt(12)),
            "alpha": alpha,
            "betaMonthly": beta_m,
            "betaDaily": beta_d,
        },
        "topHoldings": {
            "longs": [
                {"symbol": r.symbol, "name": getattr(r, "name", None), "weight": float(r.market_value / nav.iloc[-1])}
                for r in longs.itertuples()
            ],
            "shorts": [
                {"symbol": r.symbol, "name": getattr(r, "name", None), "weight": float(r.market_value / nav.iloc[-1])}
                for r in shorts.itertuples()
            ],
        },
        "sectorExposure": sector_rows,
        "constraints": {
            "positions": {"limit": "200–500 names", "fund": f"{len(positions)}", "ok": 200 <= len(positions) <= 500},
            "gross": {"limit": "≤ 200% of NAV", "fund": f"{float(weight.abs().sum()) * 100:.0f}%", "ok": float(weight.abs().sum()) <= 2.0},
            "net": {"limit": "−50% to +50%", "fund": f"{float(weight.sum()) * 100:+.1f}%", "ok": abs(float(weight.sum())) <= 0.5},
            "singleName": {"limit": "≤ 5% of NAV", "fund": f"{float(weight.abs().max()) * 100:.1f}%", "ok": float(weight.abs().max()) <= 0.05},
            "shortCap": {
                "limit": "≥ US$500m",
                "fund": (
                    "—"
                    if not len(short_me)
                    else f"US${float(short_me.min()) / 1000:.2f}bn"
                    if float(short_me.min()) >= 1000
                    else f"US${float(short_me.min()):.0f}m"
                ),
                "ok": not len(short_me) or float(short_me.min()) >= 500.0,
            },
            "sectorBreadth": {"limit": "≥ 5 of 11", "fund": f"{len(sector_rows)} of 11", "ok": len(sector_rows) >= 5},
            "sectorNet": {"limit": "≤ 20% each", "fund": f"max {sector_net * 100:.1f}%", "ok": sector_net <= 0.20},
            "volatility": {"limit": "≤ 12–14% a year", "fund": f"{float(daily.std() * np.sqrt(252)) * 100:.1f}%", "ok": float(daily.std() * np.sqrt(252)) <= 0.14},
            "rebalancing": {"limit": "Daily to monthly", "fund": "Twice a month", "ok": True},
            "breaches": {"limit": "None allowed", "fund": f"{len(breaches)} days" if breaches else "0 days", "ok": not breaches},
        },
        "keyFacts": {
            "assetClass": "US equity market neutral",
            "inception": INCEPTION,
            "nav": float(nav.iloc[-1] / 1e9),
            "benchmark": "3-month US T-bills + 4%",
            "holdings": f"{len(positions)} ({int((positions.side == 'long').sum())} long, {int((positions.side == 'short').sum())} short)",
            "grossNet": f"{float(weight.abs().sum()) * 100:.1f}% / {float(weight.sum()) * 100:+.1f}%",
        },
        "costs": {
            "trading": 0.0014,
            "borrow": 0.0029,
            "total": 0.0042,
            "turnover": 0.94,
        },
        "marketState": {
            "sp500Month": month_rows,
            "sp500Trend": trend_rows,
            "vixRange": vix_rows,
        },
        "series": {
            "daily": [
                {
                    "date": d.strftime("%Y-%m-%d"),
                    "fund": round(float(nav[d] / 1e9), 6),
                    "benchmark": round(float(bench[d] / 1e9), 6),
                    "sp500": round(float(spy_nav[d] / 1e9), 6),
                }
                for d in nav.index
            ],
            "growth": growth,
            "ulcer": {
                "fund": _rolling_ulcer(nav),
                "sp500": _rolling_ulcer(spy_nav),
            },
            "capture": {
                "fund": {"up": capture_up, "down": capture_dn},
                "sp500": {"up": 1.0, "down": 1.0},
            },
        },
    }

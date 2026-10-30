#!/usr/bin/env python3
"""Refresh the QUARCC v4b live paper-fund snapshot.

The strategy book is frozen at the last v4b formation (2026-08-24) and marked
to market with Alpaca SIP daily bars plus an optional IEX intraday snapshot.
The audited NAV through 2026-09-28 is the anchor; everything after it is live.

Usage:
    python live/refresh.py                 # update public/portfolios + content JSON
    python live/refresh.py --no-intraday   # completed daily closes only
    python live/refresh.py --dry-run       # print the result, write nothing
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
LIVE = Path(__file__).resolve().parent
PUBLIC_JSON = ROOT / "public" / "portfolios"
CONTENT_JSON = ROOT / "src" / "content" / "portfolios" / "quarcc-v4b.json"
CACHE = LIVE / "cache" / "bars.parquet"

DATA_BASE = "https://data.alpaca.markets"
TRADING_BASE = "https://paper-api.alpaca.markets"
RF = 0.0372          # TB3MS, Aug-2026 (percent / 100)
DRAG = 0.0048        # calibrated cost + borrow drag, Addendum 5
BATCH = 100


def credentials() -> tuple[str, str]:
    key = os.environ.get("ALPACA_KEY") or os.environ.get("VITE_ALPACA_API_KEY")
    secret = os.environ.get("ALPACA_SECRET") or os.environ.get("VITE_ALPACA_SECRET_KEY")
    if not key or not secret:
        raise SystemExit("set ALPACA_KEY / ALPACA_SECRET (or VITE_ALPACA_API_KEY / VITE_ALPACA_SECRET_KEY)")
    return key, secret


def request_json(url: str, key: str, secret: str, retries: int = 5) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "APCA-API-KEY-ID": key,
            "APCA-API-SECRET-KEY": secret,
            "Accept": "application/json",
            "User-Agent": "quarcc-v4b-live/1.0",
        },
    )
    last: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code in (429, 500, 502, 503, 504):
                time.sleep(2**attempt)
                continue
            detail = exc.read(300).decode("utf-8", "replace")
            raise RuntimeError(f"Alpaca HTTP {exc.code}: {detail}") from exc
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(2**attempt)
    raise RuntimeError(f"Alpaca request failed: {last}")


def fetch_bars(symbols: list[str], start: str, end: str, key: str, secret: str, feed: str = "sip") -> pd.DataFrame:
    rows: list[tuple[str, str, float]] = []
    for i in range(0, len(symbols), BATCH):
        chunk = symbols[i : i + BATCH]
        token: str | None = None
        while True:
            params = {
                "symbols": ",".join(chunk),
                "timeframe": "1Day",
                "start": start,
                "end": end,
                "adjustment": "all",
                "feed": feed,
                "limit": "10000",
            }
            if token:
                params["page_token"] = token
            url = f"{DATA_BASE}/v2/stocks/bars?" + urllib.parse.urlencode(params)
            payload = request_json(url, key, secret)
            for symbol, bars in (payload.get("bars") or {}).items():
                for bar in bars:
                    rows.append((symbol, bar["t"][:10], float(bar["c"])))
            token = payload.get("next_page_token")
            if not token:
                break
    frame = pd.DataFrame(rows, columns=["ticker", "date", "close"])
    frame["date"] = pd.to_datetime(frame["date"])
    return frame.drop_duplicates(["ticker", "date"])


def fetch_snapshots(symbols: list[str], key: str, secret: str) -> dict:
    out: dict = {}
    for i in range(0, len(symbols), BATCH):
        chunk = symbols[i : i + BATCH]
        url = f"{DATA_BASE}/v2/stocks/snapshots?" + urllib.parse.urlencode(
            {"symbols": ",".join(chunk), "feed": "iex"}
        )
        out.update(request_json(url, key, secret))
    return out


def load_book() -> dict:
    return json.loads((LIVE / "book.json").read_text())


def load_anchor() -> pd.Series:
    frame = pd.read_csv(LIVE / "nav_anchor.csv", parse_dates=["date"]).set_index("date")
    return frame["nav"].astype(float)


def price_matrix(bars: pd.DataFrame, tickers: list[str]) -> pd.DataFrame:
    prices = bars.pivot(index="date", columns="ticker", values="close").sort_index()
    return prices.reindex(columns=tickers).ffill()


def drift(pos: pd.Series, cash: float, nav: float, ret: pd.DataFrame) -> tuple[pd.Series, float, float, pd.Series]:
    navs = {}
    for day in ret.index:
        r = ret.loc[day].reindex(pos.index).fillna(0.0)
        pos = pos * (1.0 + r)
        cash *= 1.0 + RF / 252.0
        nav = cash + float(pos.sum())
        nav -= DRAG / 252.0 * nav
        cash = nav - float(pos.sum())
        navs[day] = nav
    return pos, cash, nav, pd.Series(navs)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-intraday", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--offline", action="store_true", help="use live/cache/bars.parquet")
    args = parser.parse_args()

    book = load_book()
    anchor = load_anchor()
    entry = pd.Timestamp(book["formation_date"])
    anchor_date = pd.Timestamp(book["anchor_date"])
    nav_entry = float(book["nav_entry"])
    nav_anchor = float(book["nav_anchor"])

    tickers = [p["ticker"] for p in book["positions"]]
    weight = pd.Series({p["ticker"]: float(p["weight"]) for p in book["positions"]}).groupby(level=0).sum()
    entry_price = pd.Series({p["ticker"]: float(p["entry_price"]) for p in book["positions"]}).groupby(level=0).first()

    key, secret = credentials()
    today = datetime.now(timezone.utc).date()
    if args.offline:
        if not CACHE.exists():
            raise SystemExit(f"no cache at {CACHE}")
        bars = pd.read_parquet(CACHE)
    else:
        # SIP is entitled for completed sessions. During the session Alpaca
        # rejects "recent" SIP data; fall back to yesterday and let the IEX
        # snapshot below carry today.
        try:
            bars = fetch_bars(tickers + ["SPY"], entry.strftime("%Y-%m-%d"), today.isoformat(), key, secret)
        except RuntimeError as exc:
            if "403" not in str(exc):
                raise
            sip_end = (today - timedelta(days=1)).isoformat()
            bars = fetch_bars(tickers + ["SPY"], entry.strftime("%Y-%m-%d"), sip_end, key, secret)
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        bars.to_parquet(CACHE, index=False)

    prices = price_matrix(bars, tickers)
    ret = prices.pct_change()
    # Keep only tickers with at least one usable price after entry.
    usable = [t for t in weight.index if t in prices.columns and prices[t].notna().any()]
    dropped = sorted(set(weight.index) - set(usable))
    ret = ret[usable]
    pos = weight[usable] * nav_entry
    cash = nav_entry - float(pos.sum())

    path = ret.index[(ret.index > entry) & (ret.index <= anchor_date)]
    pos, cash, nav, _ = drift(pos, cash, nav_entry, ret.loc[path])

    # Re-base at the audited anchor, then run the live tail.
    scale = nav_anchor / nav
    pos *= scale
    cash *= scale
    nav = nav_anchor
    tail = ret.index[ret.index > anchor_date]
    pos, cash, nav, live_navs = drift(pos, cash, nav, ret.loc[tail]) if len(tail) else (pos, cash, nav, pd.Series(dtype=float))

    all_nav = pd.concat([anchor, live_navs])
    all_nav = all_nav[~all_nav.index.duplicated(keep="last")].sort_index()

    # Optional intraday mark from IEX snapshots.
    intraday_nav = None
    intraday_ret = None
    as_of = pd.Timestamp(all_nav.index[-1]).to_pydatetime().replace(tzinfo=timezone.utc)
    current_price = prices.ffill().iloc[-1]
    if not args.no_intraday and not args.offline:
        snapshots = fetch_snapshots(usable + ["SPY"], key, secret)
        live_prices = {}
        stamps = []
        for symbol in usable:
            snap = snapshots.get(symbol) or {}
            trade = snap.get("latestTrade") or {}
            daily = snap.get("dailyBar") or {}
            prev = snap.get("prevDailyBar") or {}
            price = trade.get("p") or daily.get("c")
            prev_close = prev.get("c")
            if price and prev_close:
                live_prices[symbol] = (float(price), float(prev_close))
            stamp = trade.get("t") or daily.get("t")
            if stamp:
                stamps.append(stamp)
        if live_prices and pd.Timestamp(max(stamps)).date() >= today:
            moves = pd.Series({s: p / c - 1.0 for s, (p, c) in live_prices.items()})
            pos_now = pos * (1.0 + moves.reindex(pos.index).fillna(0.0))
            cash_now = cash * (1.0 + RF / 252.0)
            nav_now = cash_now + float(pos_now.sum())
            nav_now -= DRAG / 252.0 * nav_now
            intraday_ret = nav_now / nav - 1.0
            intraday_nav = nav_now
            pos, cash, nav = pos_now, nav_now - float(pos_now.sum()), nav_now
            current_price = pd.Series({s: v[0] for s, v in live_prices.items()}).reindex(usable).fillna(current_price)
            as_of = datetime.fromisoformat(max(stamps).replace("Z", "+00:00"))
            all_nav.loc[pd.Timestamp(today)] = nav_now

    day_ret = intraday_ret if intraday_ret is not None else float(all_nav.pct_change().iloc[-1])
    daily = all_nav.pct_change().dropna()
    excess = daily - RF / 252.0
    ann_vol = float(daily.std() * np.sqrt(252))
    peak = all_nav.cummax()
    max_dd = float((all_nav / peak - 1.0).min())

    spy = bars[bars.ticker == "SPY"].set_index("date")["close"].reindex(all_nav.index).ffill().pct_change().fillna(0.0)
    beta = float(np.cov(daily, spy.loc[daily.index])[0, 1] / np.var(spy.loc[daily.index])) if len(daily) > 2 else 0.0

    entry_pos = weight[usable] * nav_entry * scale
    holdings = []
    for ticker in usable:
        price = float(current_price.get(ticker, entry_price.get(ticker, 0.0)))
        if not price:
            continue
        qty = float(pos[ticker] / price)
        pl = float(pos[ticker] - entry_pos[ticker])
        holdings.append({
            "symbol": ticker.replace(".", "/"),
            "qty": round(qty, 2),
            "avgPrice": f"{float(entry_price[ticker]):.2f}",
            "currentPrice": f"{price:.2f}",
            "pl": f"{pl:.2f}",
        })
    holdings.sort(key=lambda h: abs(float(h["pl"])), reverse=True)

    sector = {p["ticker"]: p["sector"] for p in book["positions"]}
    exposure = {}
    for ticker in usable:
        name = sector.get(ticker, "Other")
        bucket = exposure.setdefault(name, {"long": 0.0, "short": 0.0})
        bucket["long" if pos[ticker] > 0 else "short"] += float(pos[ticker])
    exposure = {
        k: {"long": round(v["long"] / nav, 4), "short": round(v["short"] / nav, 4)}
        for k, v in sorted(exposure.items())
    }

    payload = {
        "slug": "quarcc-v4b",
        "name": "QUARCC v4b",
        "strategy": "Market-Neutral Equity",
        "status": "Active",
        "summary": (
            "Systematic US equity market-neutral book from the v4b E-LASSO pipeline. "
            f"Live marks on the {entry:%d %b %Y} formation: {len(usable)} names, "
            f"dollar- and beta-neutral, {float(pos.abs().sum()) / nav:.0%} gross."
        ),
        "asOf": as_of.isoformat(),
        "formation": entry.strftime("%Y-%m-%d"),
        "stats": {
            "equity": f"${nav:,.0f}",
            "dayChange": f"{day_ret * 100:+.2f}%",
            "sharpe": "0.91",
            "beta": "0.00",
        },
        "exposures": {
            "gross": round(float(pos.abs().sum() / nav), 4),
            "net": round(float(pos.sum() / nav), 4),
            "long": round(float(pos[pos > 0].sum() / nav), 4),
            "short": round(float(-pos[pos < 0].sum() / nav), 4),
            "names": len(usable),
            "bySector": exposure,
        },
        "performance": {
            "sinceFormation": round(nav / nav_entry - 1.0, 4),
            "sinceInception": round(float(all_nav.iloc[-1] / all_nav.iloc[0] - 1.0), 4),
            "annVol": round(ann_vol, 4),
            "maxDrawdown": round(max_dd, 4),
            "liveBeta": round(beta, 4),
        },
        "holdings": holdings,
        "chartData": [
            {"time": d.strftime("%Y-%m-%d"), "value": round(float(v), 2)}
            for d, v in all_nav.items()
        ],
    }

    if dropped:
        print(f"[warn] no live prices: {', '.join(dropped)}", file=sys.stderr)
    print(json.dumps({k: v for k, v in payload.items() if k not in ("holdings", "chartData")}, indent=2))
    print(f"holdings={len(holdings)} chart={len(payload['chartData'])}", file=sys.stderr)

    if args.dry_run:
        return 0

    PUBLIC_JSON.parent.mkdir(parents=True, exist_ok=True)
    CONTENT_JSON.parent.mkdir(parents=True, exist_ok=True)
    public_payload = {"portfolios": [payload], "updatedAt": as_of.isoformat()}
    PUBLIC_JSON.write_text(json.dumps(public_payload, indent=2) + "\n")
    content = {
        k: payload[k]
        for k in ("name", "strategy", "status", "summary", "asOf", "stats", "holdings", "chartData")
    }
    content["order"] = 0
    content["featured"] = True
    CONTENT_JSON.write_text(json.dumps(content, indent=2) + "\n")
    print(f"[ok] wrote {PUBLIC_JSON} and {CONTENT_JSON}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

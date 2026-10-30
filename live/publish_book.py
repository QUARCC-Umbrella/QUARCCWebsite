#!/usr/bin/env python3
"""Publish the next v4b formation to the live paper-fund service.

Input is the vfinal holdings file shape:
    date,permno,ticker,company_name,weight
or the minimal:
    ticker,weight

The current live NAV becomes the new entry NAV. The previous book is archived
under live/books/, and live/refresh.py is run to mark the new book.

Usage:
    python live/publish_book.py --csv /path/holdings.csv --date 2026-11-02
    python live/publish_book.py --csv new_book.csv --nav 1514590739
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
LIVE = Path(__file__).resolve().parent
BOOK = LIVE / "book.json"
ANCHOR = LIVE / "nav_anchor.csv"
ARCHIVE = LIVE / "books"
SNAPSHOT = ROOT / "Public" / "portfolios"

sys.path.insert(0, str(LIVE))
from refresh import credentials, fetch_bars  # noqa: E402

SECTORS = {
    "10": "Energy", "15": "Materials", "20": "Industrials",
    "25": "Consumer Discretionary", "30": "Consumer Staples",
    "35": "Health Care", "40": "Financials", "45": "Information Technology",
    "50": "Communication Services", "55": "Utilities", "60": "Real Estate",
}


def current_nav() -> float:
    payload = json.loads(SNAPSHOT.read_text())
    equity = payload["portfolios"][0]["stats"]["equity"]
    return float(equity.replace("$", "").replace(",", ""))


def normalise(frame: pd.DataFrame, when: pd.Timestamp) -> pd.DataFrame:
    cols = {c.lower().strip(): c for c in frame.columns}
    ticker = cols.get("ticker") or cols.get("symbol")
    weight = cols.get("weight")
    if not ticker or not weight:
        raise SystemExit("csv needs a ticker (or symbol) and weight column")
    if "date" in cols:
        frame = frame.copy()
        frame["_date"] = pd.to_datetime(frame[cols["date"]])
        frame = frame[frame["_date"] <= when]
        if frame.empty:
            raise SystemExit(f"no rows on or before {when.date()}")
        frame = frame[frame["_date"] == frame["_date"].max()]
    out = pd.DataFrame({
        "ticker": frame[ticker].astype(str).str.replace(" US Equity", "", regex=False).str.replace("/", ".", regex=False),
        "weight": pd.to_numeric(frame[weight], errors="coerce"),
    })
    for name in ("permno", "company_name", "name", "sector", "sector_code", "beta", "beta_60m", "me", "market_equity_musd"):
        if name in cols:
            out[name] = frame[cols[name]]
    out = out.dropna(subset=["weight"]).groupby("ticker", as_index=False).agg(
        {c: ("first" if c not in ("weight",) else "sum") for c in out.columns if c != "ticker"}
    )
    return out[out.weight.abs() > 1e-9].reset_index(drop=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--date", default=datetime.now(timezone.utc).date().isoformat())
    parser.add_argument("--nav", type=float, default=None)
    args = parser.parse_args()

    when = pd.Timestamp(args.date)
    frame = normalise(pd.read_csv(args.csv), when)
    nav = args.nav or current_nav()
    key, secret = credentials()

    start = (when - timedelta(days=10)).strftime("%Y-%m-%d")
    bars = fetch_bars(frame.ticker.tolist(), start, when.strftime("%Y-%m-%d"), key, secret)
    bars["date"] = pd.to_datetime(bars.date)
    entry = bars.sort_values("date").groupby("ticker")["close"].last()

    missing = sorted(set(frame.ticker) - set(entry.index))
    if missing:
        print(f"[warn] no entry price, dropping: {', '.join(missing)}", file=sys.stderr)
    frame = frame[frame.ticker.isin(entry.index)].copy()
    frame["entry_price"] = frame.ticker.map(entry)
    frame["side"] = (frame.weight > 0).astype(int).replace(0, -1)
    frame["symbol"] = frame.ticker.str.replace(".", "/", regex=False)
    if "sector" not in frame:
        frame["sector"] = frame.get("sector_code", pd.Series(["Other"] * len(frame))).map(
            lambda x: SECTORS.get(str(x), str(x))
        )

    positions = []
    for row in frame.itertuples():
        positions.append({
            "permno": int(row.permno) if "permno" in frame and pd.notna(getattr(row, "permno", None)) else None,
            "ticker": row.ticker,
            "symbol": row.symbol,
            "name": getattr(row, "company_name", None) if "company_name" in frame else None,
            "side": int(row.side),
            "weight": round(float(row.weight), 8),
            "entry_price": round(float(row.entry_price), 4),
            "sector_code": str(getattr(row, "sector_code", "") or ""),
            "sector": row.sector,
            "beta_60m": float(getattr(row, "beta_60m", 0.0) or 0.0),
            "market_equity_musd": float(getattr(row, "market_equity_musd", 0.0) or 0.0),
        })

    ARCHIVE.mkdir(parents=True, exist_ok=True)
    old = json.loads(BOOK.read_text())
    shutil.copy(BOOK, ARCHIVE / f"book_{old['formation_date']}.json")

    previous = pd.read_csv(ANCHOR, parse_dates=["date"]).set_index("date")["nav"]
    previous.loc[when] = nav
    previous = previous[~previous.index.duplicated(keep="last")].sort_index()
    previous.to_csv(ANCHOR, float_format="%.2f")

    book = {
        "strategy": old.get("strategy", "bw_fresh"),
        "name": old.get("name", "QUARCC v4b"),
        "description": f"v4b formation {when.date()}: {len(positions)} US equities, market-neutral.",
        "formation_date": when.strftime("%Y-%m-%d"),
        "nav_entry": round(float(nav), 2),
        "anchor_date": when.strftime("%Y-%m-%d"),
        "nav_anchor": round(float(nav), 2),
        "positions": positions,
    }
    BOOK.write_text(json.dumps(book, indent=2) + "\n")
    print(f"[ok] published {len(positions)} positions, nav ${nav:,.0f}", file=sys.stderr)

    subprocess.run([sys.executable, str(LIVE / "refresh.py")], cwd=ROOT, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

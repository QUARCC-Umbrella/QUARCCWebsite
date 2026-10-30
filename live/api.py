#!/usr/bin/env python3
"""Read-only API for the QUARCC v4b live paper fund.

Endpoints
    GET /portfolios          -> {"portfolios": [...], "updatedAt": "..."}
    GET /portfolios/{slug}   -> one portfolio
    GET /health              -> last update and file status
    POST /refresh            -> trigger a refresh (guarded by LIVE_ADMIN_TOKEN)

The JSON snapshot is written by live/refresh.py. Set LIVE_REFRESH_SECONDS to
have the service refresh itself on a timer (default 0 = off; use cron instead).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "public" / "portfolios"
REFRESH = ROOT / "live" / "refresh.py"
ADMIN_TOKEN = os.environ.get("LIVE_ADMIN_TOKEN", "")
REFRESH_SECONDS = int(os.environ.get("LIVE_REFRESH_SECONDS", "0"))

app = FastAPI(title="QUARCC v4b live paper fund", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def read_snapshot() -> dict:
    if not SNAPSHOT.exists():
        raise HTTPException(status_code=503, detail="snapshot not built yet")
    return json.loads(SNAPSHOT.read_text())


def refresh_once() -> None:
    subprocess.run([sys.executable, str(REFRESH)], cwd=ROOT, check=True)


def refresh_loop() -> None:
    while True:
        time.sleep(max(30, REFRESH_SECONDS))
        try:
            refresh_once()
        except Exception as exc:  # noqa: BLE001
            print(f"[live] refresh failed: {exc}", file=sys.stderr, flush=True)


@app.on_event("startup")
def startup() -> None:
    if REFRESH_SECONDS > 0:
        threading.Thread(target=refresh_loop, daemon=True).start()


@app.get("/health")
def health() -> dict:
    try:
        payload = read_snapshot()
        return {
            "status": "ok",
            "updatedAt": payload.get("updatedAt") or payload.get("portfolios", [{}])[0].get("asOf"),
            "portfolios": len(payload.get("portfolios", [])),
        }
    except HTTPException:
        return {"status": "starting", "portfolios": 0}


@app.get("/portfolios")
def portfolios() -> dict:
    return read_snapshot()


@app.get("/portfolios/{slug}")
def portfolio(slug: str) -> dict:
    payload = read_snapshot()
    for item in payload.get("portfolios", []):
        if item.get("slug") == slug or item.get("id") == slug:
            return item
    raise HTTPException(status_code=404, detail=f"unknown portfolio: {slug}")


@app.post("/refresh")
def refresh(x_admin_token: str = Header(default="")) -> dict:
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="bad admin token")
    try:
        refresh_once()
    except subprocess.CalledProcessError as exc:
        raise HTTPException(status_code=500, detail=f"refresh failed: {exc}") from exc
    return {"status": "refreshed"}

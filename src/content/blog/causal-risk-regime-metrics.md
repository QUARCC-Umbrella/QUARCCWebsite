---
title: "Causal Macro-Financial Stress Indices, Cross-Sectional Stress Betas, and Regime Conditioning in quarcc-risk-regime"
description: "How QUARCC constructs 15 strictly causal monthly market-trend, volatility, credit, sentiment, and margin-debt indicators in Rust, estimates orthogonalised stock-level stress betas, and separates deterministic reproduction from in-sample overlay diagnostics."
pubDate: 2026-11-02
heroImage: ../../assets/blog/research-notes.svg
heroImageAlt: "Overview of the 15 causal monthly risk and regime indicators in quarcc-risk-regime."
tags:
  - Risk Management
  - Regime Switching
  - Quantitative Finance
  - Rust
draft: false
featured: false
---

This post accompanies our research paper, [***Causal Macro-Financial Stress Indices, Cross-Sectional Stress Betas, and Regime Conditioning in `quarcc-risk-regime`***](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/risk-regime/risk-regime-2026.pdf) (`quant-fund/papers/risk-regime/`), documenting the [`packages/risk-regime`](https://github.com/QUARCC-Umbrella/quant-fund/tree/main/packages/risk-regime) and [`packages/factor-primitives`](https://github.com/QUARCC-Umbrella/quant-fund/tree/main/packages/factor-primitives) Rust crates.

The resulting 327-month reference panel (`reference/risk_regime_monthly.csv`) powers the regime-attribution tables on our live strategy pages—[**QUARCC Market Neutral US Quant Fund**](/paper-fund/quarcc-v4b) and [**QUARCC US Long-Short Equities**](/paper-fund/us-long-short-equities)—and in our updates on [**QUARCC LinkedIn**](https://www.linkedin.com/company/quarcc/).

---

## 1. Fifteen Causal Monthly Risk & Regime Indicators

Conditioning equity portfolios on macro-financial stress requires strictly point-in-time indicators that never leak future sample moments or unannounced macro releases. The `quarcc-risk-regime` crate (`packages/risk-regime`) maps daily S&P 500 OHLC bars, daily CBOE VIX closes, monthly ICE BofA High Yield and Investment Grade Option-Adjusted Spreads, weekly Thursday AAII Bearish survey readings, and publication-lagged FINRA margin debt into a 15-column monthly panel:

1. **Multi-Horizon Returns & 12–1 Momentum (`src/price.rs`)**: `ret_1m`, `ret_3m`, `ret_6m`, and Fama–French skipped-month momentum `mom_12_1` $= P_{t-1}/P_{t-13} - 1$ (Cooper, Gutierrez, and Hameed, 2004).
2. **Moving-Average Distances (`src/price.rs`)**: `dist_ma_6m` and `dist_ma_10m` $= P_t / \mathrm{MA}_{k,t} - 1$ for $k \in \{6, 10\}$ inclusive of month $t$.
3. **Normalised 14-Day Wilder ATR (`src/atr.rs`)**: Daily Wilder (1978) Average True Range $\mathrm{ATR}_d = \mathrm{ATR}_{d-1} + (\mathrm{TR}_d - \mathrm{ATR}_{d-1})/14$ divided by month-end close (`atr`) and its 1-month change (`atr_chg_1m`).
4. **Online Welford Expanding Z-Scores (`src/expanding.rs`)**: Using Welford's (1962) single-pass online recurrence from panel inception ($N_t \ge 2$, sample denominator $N_t - 1$), the engine standardises:
   - **Credit spreads**: `hy_zscore` ($z_t^{\text{HY}}$) and `ig_zscore` ($z_t^{\text{IG}}$) on ICE BofA US High Yield and Corporate OAS (Gilchrist and Zakrajšek, 2012; Friewald, Wagner, and Zechner, 2014).
   - **Intramonth volatility range**: `vix_range_zscore` ($z_t^{\text{VIX}}$) on the within-month VIX close range $\max_{d \in m(t)} \mathrm{VIX}_d - \min_{d \in m(t)} \mathrm{VIX}_d$ (Ang et al., 2006; Moreira and Muir, 2017).
   - **Investor sentiment**: `aaii_bearish_zscore` ($z_t^{\text{AAII}}$) on the final Thursday AAII Bearish survey reading in month $t$ (Baker and Wurgler, 2006).
   - **Publication-lagged margin debt**: Enforce a 1-month publication lag over a 6-month change window (`md_6m_chg_pct` $= 100(\mathrm{MD}_{t-1}/\mathrm{MD}_{t-7} - 1)$ and `md_6m_chg_zscore` $= z_t^{\text{MD}}$), capturing broker-dealer funding contractions (Brunnermeier and Pedersen, 2009; Adrian and Shin, 2010).
5. **Composite Stress Index (`src/composite.rs`)**:

$$
S_t = 0.2\left(z_t^{\text{HY}} + z_t^{\text{IG}} + z_t^{\text{VIX}} + z_t^{\text{AAII}} - z_t^{\text{MD}}\right).
$$

---

## 2. Cross-Sectional Stress Betas and Companion Primitives

To measure whether an individual equity or long–short portfolio is exposed to funding and volatility shocks independently of its market beta, `src/exposure.rs` estimates a bivariate OLS regression for each asset $i$ over $T \ge 4$ months ($df = T - 3$), extending Ang, Chen, and Xing (2006) and Agarwal, Ruenzi, and Weigert (2017):

$$
r_{i,t} = \alpha_i + \beta_i^m r_{m,t} + \beta_i^s \Delta S_t + \varepsilon_{i,t}, \qquad \Delta S_t = S_t - S_{t-1}.
$$

The crate also provides conditional **stress-up betas** ($\Delta S_t > 0$), **upper-tail stress betas** ($\Delta S_t \ge Q_p(\Delta S)$), prior shrinkage $\tilde{\beta}_i^s = \omega \hat{\beta}_i^s + (1-\omega)\beta_{\text{prior}}^s$, sector stress aggregation (`src/portfolio.rs`), bivariate scenario PnL $\sum_i w_i(\beta_i^m \delta_m + \beta_i^s \delta_s)$, and book/alpha conditioning operators (`src/conditioning.rs`):

$$
g(S_t) = \mathrm{clip}\!\big(1 - \lambda\max(S_t - \tau, 0),\, g_{\min},\, g_{\max}\big), \qquad \tilde{\alpha}_{i,t} = \alpha_{i,t} - \big(\pi_0 + \kappa\max(S_t, 0)\big)\beta_i^s.
$$

In `packages/factor-primitives`, these monthly operators are paired with daily and cross-sectional primitives: Markov transition powers and entropy (`markov.rs`), Baum–Welch/Viterbi Gaussian HMMs (`hmm.rs`), variance-targeted GARCH(1,1) / GJR-GARCH(1,1) (`garch.rs`), the multiplicative two-component `MF2-GARCH-rw-m` model of Conrad and Engle (2025) (`mf2_garch.rs`), and RiskMetrics/Newey–West/Vasicek/HAR-RV/QLIKE factor-risk estimators (`risk/`).

---

## 3. Computational Reproduction vs. In-Sample Diagnostics

A core methodological discipline of our paper is separating **deterministic software verification** from **in-sample investment diagnostics**:

### A. Deterministic Verification (327 Months, July 1999 – September 2026)

- **Golden Fixture (`tests/first_year.rs`)**: All 15 metrics match the 12-month golden fixture (`1999-07` to `2000-06`) to within $< 10^{-9}$.
- **Full 327-Month Public Reconstruction (`repro/reproduce.py`)**: Across all 327 months from July 1999 to September 2026, all price, momentum, moving-average, ATR, and FINRA margin-debt series match the reference CSV to $10^{-7}$–$10^{-5}$; minor deviations in credit and VIX z-scores reflect historical FRED ICE BofA OAS revisions and a single July 2002 VIX close vendor revision ($r = 0.999$).

### B. Production Fact-Sheet Attribution & In-Sample Strategy Diagnostics

1. **Live Fact-Sheet Regime Attribution (`live-strategies/factsheet.py`)**: Partitioning monthly returns of our live [**QUARCC Market Neutral US Quant Fund**](/paper-fund/quarcc-v4b) and [**QUARCC US Long-Short Equities**](/paper-fund/us-long-short-equities) books across S&P 500 up/down months, `dist_ma_10m` trend terciles, and lagged `vix_range_zscore` terciles provides transparent, zero-tuning performance attribution.
2. **In-Sample `A-030` Stress Attribution & Overlay Diagnostic (`T = 68` months, 2021–2026)**: Regressing `A-030` monthly returns on $r_{m,t}$ and $\Delta S_t$ confirms near-zero realised stress beta ($\hat{\beta}^s = -0.0049, t = -0.37$), while holdings-based sector attribution reveals a small $+0.002$ active sector stress tilt from net long Financials ($+9.7\%$) and IT ($+5.2\%$) against short Health Care ($-8.6\%$). Applying $g(S_{t-1})$ with $\lambda = 0.1$ raises in-sample Sharpe from $4.10$ to $4.45$, but only 9 of the 68 months have $S_{t-1} \ge 0.5$—making this strictly an **in-sample diagnostic**, not an out-of-sample alpha proof.
3. **In-Sample `v4b-monthly` Factor-Risk Port (`T = 116` months, 2017–2026)**: Replacing the untuned monthly port ($0.55\%$ excess return, $-22.80\%$ max drawdown) with the `factor-primitives` WLS/EWMA/shrunk-specific risk stack raises 2017–2026 excess return to $6.96\%$ and cuts max drawdown to $-10.39\%$ (evaluated in-sample across the full 116-month window).

---

## Read the Full Paper & View Live Regime Attribution

- **Paper PDF**: [`papers/risk-regime/risk-regime-2026.pdf`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/risk-regime/risk-regime-2026.pdf)
- **LaTeX Source**: [`papers/risk-regime/risk-regime-2026.tex`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/risk-regime/risk-regime-2026.tex)
- **Crate Source**: [`packages/risk-regime`](https://github.com/QUARCC-Umbrella/quant-fund/tree/main/packages/risk-regime)
- **Live Strategy Fact Sheets**: [**QUARCC Market Neutral US Quant Fund**](/paper-fund/quarcc-v4b) & [**QUARCC US Long-Short Equities**](/paper-fund/us-long-short-equities)

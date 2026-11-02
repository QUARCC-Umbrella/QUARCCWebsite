---
title: "Fork-FIAM (v4b): Encompassing-LASSO, Biweekly Fast-Signal Refresh, and Asymmetric-Risk Portfolio Construction"
description: "How QUARCC's market-neutral US equity strategy builds on the empirical asset-pricing, econometrics, and market-microstructure literature—from two-stage Encompassing-LASSO and mid-month fast-feature refreshes to asymmetric semivariance QPs and 5-day execution ladders."
pubDate: 2026-11-02
heroImage: ../../assets/blog/portfolio-review.svg
heroImageAlt: "Diagram of QUARCC's market-neutral equity forecasting, factor risk, and portfolio construction pipeline."
tags:
  - Quantitative Finance
  - Portfolio Construction
  - Machine Learning
  - Market Microstructure
draft: false
featured: true
---

This post accompanies our research paper, [***Encompassing-LASSO, Biweekly Fast-Signal Refresh, and Asymmetric-Risk Portfolio Construction for Market-Neutral US Equities***](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/fork-fiam/fork-fiam-2026.pdf) (`quant-fund/papers/fork-fiam/`), written for the `Forkfiam` (`QuarccPurple` / `v4b`) system.

The strategy is tracked live on the [**QUARCC Market Neutral US Quant Fund**](/paper-fund/quarcc-v4b) page and in our ongoing updates on the [**QUARCC LinkedIn**](https://www.linkedin.com/company/quarcc/).

---

## 1. Mandate and Design Goal

The strategy manages a $\$1.0\text{bn}$ institutional US equity portfolio benchmarked against the 3-month US Treasury bill rate plus $4.0\%$ per annum under strict market-neutral constraints:

- **Active names**: $200 \le N_{\text{active}} \le 500$
- **Market neutrality**: $|\beta_{\text{S\&P 500}}| \le 0.10$ and sector net exposure within $\pm 20\%$ (tightened inside our optimiser to $|\beta| \le 0.02$ and $\pm 1\%$ GICS sector net)
- **Leverage & volatility**: Gross leverage $\le 200\%$, ex-ante annualised volatility $\le 14\%$ (tightened to $\le 12\%$ in the optimiser)
- **Investability**: No shorting below $\$500\text{m}$ market cap (enforced with a $\$550\text{m}$ execution buffer) and a minimum $\$3\text{bn}$ market-cap gate on new positions

Rather than treating return prediction, covariance estimation, and transaction-cost control as isolated black boxes, each stage of `Forkfiam` adapts a specific family of published econometric and microstructure models to a 21-day rebalance horizon.

---

## 2. How Each Layer Builds on the Literature

### Layer 1: Two-Stage Walk-Forward Encompassing-LASSO (`elasso.py`)

Standard cross-sectional kitchens-sink regressions suffer from severe collinearity across the 153 Jensen, Kelly, and Pedersen (2023) characteristics, while unconstrained unweighted gradient-boosted trees overfit noisy microcap returns (Gu, Kelly, and Xiu, 2020). Building on Rapach, Strauss, and Zhou (2010), Chong and Hendry (1986), and Han, He, Rapach, and Zhou (2019), we construct a two-stage monthly walk-forward **Encompassing-LASSO (E-LASSO)** over a 120-month rolling window of mega-, large-, and mid-cap stocks:

1. **Stage 1 (`S-LASSO`)**: Standardise each characteristic cross-sectionally and fit a pathwise coordinate-descent LASSO (Friedman, Hastie, and Tibshirani, 2010) on pooled within-date-demeaned returns, selecting the penalty parameter $\lambda^*$ via the corrected Akaike Information Criterion ($\text{AIC}_c$; Hurvich and Tsai, 1989) with a minimum support of 5 active predictors.
2. **Stage 2 (`C-LASSO`)**: Form the $P$ univariate ridge-regularised characteristic forecasts $\hat{r}_{i,t}^{(j)}$ on the first 60 months of the window, transform them into pairwise encompassing contrasts $d_{i,t}^{(j)} = \hat{r}_{i,t}^{(j)} - \bar{r}_{i,t}$ over the most recent 60 months, and solve a non-negative zero-sum LASSO ($\mathbf{1}^\top \bm{\theta} = 0$) so the combination weights $\mathbf{w} = \frac{1}{P}\mathbf{1} + \bm{\theta}$ lie strictly on the simplex $\Delta^{P-1}$.
3. **Final Signal Blend**: The 50/50 average of `S-LASSO` and `C-LASSO` is rank-standardised cross-sectionally and blended $75\% / 25\%$ with our pre-registered three-model ensemble (value-weighted LightGBM + ElasticNet + residual MLP).

### Layer 2: Anomaly Augmentation (`elasso_plus.py`)

We augment the 153 JKP characteristics with three orthogonal anomaly channels:

- **Stambaugh, Yu, and Yuan (2012) Composite (`syy`)**: Equal-weighted orientation-aligned rank composite of 10 accounting/Distress anomalies (`o_score`, `ret_6_1`, `gp_at`, `cop_at`, `noa_at`, `ni_inc8q`, `inv_gr1`, `dbnetis_at`, `eqnetis_at`, `ope_be`).
- **Causal SEC XBRL Post-Earnings Drift (`sue_forecast`)**: Extending Bernard and Thomas (1989), a causal LightGBM model trained on point-in-time `SEC CompanyFacts` quarterly filings predicts next-quarter earnings changes, blended with an ridge residual-momentum score (Blitz, Huij, and Martens, 2011) and gated by $e^{-d_{\text{since}}/30}$ so only announcements within the past 45 days receive active weight.
- **FINRA Biweekly Short Interest (`short_ratio`)**: Negative rank of days-to-cover from settlement-lagged FINRA short-interest reports (Boehmer, Huszar, and Jordan, 2010).

### Layer 3: Mid-Month 15th Fast Refresh & Regime Dial (`fast_signals.py`)

Because high-turnover price, liquidity, and short-interest signals decay within two weeks while accounting characteristics remain stable over a month, we recompute a 9-feature fast sleeve on the 15th calendar day of each month using live daily bars and fresh FINRA settlements.

We also compute a causal regime dial $\rho_t \in [0, 1]$ combining the 63-day mean pairwise return correlation of the top-100 market-cap stocks (Pollet and Wilson, 2010) and the 21-day return of the cheapest book-to-market quintile (Cooper, Gutierrez, and Hameed, 2004). During high-correlation or value-rally squeezes, $\rho_t \to 0$ dampens momentum weights and scales up the value sleeve by $1 + 0.5(1 - \rho_t)$.

### Layer 4: Multi-Horizon Enhanced BARRA Risk Model (`risk/enhanced.py`)

Following MSCI Barra USE4 (Menchero, Orr, and Wang, 2011), we estimate a 21-factor daily cross-sectional WLS model ($W_{ii} = \sqrt{\text{ME}_i}$) with Vasicek (1973) empirical Bayes beta shrinkage, Newey and West (1987) 5-lag HAC horizon scaling, an automated Patton (2011) QLIKE / Diebold and Mariano (1995) specific-risk race between HAR-RV (Corsi, 2009) and EWMA, Connor and Korajczyk (1986) 5-factor residual PCA, and a 2-state Hamilton (1989) Markov stress mixture.

Importantly, we separate 84-day EWMA downside ($\epsilon_{i,d} < 0$) and upside ($\epsilon_{i,d} > 0$) idiosyncratic semivariances $d_{i,t}^-, d_{i,t}^+$, penalising downside residual risk on long positions and upside squeeze risk on short positions.

### Layer 5: Relax-and-Round Signed QP, Triple-Beta Guard, and `fastopt` Acceleration

The portfolio optimiser (`fiam/vfinal/construct/optimize.py`) solves a signed quadratic program with Gârleanu and Pedersen (2013) horizon-scaled transaction-cost amortisation, Corwin and Schultz (2012) + Abdi and Ranaldo (2017) TAQ-calibrated bid–ask spreads, Almgren et al. (2005) market impact, and D'Avolio (2002) tiered short borrow. It enforces simultaneous market-beta neutrality across our Kalman/Vasicek hedge beta ($|\bm{\beta}_{\text{hedge}}^\top \mathbf{w}| \le 0.02$), 60-month monthly beta ($\le 0.05$), and the average of Welch (2022) slope-winsorised age-decayed beta and Dimson (1979) 5-lead/lag sum beta ($\le 0.05$).

In the `v4b` engine (`fiam/v4b/engine/fast_optimize.py`, documented in [`fastopt/FORKFIAM.md`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/fastopt/FORKFIAM.md)), sign-fixed stage-2 QPs are dispatched directly to `fastopt`'s factored Woodbury interior-point solver, cutting single-QP solve time from $86.8\,\text{ms}$ to $20.1\,\text{ms}$ ($4.3\times$, max weight gap $3.5 \times 10^{-7}$) and end-to-end 12-month E0–E3 ladder construction from $8.73\,\text{s}$ to $2.93\,\text{s}$ ($3.0\times$).

---

## 3. Out-of-Sample Ablation and Headline Results (2021–2026)

Across the 68-month out-of-sample evaluation window (January 2021 to August 2026, 1,421 trading days), every stage of the architecture improves net risk-adjusted performance while passing all 1,421 daily mandate checks with zero breaches:

| Step | Configuration | Daily Sharpe | IR vs. T-bill + 4% | Volatility p.a. | Max Drawdown |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 1. `vfinal` | Pre-registered 3-model ensemble (100% gross) | 0.56 | -0.77 | 3.54% | -5.29% |
| 2. `E5R` | $\text{ME} \ge \$3\text{bn}$ entry gate + relax-and-round QP | 0.68 | -0.52 | 3.86% | -6.03% |
| 3. `elasso` | Monthly walk-forward E-LASSO (`S-LASSO` + `C-LASSO`) | 0.76 | -0.49 | 3.26% | -3.98% |
| 4. `el_plus` | Add SYY-10 (`syy`), XBRL SUE (`sue_forecast`), FINRA `short_ratio` | 0.88 | -0.31 | 3.32% | -2.92% |
| 5. `el_plus_bw` | Add 15th-of-month fast refresh + regime dial $\rho_t$ | 0.89 | -0.22 | 3.62% | -2.94% |
| 6. `bw_fresh` | $1.08\times$ core gross scale (up to 188% gross), $T$ close | 0.92 | -0.09 | 3.96% | -2.94% |
| 7. **`bw_fresh_lag`** | **1-session execution lag (`lag_days=1`, 5-day ladder; submitted)** | **0.89** | **-0.11** | **3.96%** | **-2.99%** |

Over the 2021–2026 window, the submitted `bw_fresh_lag` book compounds $\$1.000\text{bn}$ to $\$1.4671\text{bn}$ net of all costs ($7.00\%$ CAGR, $0.89$ daily Sharpe, $1.28$ Sortino, $-2.99\%$ max drawdown, and $+0.012$ S&P 500 beta, generating $+1.43\%$ in 2022 when the S&P 500 fell $-18.2\%$).

### Key Limitations

We highlight three limitations in the paper:

1. **Hurdle gap under high short rates**: While achieving a $0.89$ Sharpe ratio and $-2.99\%$ max drawdown, the $7.00\%$ net CAGR trails the $7.53\%$ T-bill $+ 4\%$ hurdle by $53\text{\,bps/yr}$ ($\text{IR} = -0.11$, SE $0.42$), with trading and borrow costs ($42\text{\,bps/yr}$) accounting for $72\%$ of the cumulative hurdle gap.
2. **Narrow mega-cap bull-market headwinds**: Low-volatility market-neutral books face headwinds in narrow, high-rate bull markets such as 2025 ($+2.08\%$ vs. $+8.37\%$ hurdle).
3. **Live feed cadence**: The live [**QUARCC Market Neutral US Quant Fund**](/paper-fund/quarcc-v4b) page marks the 24 August 2026 formation ($326$ names: $132$ long, $194$ short, $186\%$ gross) to daily Alpaca bars; advancing to new formations requires triggering `publish_book.py`.

---

## Read the Full Paper & Follow the Live Strategy

- **Paper PDF**: [`papers/fork-fiam/fork-fiam-2026.pdf`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/fork-fiam/fork-fiam-2026.pdf)
- **LaTeX Source**: [`papers/fork-fiam/fork-fiam-2026.tex`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/fork-fiam/fork-fiam-2026.tex)
- **Live Strategy Fact Sheet**: [**QUARCC Market Neutral US Quant Fund (`/paper-fund/quarcc-v4b`)**](/paper-fund/quarcc-v4b)
- **LinkedIn**: [**QUARCC on LinkedIn**](https://www.linkedin.com/company/quarcc/)

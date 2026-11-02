---
title: "quarcc-black: The Audited A-030 Live Strategy and Lessons from Post-Submission Research Extensions"
description: "A transparent technical review of QUARCC's US Long-Short Equities (A-030) architecture, the PR #39 look-ahead and delisting audit (Net IR 3.769, Sharpe 4.10), and why subsequent experimental rewrites (A-031 to Exp 17_3_3) did not replace the baseline."
pubDate: 2026-11-02
heroImage: ../../assets/blog/portfolio-review.svg
heroImageAlt: "Architecture of quarcc-black A-030 and post-submission experimental audit."
tags:
  - Quantitative Finance
  - Machine Learning
  - Portfolio Construction
  - Research Governance
draft: false
featured: true
---

This post accompanies our research paper, [***Tail-Weighted Cross-Sectional Forecasting, Adverse-Tail Convex Portfolio Construction, and Post-Submission Extensions in `quarcc-black`***](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/quarcc-black/quarcc-black-2026.pdf) (`quant-fund/papers/quarcc-black/`).

The audited `A-030` baseline strategy is tracked live on the [**QUARCC US Long-Short Equities**](/paper-fund/us-long-short-equities) page and shared via [**QUARCC on LinkedIn**](https://www.linkedin.com/company/quarcc/). In both the paper and this post, we keep the audited performance of the live `A-030` book strictly separate from post-`A-030` experimental branches (`A-031..A-067`, `Exp 17_3_1`, and `Exp 17_3_3`), including their negative results, risk-calibration failures, and confirmatory placebo tests.

---

## 1. The `A-030` Baseline Architecture

`A-030` (`experiments/17_3/submission/a030/MAIN.py`, contract `amendment_030.v1.json`) operates on 529,082 US stock-months (January 2015 to August 2026) across 147 cross-sectional characteristics from Jensen, Kelly, and Pedersen (2023), evaluated strictly out of sample over the 68-month window from January 2021 to August 2026:

1. **Layer 1 — Tail-Weighted Forecaster & Conformal Grinold–Kahn Alpha**: Annual walk-forward refits combine an $\ell_2$ Ridge regression ($\alpha = 1000$) and a tail-weighted XGBoost model (`xgb_tail`, weighting $|r| > Q_{0.90}(|r|)$ by $3\times$). On the top 200 long and bottom 200 short investable candidates ($P \ge \$1$, $1\%$ NAV ticket $\le 10\%\,\text{ADV20}$ and $\le 5\%$ market cap), scores are mapped to expected returns via Grinold and Kahn (2000) using leg-specific 36-month trailing rank-IC ($\mathrm{IC}^+_{\text{leg},t} = \max(0, \overline{\text{rank-IC}}_{\text{leg},t-36:t-1})$) and Mondrian conformal quantile intervals (`mcqr`; Romano, Patterson, and Candès, 2019). Because trailing rank-IC is strongly positive on the short pool ($+0.1417$ in 2021–2026) and slightly negative on the long pool ($-0.0112$), $\mathrm{IC}^+_{\text{long},t} = 0$ in $91\%$ of evaluation months: the long leg acts as a factor, beta, and industry hedge against short-leg alpha.
2. **Layer 2 — `Risk/4` Covariance, Alpha-Alignment Factor, and C5 Adverse Tail**: Combines a 19-factor covariance matrix (EWMA + Newey–West HAC + Ledoit–Wolf shrinkage), an Alpha-Alignment Factor (Ceria, Saxena, and Stubbs, 2012), own-book Galton scaling $g_t$, and a diagonal adverse-tail variance penalty $h_{\text{tail},i,t}$ beyond the 0.99 Mondrian conformal loss quantile scaled by $\frac{\alpha_{\text{tail}}}{\alpha_{\text{tail}}-2} \approx 2.82$ ($\alpha_{\text{tail}} \approx 3.1$; Taleb, 2020).
3. **Layers 3 & 4 — Deconvolved Spreads, NAV-Aware Impact, Short Carry, and Convex QP**: Penalises deconvolved high–low half-spreads ($\tau = 0.3947$, `A-029`), IBKR Pro commissions, NAV-aware Almgren et al. (2005) temporary and permanent impact (`A-028`), D'Avolio (2002) short borrow + recall carry, and 100 bps L1 turnover subject to dollar neutrality ($50\%$ long / $50\%$ short), Fama–MacBeth shrunk up/down market beta neutrality ($|\bar{\bm{\beta}}_t^\top \mathbf{w}| \le 0.05$), down-market convexity protection $(\bm{\beta}_t^+ - \bm{\beta}_t^-)^\top \mathbf{w} \ge 0$ (`A-026`), FF49 industry bounds $\pm 5\%$, and $2.5\%$ single-name caps.

---

## 2. The PR #39 Causal Audit (`amendment_5`) and Live Book

Post-submission review (PR #39, commits `df8cefe3`, `67763693`, `fc73ab4`) audited and repaired three subtle data-handling defects in the pre-PR #39 backtest:

1. **Prediction-Time Outcome Mask**: Removed `ret_exc_lead1m.notna()` from the prediction slice (which had excluded 2,311 stock-months—about 34 names/month about to halt or delist in $t+1$—from the candidate cross-section) while keeping it on the lagged training slice.
2. **Delisted Forced-Exit `ADV20` Fill**: Replaced the cross-sectional minimum fill ($\sim \$18$/day, which charged up to $244\%$ of notional in synthetic Almgren impact when a delisted name was liquidated) with the cross-sectional median.
3. **Delisting-Month Settlement**: Closed delisted holdings (189 position-months) at their last available price ($0\%$ delisting-month return rather than a uniform $-30\%$ haircut across cash mergers).

The exact 6-run causal attribution (`amendment5_attribution.json`, January 2021 to August 2026) confirms that `A-030` improves after removing all three defects:

| Run ID | Audit Stage / Fix Applied | Net IR | Sharpe | CAGR | Vol p.a. | Max DD | S&P $\beta$ | Costs/yr | Growth |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1. `a030_registered` | Pre-PR #39 submission artifact | 3.631 | 3.95 | 66.22% | 12.74% | -5.11% | +0.118 | 5.31% | 17.81x |
| 2. `pre_pr39_30pct` | Pre-PR #39 replay (-30% delist haircut) | 3.600 | 3.93 | 64.96% | 12.56% | -4.65% | +0.092 | 5.30% | 17.07x |
| 3. `pre_pr39_0pct` | Pre-PR #39 replay (0% delisting return) | 3.679 | 4.01 | 66.44% | 12.55% | -4.53% | +0.092 | 5.32% | 17.95x |
| 4. `fix1_mask_only` | Drop `ret_exc_lead1m.notna()` filter (+2,311 obs) | 3.681 | 4.01 | 65.47% | 12.39% | -4.49% | +0.093 | 5.34% | 17.37x |
| 5. `fix12_mask_adv` | Add delisted exit `ADV20` fill repair | 3.694 | 4.03 | 65.34% | 12.32% | -4.61% | +0.093 | 5.17% | 17.29x |
| 6. **`amendment_5`** | **Close delisted at last price (current `A-030`)** | **3.769** | **4.10** | **66.84%** | **12.36%** | **-4.49%** | **+0.093** | **5.18%** | **18.19x** |

On the live [**QUARCC US Long-Short Equities**](/paper-fund/us-long-short-equities) page (scaled $100\times$ from the $\$10\text{m}$ backtest ledger to a $\$1.00\text{bn}$ base), the 31 August 2026 formation ($475$ names: $294$ long, $181$ short, $100\%$ gross) is marked forward via CRSP September and Alpaca IEX October bars, reaching **$\$20.37\text{bn}$ ($+12.03\%$ live since 31 August 2026)** as of 30 October 2026.

At the same time, our internal audit (`artifacts/a030_audit/`) documents four caveats on `A-030`: (i) retained exit-only dust positions cause total holdings to exceed 500 names in 4 of 68 months (max 509 names; resolved in Control `C0` below); (ii) rolling 12-month realised S&P 500 beta ranges from $-0.31$ to $+0.99$ ($+0.78$ in 2024); (iii) the Galton scalar $g_t$ used uncentered squared returns; and (iv) the evaluation window was viewed across 65 trials through `A-030` (Deflated Sharpe Ratio $0.886$).

---

## 3. Post-`A-030` Experimental Extensions and Negative Findings

A central contribution of our paper is documenting every post-`A-030` experimental campaign in the commit history—including those that failed risk gates or confirmatory placebo tests—so that negative findings are preserved rather than buried:

| Experiment / Arm | Window | Architectural Change | Net IR | Sharpe | Vol p.a. | Max DD | Disposition / Key Finding |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Control `C0` (`A-045/056`)** | OOS 21–26 | Breach-only 500-name dust pruning + causal mask | 3.478 | 3.80 | 12.38% | -4.60% | Strictly $\le 500$ names every month ($\beta = +0.098$) |
| **`A-058` (`T1` normal-rank)** | OOS 21–26 | Drop Platt; monotone $\Phi^{-1}((\mathrm{rank}-0.5)/N)$ blend | 3.555 | 3.90 | 11.52% | -4.40% | Higher SR/IR, but $-2.12\%$/yr return vs. `C0` |
| **`A-061` (Arm `V` vol-target)** | OOS 21–26 | Ex-ante $\sigma^* = 8\%$ target (gross $0.62$) + `L2` cap | 3.697 | 4.16 | 8.70% | -3.50% | Same return–risk frontier as `C0` (`A-067F`); $-11.1\%$/yr ret |
| **`A-063` (Compiler v2)** | Dev 16–20 | Centered AAF + single-stage Markowitz++ QP | 1.040 | 1.59 | 7.30% | -5.90% | Stopped on Dev ($< 1.41$ `C0` baseline) |
| **`A-066` (Dinkelbach IR)** | Dev 16–20 | Whole-pool fractional IR maximiser ($N \approx 3{,}500$) | 0.240 | 0.56 | 16.50% | -16.50% | Failed ($z=-2.26$); synthetic projection-reversal shorts |
| **`A067L` (Meta-LightGBM)** | Dev 16–20 | Secondary LightGBM arithmetic-return meta-model | 0.620 | 0.81 | 32.00% | -57.00% | Failed; 51% of $L_2$ loss sat in microcap short squeezes |
| **`A067P` (Parametric policy)** | OOS 21–26 | Differentiable PyTorch linear/gated policy | — | 0.29 | 1.80% | -2.10% | Lost money on Dev; collapsed to near-cash OOS (2.5% gross) |
| **`A067S` (Rev. 2 separated)** | OOS 21–26 | LightGBM–Huber + James–Stein $\kappa_t$ + 100-name floor | 2.290 | 2.43 | 29.80% | -28.80% | 48.7x compound growth, but failed vol/DD and $\beta = +0.77$ |
| **`Exp 17_3_1` (System `F`)** | Synth $4\times 72$m | QLIKE + USE4 eigenfactor + EB beta + OBS pruning | — | — | — | — | Failed shuffled-forecast placebo gate ($z = 1.78 < 3.0$); 5m real |
| **`Exp 17_3_3` (`R1S` Win. 1)** | Real 16–20 | Bayesian size-quintile specific variance shrinkage | — | 2.47 | 10.42% | -6.69% | Only arm completing all 54m ($+0.92\%$/mo vs. `B0`, $p=0.23$) |
| **`Exp 17_3_3` (Phase 8 `F`)** | Synth $144$m | Registered confirmation vs. $K=16$ shuffled placebos | — | 2.33 | — | — | **Null**: $-0.865\%$/mo vs. placebo ($p=0.283$, rank 16/16) |

### Key Takeaways from the Post-`A-030` Audit

1. **Co-Adaptation & Median vs. Mean Short Decay (`BLEND_REVIEW.md`)**: Retraining XGBoost on ranks (`A-051`) raised whole-panel IC twentyfold ($0.003 \to 0.062$) yet lowered portfolio IR because `A-030`'s optimizer was co-adapted to raw-return tail scores. Moreover, $90\%$ of short P&L comes from high-borrow microcaps where scores predict the *median* return ($-1.3\%$/mo, $t=-3.5$) while right-tail short squeezes offset the arithmetic mean ($0.0\%$/mo).
2. **Matched-Risk Frontier Equivalence (`A-061` & `A-067F`)**: Volatility targeting (`A-061`, Arm `V`) achieved an OOS Sharpe of $4.16$ and $-3.50\%$ max drawdown at $0.62$ average gross, and `A-067F` proved that `C0` and `V` trace the exact same net return–risk frontier ($+0.24\%$/yr difference at $8\%$ target vol, $t = +0.19$).
3. **Why `Exp 17_3_1` and `Exp 17_3_3` Did Not Replace `A-030`**: While `e1733` delivered a clean mathematical fix for Clarabel conic ill-conditioning (`N1` exact diagonal preconditioning to $2.6 \times 10^{-18}$ accuracy) and showed that Bayesian size-quintile specific-risk shrinkage (`R1S`) prevented the March 2020 solver crash on Window 1 (`2016–2020`), real-data Window 2 (`2021–2026`) was never unlocked, and in the registered 144-month confirmatory placebo test (`P7_CONFIRMATION_A10_001`) System `F` underperformed its 16 cross-sectionally shuffled-forecast placebos by $-0.865\%$/mo ($p = 0.283$, rank 16 of 16).

---

## Read the Full Paper & Track the Live `A-030` Book

- **Paper PDF**: [`papers/quarcc-black/quarcc-black-2026.pdf`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/quarcc-black/quarcc-black-2026.pdf)
- **LaTeX Source**: [`papers/quarcc-black/quarcc-black-2026.tex`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/quarcc-black/quarcc-black-2026.tex)
- **Live `A-030` Strategy Fact Sheet**: [**QUARCC US Long-Short Equities (`/paper-fund/us-long-short-equities`)**](/paper-fund/us-long-short-equities)
- **LinkedIn**: [**QUARCC on LinkedIn**](https://www.linkedin.com/company/quarcc/)

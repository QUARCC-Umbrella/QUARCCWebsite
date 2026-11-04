---
title: "QUARCC Purple: A Market-Neutral US Equity Fund for the McGill-FIAM 2026 Final"
description: "How the QUARCC Purple team built a simulated $1 billion market-neutral fund: encompassing LASSO forecasts, a semivariance risk model, and relax-and-round construction, and why it still trails its T-bill-plus-4% benchmark."
pubDate: 2026-11-02
updatedDate: 2026-11-04
heroImage: ../../assets/blog/quarcc-purple-value.svg
heroImageAlt: "Line chart of $1 billion from January 2021 to August 2026. QUARCC Purple ends at $1.467 billion, T-bill plus 4% at $1.509 billion, and the S&P 500 price index at $2.046 billion."
tags:
  - Quantitative Finance
  - Portfolio Construction
  - Machine Learning
draft: false
featured: true
---

QUARCC Purple is a simulated \$1 billion US equity fund built for the final round of the McGill-FIAM Asset Management Hackathon 2026. The mandate is market-neutral and the benchmark is the 3-month T-bill plus 4% a year.

From January 2021 to August 2026, after modelled costs, the fund grows to \$1.467 billion: a 7.00% CAGR with 3.96% volatility, a Sharpe ratio of 0.91, a maximum drawdown of −2.99%, and an S&P 500 beta of 0.012. It does not beat its benchmark. The information ratio is −0.11 with a standard error of 0.42.

The code and locked results are public in the [QuarccPurple repository](https://github.com/NicholasXydis/QuarccPurple). There is also a [fact sheet](https://github.com/NicholasXydis/QuarccPurple/blob/main/finals/QUARCC_Purple_Fact_Sheet.pdf), a [project site](https://quarccpurple.ca), and a [paper (PDF)](/papers/quarcc-purple-market-neutral-2026.pdf) with the full method and references.

## Mandate

The fund must hold 200 to 500 names, with gross exposure of at most 200%, net exposure within ±50%, a 5% single-name limit, sector net exposure within ±20%, and no short below a \$500 million market capitalisation. We add tighter limits of our own, including a \$3 billion floor on new positions.

## Forecasting

**Encompassing LASSO.** The forecaster follows Han, He, Rapach, and Zhou (2019). Each month it fits a value-weighted LASSO on all predictors jointly and a second LASSO that selects among univariate forecasts. A Chong and Hendry (1986) encompassing regression then sets the weight between them:

$$
\hat{y}_{i,t} = (1 - \bar{\lambda}_t)\,\hat{y}_{i,t}^{\text{S}} + \bar{\lambda}_t\,\hat{y}_{i,t}^{\text{C}}.
$$

The target is the centred cross-sectional rank of each stock's CAPM beta-adjusted return, so the model is not rewarded for simply loading on high-beta tails.

**Anomaly augmentation.** To the 147 characteristics of Jensen, Kelly, and Pedersen (2023), we add three signals:

- A mispricing composite after Stambaugh, Yu, and Yuan (2012), averaging signed ranks of ten anomalies available in the panel.
- A walk-forward LightGBM forecast of next-quarter earnings surprises.
- Short interest, used only once its settlement date is public.

The [US Long-Short Portfolio](/blog/us-long-short-portfolio) takes a different route through the same panel. It finds that forecast skill sits heavily in small-capitalisation shorts, which this mandate largely excludes, and that contrast is worth reading alongside this fund.

**Market-state dial.** A $3 \times 2$ grid of correlation regime and trailing HML sign scales forecasts by how well the model has done in similar states, shrunk toward its overall record with $N_0 = 12$:

$$
\rho_t = \mathrm{clip}\!\left(\frac{n_{\text{cell}}\,\overline{\mathrm{IC}}_{\text{cell},t} + N_0\,\overline{\mathrm{IC}}_{\text{all},t}}{(n_{\text{cell}} + N_0)\,\overline{\mathrm{IC}}_{\text{all},t}},\, 0,\, 1.5\right).
$$

At each mid-month formation, nine price signals are refreshed using the latest 21 days of returns, with coefficients held fixed.

## Risk

The covariance combines a market factor, 11 GICS sectors, five styles, and five residual principal components. Factor covariance is extended to the holding horizon $H$ with lagged autocovariances:

$$
\widetilde{\mathbf{F}}^{(H)} = H\boldsymbol{\Gamma}_0 + \sum_{j=1}^{H-1}(H - j)\big(\boldsymbol{\Gamma}_j + \boldsymbol{\Gamma}_j^\top\big).
$$

Specific risk comes from a QLIKE race (Patton, 2011) between HAR and EWMA forecasts, split into downside and upside semivariances. Longs are charged downside variance and shorts upside variance. A two-state Markov stress probability then mixes in a stressed factor matrix.

## Construction

A book is formed at each month-end and mid-month, 136 in all, and is traded in equal fifths over five sessions with a 10% daily volume limit. The final program trades expected return against risk, beta, borrow, costs, and low feature coverage:

$$
\begin{aligned}
\min_{\mathbf{w}} \;\; & -\boldsymbol{\mu}_t^{(H)\top}\mathbf{w} + \frac{\gamma}{2}\Big(\mathbf{w}^\top \mathbf{B}_t \mathbf{F}_t^{(H)}\mathbf{B}_t^\top \mathbf{w} + H\sum_i d_{i,t}^{\pm} w_i^2\Big) \\
& + \lambda_\beta\big(\boldsymbol{\beta}_{\text{hedge}}^\top \mathbf{w}\big)^2 + \frac{H}{252}\mathbf{b}_t^\top \mathbf{w}^- + \sum_i \frac{\lambda_u H d_{i,t}}{c_{i,t}}w_i^2 + \mathrm{TC}(\mathbf{w} - \mathbf{w}_{\text{pre}}) + \text{penalties},
\end{aligned}
$$

with $\gamma = 0.25$ and $\lambda_\beta = 10$. To meet the name limit and a 10 bp minimum position, we solve the relaxation, keep at most 440 names, lock their signs, and re-solve with Clarabel through CVXPY. Beta is limited on three separate estimators, and sector net is held within ±1%, far tighter than the mandate requires.

Eight local language-model agents read filings, draft commentary, measure crowding, and challenge the book. None of them sets a weight.

## Results

| Metric | QUARCC Purple | T-bill + 4% | S&P 500 |
| --- | ---: | ---: | ---: |
| Ending value of \$1.000bn | \$1.467bn | \$1.509bn | \$2.046bn |
| CAGR | 7.00% | 7.53% | 13.47% |
| Volatility | 3.96% | | 15.10% |
| Sharpe ratio | 0.91 | | 0.70 |
| Sortino ratio | 4.21 | | 1.51 |
| Maximum drawdown | −2.99% | | −25.43% |
| Beta to the S&P 500 | 0.012 | | 1.00 |
| Information ratio vs. T-bill + 4% | −0.11 | | |

| Year | Fund | T-bill + 4% |
| --- | ---: | ---: |
| 2021 | 6.98% | 4.12% |
| 2022 | 1.34% | 6.19% |
| 2023 | 15.10% | 9.45% |
| 2024 | 11.16% | 9.34% |
| 2025 | 2.08% | 8.37% |
| 2026 (to August) | 3.62% | 5.21% |

The book holds 246 to 357 names, with gross exposure averaging 136.5%, and records zero rule breaches. Of the \$467 million net profit, stock positions contribute \$258 million, cash interest \$240 million, and costs take \$30 million. Interest is nearly half of gross profit, which is why the T-bill-based hurdle is the fair comparison.

## Limitations

- **It misses the benchmark.** The fund trails its hurdle by 53 bps a year, and costs equal 72% of the cumulative shortfall. The information ratio before costs is about zero. A standard error of 0.42 cannot separate a modest edge from none.
- **It is not a clean holdout.** Forecasts are walk-forward, but construction settings, including the final gross scale, were chosen with 2021 to 2026 visible.
- **It lags when markets run.** The fund trailed the hurdle in 2022, 2025, and 2026 to date. Gross averaged 136.5%, well below the 200% limit, because the optimiser builds positions slowly.
- **Execution is modelled.** No order was placed. Fills, borrow, and impact at \$1 billion may differ. Our [paper-fund page](/paper-fund) marks a single frozen 24 August 2026 formation forward with market data. It is not a live record.

## Read more

- [Paper (PDF)](/papers/quarcc-purple-market-neutral-2026.pdf)
- [QuarccPurple on GitHub](https://github.com/NicholasXydis/QuarccPurple)
- [Fact sheet (PDF)](https://github.com/NicholasXydis/QuarccPurple/blob/main/finals/QUARCC_Purple_Fact_Sheet.pdf)
- [US Long-Short Portfolio](/blog/us-long-short-portfolio)

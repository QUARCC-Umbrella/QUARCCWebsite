---
title: "Are Lagging Indicators Better Than Nothing?"
description: "Credit spreads, volatility ranges, sentiment, and margin debt all report on conditions that have already arrived. Tested against a geometric Brownian market, they help forecast risk but not direction."
pubDate: 2026-11-02
updatedDate: 2026-11-04
heroImage: ../../assets/blog/risk-regime-stress-index.svg
heroImageAlt: "Line chart of the monthly composite stress index from July 1999 to September 2026, peaking at 4.13 in October 2008 and ending at -0.24."
tags:
  - Risk Management
  - Regime Switching
  - Quantitative Finance
draft: false
featured: false
---

A credit spread widens once lenders are already concerned. Bearish surveys follow falling prices, and margin debt is reported weeks late. If markets absorb news quickly, signals like these arrive too late to matter. So are they better than nothing?

We tested a stress index built from them on 326 months of the S&P 500. For risk, it's clearly better than nothing, although it's weaker than the VIX. For direction, it isn't. The full analysis is in the [paper (PDF)](/papers/lagging-indicators-2026.pdf).

## Why a late signal could still help

A lagging indicator doesn't need to lead the market. It only needs the state of the market to last longer than the delay in observing it, and there are economic reasons to expect that:

- **Funding spirals persist.** Intermediaries that lose capital cut lending, which depresses prices and tightens funding further (Brunnermeier and Pedersen, 2009).
- **Credit prices risk appetite.** Spreads carry a premium that reflects the risk-bearing capacity of lenders (Gilchrist and Zakrajšek, 2012).
- **Volatility clusters.** Turbulent months tend to follow turbulent months (Mandelbrot, 1963; Engle, 1982).

That argument favours forecasting risk over forecasting returns, because a signal everyone can see should already be in prices.

## What "nothing" means

We define "nothing" as a geometric Brownian motion fitted to S&P 500 excess returns from August 1999 to September 2026:

$$
\frac{dP_t}{P_t} = \mu\,dt + \sigma\,dW_t,
$$

with an annualised log mean of 6.28% and volatility of 15.24%. In this market, the past says nothing about the future, so an indicator can only add noise. QUARCC's long-short equity research uses the same idea to validate portfolio pipelines, running them on Brownian markets where no real edge can exist.

The fit gets the scale of the market about right, but not its time structure:

| Statistic | S&P 500 | Brownian market, 5th to 95th percentile |
| --- | ---: | ---: |
| Worst month | −16.9% | −14.2% to −9.3% |
| Maximum drawdown | 55.6% | 24.5% to 57.8% |
| Autocorrelation of squared returns | 0.31 | 95th percentile 0.09 |

## The index

The index gives equal weight to five public series, each standardised against its own history up to that month:

$$
S_t = 0.2\left(z_t^{\text{HY}} + z_t^{\text{IG}} + z_t^{\text{VIX}} + z_t^{\text{AAII}} - z_t^{\text{MD}}\right).
$$

These are high-yield and investment-grade credit spreads, the within-month range of the VIX, the AAII bearish reading, and six-month growth in margin debt. The weights aren't fitted to returns. The index has a monthly autocorrelation of 0.87, a half-life of about five months, so a one-month delay costs little. All tests use $S_{t-1}$ to describe month $t$.

## Risk: better than nothing

We forecast next-month log realised variance over 266 out-of-sample months, against a constant-variance Brownian benchmark.

| Predictor | Out-of-sample $R^2$ | $t$-statistic |
| --- | ---: | ---: |
| Stress index | 0.463 | 4.02 |
| Last month's realised variance | 0.420 | 3.36 |
| Stress index + realised variance | 0.486 | 4.05 |
| VIX | 0.560 | 4.45 |
| Stress index + VIX | 0.578 | 4.72 |

The index beats the benchmark and adds to last month's variance ($t = 2.70$). The VIX sets a higher bar because option prices look forward. Adding the index to the VIX isn't a significant improvement ($t = 0.94$).

## Direction: no better than nothing

| $S_{t-1}$ | Months | Annual excess return | Annual volatility | Worst month |
| --- | ---: | ---: | ---: | ---: |
| Below $-0.5$ | 45 | 10.1% | 11.7% | −4.5% |
| $-0.5$ to $0$ | 133 | 13.1% | 12.4% | −8.0% |
| $0$ to $0.5$ | 71 | 7.6% | 18.8% | −9.4% |
| $0.5$ to $1$ | 33 | 3.9% | 20.8% | −8.4% |
| $1$ and above | 44 | −9.8% | 35.1% | −16.9% |

Volatility triples across these buckets. Returns fall too, but the full-sample regression isn't significant ($t = -1.57$), and the out-of-sample $R^2$ for returns is zero.

## Scaling exposure

A forecast of risk can still pay if you hold less when risk is high. This rule holds the S&P 500 with weight

$$
g_t = \mathrm{clip}\big(1 - \lambda\max(S_{t-1}, 0),\, 0.5,\, 1\big)
$$

and keeps the rest in Treasury bills.

| Rule | Excess return | Volatility | Sharpe ratio | Maximum drawdown |
| --- | ---: | ---: | ---: | ---: |
| Unscaled | 7.45% | 15.15% | 0.49 | 50.9% |
| $\lambda = 0.1$ | 7.68% | 13.93% | 0.55 | 40.9% |
| $\lambda = 0.3$ | 7.72% | 12.47% | 0.62 | 32.7% |
| $\lambda = 0.5$ | 7.75% | 11.71% | 0.66 | 29.1% |

None of 10,000 simulated Brownian markets matches any of these gains. For $\lambda = 0.3$, the Sharpe ratio rises by 0.127, against a placebo range of −0.055 to +0.043.

The gain is uneven, though. It's +0.167 in 1999–2012 and only +0.018 since 2013, and dropping the seven months from September 2008 removes about half of it. It behaves more like insurance against a rare regime than a steady source of return.

## A portfolio that is already neutral

We also tested the rule on the simulated [US Long-Short Portfolio](/blog/us-long-short-portfolio), over 68 months from January 2021. Its stress-change beta is $-0.0050$ ($t = -0.39$), and scaling with $\lambda = 0.3$ lowers its Sharpe ratio from 4.10 to 4.01. Cutting exposure removed profitable months without reducing a risk the portfolio carried. The sample has only 2 months with stress of 1 or more, so this says little about a true crisis.

## Limitations

- **Few episodes.** The sample holds few independent stress episodes, and 2008 drives much of the result.
- **Current data vintages.** The computation uses no future data, but revised series may differ from what was seen at the time.
- **Several rules, no adjustment.** The values of $\lambda$ weren't chosen out of sample, and we don't adjust for testing several rules.
- **Before costs.** Rule results exclude trading costs.
- **Simulated portfolio.** The long-short returns are simulated.

The code is not publicly available.

## Read more

- [Paper (PDF)](/papers/lagging-indicators-2026.pdf)
- [US Long-Short Portfolio](/blog/us-long-short-portfolio)

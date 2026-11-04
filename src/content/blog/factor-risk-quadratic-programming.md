---
title: "Factor-Risk Quadratic Programming: Keeping Risk Factored Through the Newton Step"
description: "A primal-dual interior-point method for long-short portfolio construction that exploits the low-rank structure of factor risk, with benchmarks against CVXPY, Clarabel, and SLSQP, and the limits of what those benchmarks show."
pubDate: 2026-11-02
updatedDate: 2026-11-04
heroImage: ../../assets/blog/factor-risk-qp-solve-time.svg
heroImageAlt: "Bar chart of median solve time on a synthetic 1,000-security problem: CVXPY with Clarabel 1,275.5 milliseconds, hand-built sparse Clarabel 97.7, factored interior point 25.3."
tags:
  - Quantitative Finance
  - Portfolio Construction
  - Convex Optimization
draft: false
featured: true
---

Long-short portfolio research solves the same convex quadratic program thousands of times, across gross targets, support sizes, and formation dates. Those programs share a structure that general-purpose modelling tools discard: the covariance is a low-rank factor term plus a diagonal.

This note describes the interior-point method QUARCC built to keep that structure through the solve. On a synthetic 1,000-security problem with rank 43, it takes 25.3 ms in a single thread, against 97.7 ms for a hand-built sparse Clarabel model and 1,275.5 ms for CVXPY with Clarabel. The full derivation and every benchmark are in the [paper (PDF)](/papers/factor-risk-qp-2026.pdf).

## The problem

The kernel is a QP in weights $\mathbf{x} \in \mathbb{R}^n$ with box bounds, two-sided exposure bands, and linear equalities:

$$
\min_{\mathbf{x}} \; \tfrac{1}{2}\mathbf{x}^\top \mathbf{P}\mathbf{x} + \mathbf{q}^\top \mathbf{x}
\quad \text{s.t.} \quad
\boldsymbol{\ell} \le \mathbf{x} \le \mathbf{u},\;\;
\mathbf{g}_\ell \le \mathbf{G}\mathbf{x} \le \mathbf{g}_u,\;\;
\mathbf{A}\mathbf{x} = \mathbf{b}.
$$

For factor exposures $\mathbf{B}$, factor covariance $\mathbf{F}$, and specific variances $\mathbf{d}$, risk is $\boldsymbol{\Sigma} = \mathbf{B}\mathbf{F}\mathbf{B}^\top + \mathrm{diag}(\mathbf{d})$, so the Hessian can be written as a low-rank term plus a diagonal, $\mathbf{P} = \mathbf{U}\,\mathrm{diag}(\mathbf{c})\,\mathbf{U}^\top + \mathrm{diag}(\mathbf{p}_d)$.

A modelling layer that forms $\boldsymbol{\Sigma}$ densely pays $O(n^2 k)$ before the solver starts. A hand-built sparse model with auxiliary factor variables avoids most of that and is the fairer baseline, but it still repeats cone setup and general factorisation on every call.

## The method

We use a Mehrotra (1992) predictor-corrector. Eliminating slacks and inequality multipliers reduces each Newton step to

$$
\mathbf{M}\,\Delta\mathbf{x} + \mathbf{A}^\top \Delta\mathbf{y} = \mathbf{r}_{\text{rhs}},
\qquad
\mathbf{A}\,\Delta\mathbf{x} = -\mathbf{r}_e.
$$

Bound barriers only change a diagonal, and bands add one low-rank column each, so $\mathbf{M} = \mathbf{H} + \mathbf{U}_{\text{aug}}\,\mathrm{diag}(\mathbf{c}_{\text{aug}})\,\mathbf{U}_{\text{aug}}^\top$ with $\mathbf{H}$ diagonal and rank $r = k + m$ for $k$ factors and $m$ bands. By the Woodbury identity,

$$
\mathbf{M}^{-1}\mathbf{V} = \mathbf{H}^{-1}\mathbf{V} - \mathbf{H}^{-1}\mathbf{U}_{\text{aug}}\mathbf{K}^{-1}\mathbf{U}_{\text{aug}}^\top\mathbf{H}^{-1}\mathbf{V},
\qquad
\mathbf{K} = \mathrm{diag}(\mathbf{c}_{\text{aug}})^{-1} + \mathbf{U}_{\text{aug}}^\top\mathbf{H}^{-1}\mathbf{U}_{\text{aug}}.
$$

Per-iteration linear algebra falls from $O(n^3)$ to $O(nr^2 + r^3)$, and equalities add only a small Schur complement. Across a rebalance ladder $\mathbf{U}$, $\mathbf{G}$, and $\mathbf{A}$ do not change, so that setup is cached and each rung goes straight into the iteration loop.

Three outer routines stay inside the same structure: bisection on risk aversion for a hard volatility cap, iteratively reweighted least squares for L1 turnover, and quadratic penalties for soft bands.

## Benchmarks

All problems are synthetic. Runs use one thread on a 2-vCPU Linux VM at tolerance $10^{-8}$ and report medians of repeated runs. Speedup and gaps are measured against the first row of each group, and the ladder has 36 rungs.

| Workload | Solver path | Median (ms) | Speedup | Objective gap | Weight gap |
| --- | --- | ---: | ---: | ---: | ---: |
| $n = 300$, $r = 43$ | CVXPY + Clarabel | 88.3 | baseline | 0 | 0 |
| | This method | 10.0 | 8.8× | 2.1e-6 | 4.4e-4 |
| $n = 1000$, $r = 43$ | CVXPY + Clarabel | 1,275.5 | baseline | 0 | 0 |
| | Sparse Clarabel | 97.7 | 13.1× | 2.1e-10 | 2.3e-7 |
| | This method | 25.3 | 50.4× | 5.3e-6 | 5.3e-4 |
| Ladder, $n = 500$, per solve | CVXPY rebuild | 285.5 | baseline | 0 | 0 |
| | Sparse Clarabel | 47.2 | 6.0× | | |
| | This method, compiled | 15.1 | 18.9× | 3.2e-6 | 5.5e-4 |

The headline 50× mostly measures modelling overhead. Against the sparse model, the fairer comparison, the gain is 3.9× at $n = 1000$ and 3.1× on the ladder. In a synthetic 12-month run of a four-stage market-neutral construction at $n = 400$, total runtime falls from 8.73 s to 2.93 s. Exact final QPs alone reach 6.50 s; the rest of the saving comes from deliberate approximations.

## What this does not show

- **It is not an investment result.** The benchmarks measure runtime on synthetic problems. No published QUARCC return depends on this solver: [QUARCC Purple](/blog/quarcc-purple-market-neutral-us-equities)'s submitted book and the [US Long-Short Portfolio](/blog/us-long-short-portfolio) were both solved with Clarabel.
- **Weights differ.** Gaps near $5 \times 10^{-4}$ come mainly from the default quadratic soft-band penalty. A loose-tolerance preview is faster, with gaps up to $1.9 \times 10^{-2}$, so we use it to rank candidates and not as a book.
- **Signs must be fixed.** Free-sign support selection with minimum positions still needs an outer ladder or a first-stage sign assignment.
- **A contact-ratio screen is only a heuristic.** Motivated by jamming in constrained perceptrons (Franz and Parisi, 2016), it separated failed ladder rungs from successful ones on 16 labelled formations, but the two failures come from one calendar month.

The solver is an internal research tool and is not publicly released at this time.

## Read more

- [Paper (PDF)](/papers/factor-risk-qp-2026.pdf)

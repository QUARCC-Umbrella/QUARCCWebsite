---
title: "fastopt: Structure-Exploiting Factor-Risk Quadratic Programming for One-Shot and Ladder Portfolio Construction"
description: "How keeping factor covariance factored inside a Mehrotra predictor-corrector Woodbury kernel cuts 1,000-name portfolio QP solve times to 14.8-25.3 ms and accelerates Forkfiam E0-E3 ladders by 3.0x."
pubDate: 2026-11-02
heroImage: ../../assets/blog/market-microstructure.svg
heroImageAlt: "Diagram of fastopt's factored Woodbury interior-point solver and rebalance ladder compilation."
tags:
  - Optimization
  - Quantitative Finance
  - Numerical Linear Algebra
  - Portfolio Construction
draft: false
featured: true
---

This post accompanies our research paper, [***Structure-Exploiting Factor-Risk Quadratic Programming for One-Shot and Ladder Portfolio Construction***](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/fastopt/fastopt-2026.pdf) (`quant-fund/papers/fastopt/`), which documents `fastopt` (`quant-fund/fastopt`) and its integration into our live strategy engines ([**QUARCC Market Neutral US Quant Fund**](/paper-fund/quarcc-v4b), [**QUARCC US Long-Short Equities**](/paper-fund/us-long-short-equities), and [**QUARCC on LinkedIn**](https://www.linkedin.com/company/quarcc/)).

---

## 1. Why Generic Conic Canonicalisation Is Slow on Factor-Risk QPs

In equity long–short portfolio construction, the covariance matrix of asset returns almost always decomposes into a low-rank factor block and a strictly positive diagonal specific-risk vector:

$$
\bm{\Sigma} = \mathbf{B}\mathbf{F}\mathbf{B}^\top + \mathrm{diag}(\mathbf{d}), \qquad \mathbf{B} \in \mathbb{R}^{n \times k}, \quad \mathbf{F} \in \mathbb{S}_+^k, \quad \mathbf{d} \in \mathbb{R}_{++}^n.
$$

In `Forkfiam` (`v4b`), $n \in [200, 1000]$ candidate equities are optimised against $k = 21$ factors, $m \approx 22$ two-sided sector/style/beta exposure bands $\mathbf{g}_\ell \le \mathbf{G}\mathbf{x} \le \mathbf{g}_u$, box bounds $\bm{\ell} \le \mathbf{x} \le \mathbf{u}$, and $p \in \{1, 2\}$ linear equalities $\mathbf{A}\mathbf{x} = \mathbf{b}$.

When formulated in CVXPY via $\frac{1}{2}\mathbf{x}^\top \bm{\Sigma}\mathbf{x}$ and solved with Clarabel:

1. **Dense matrix assembly** materialises $\bm{\Sigma} \in \mathbb{R}^{n \times n}$ at $O(n^2 k)$ cost on every call.
2. **Conic canonicalisation** factorises an $O(n)$-dimensional system at $O(n^3)$ cost per interior-point step.
3. **Rebalance ladders** (such as a 36-rung sweep over support sizes and gross targets) rebuild the expression tree and symbolic factorisation from scratch on every rung.

---

## 2. The Factored Woodbury Interior-Point Kernel

`fastopt` (`fastopt/src/fastopt/ipm.py`) implements a primal–dual Mehrotra (1992) predictor–corrector interior-point method directly on the factored quadratic operator:

$$
\mathbf{P} = \mathbf{U}\,\mathrm{diag}(\mathbf{c})\,\mathbf{U}^\top + \mathrm{diag}(\mathbf{p}_d), \qquad \mathbf{U} = \mathbf{B}\mathbf{V}\bm{\Lambda}^{1/2} \in \mathbb{R}^{n \times k}, \quad \mathbf{p}_d = \gamma\mathbf{d} + \bm{\tau}_2.
$$

Rank-one quadratic penalties—such as a dollar-net penalty $\frac{1}{2}\rho_{\text{net}}(\mathbf{1}^\top \mathbf{x})^2$ or soft beta target $\frac{1}{2}\lambda_j(\mathbf{v}_j^\top \mathbf{x} - \beta_{0,j})^2$—simply append columns to $\mathbf{U}$ and weights to $\mathbf{c}$.

At each interior-point step, pivoting out the slack and dual increments $(\Delta\mathbf{s}, \Delta\mathbf{z})$ condenses the Karush–Kuhn–Tucker normal equations into a diagonal-plus-low-rank primal Hessian $\mathbf{M} \in \mathbb{S}_{++}^n$ of fixed rank $r = \mathrm{col}(\mathbf{U}) + m$:

$$
\mathbf{M} = \mathbf{H} + \mathbf{U}_{\text{aug}}\,\mathrm{diag}(\mathbf{c}_{\text{aug}})\,\mathbf{U}_{\text{aug}}^\top, \qquad \mathbf{U}_{\text{aug}} = [\mathbf{U}, \mathbf{G}^\top] \in \mathbb{R}^{n \times r},
$$

where $\mathbf{H} = \mathrm{diag}(\mathbf{p}_d + \mathbf{w}_{\text{hi}} + \mathbf{w}_{\text{lo}} + 10^{-12}\mathbf{1}_n)$ is strictly diagonal. Applying the Sherman–Morrison–Woodbury identity reduces the inversion of $\mathbf{M}$ to an $r \times r$ capacitance matrix $\mathbf{K}$:

$$
\mathbf{K} = \mathrm{diag}(\mathbf{c}_{\text{aug}})^{-1} + \mathbf{U}_{\text{aug}}^\top \mathbf{H}^{-1}\mathbf{U}_{\text{aug}} \in \mathbb{R}^{r \times r}, \qquad \mathbf{M}^{-1}\mathbf{V} = \mathbf{H}^{-1}\mathbf{V} - \mathbf{H}^{-1}\mathbf{U}_{\text{aug}}\mathbf{K}^{-1}\!\left(\mathbf{U}_{\text{aug}}^\top \mathbf{H}^{-1}\mathbf{V}\right),
$$

followed by a tiny $p \times p$ Schur complement $\mathbf{S} = \mathbf{A}\mathbf{M}^{-1}\mathbf{A}^\top$ for the equality constraints. Both the affine-scaling predictor and the Mehrotra corrector reuse the same $\mathbf{K}$ and $\mathbf{S}$ factorisations, reducing per-iteration cost to $O(n r^2 + r^3)$.

### Outer Loops, `CompiledQP`, and Fast Screening

- **Static Ladder Compilation (`CompiledQP`)**: Precomputes and caches $\mathbf{U}_{\text{aug}}$, its transpose, and active-bound masks once across a rebalance ladder so individual rungs only update $\mathbf{q}$ and $\mathbf{b}$.
- **Hard Risk Cap & IRLS L1 Turnover**: Bisects on the risk-aversion multiplier $\gamma + \lambda$ with primal/equality-dual warm starts when an ex-ante variance cap $\mathbf{x}^\top\bm{\Sigma}\mathbf{x} \le \sigma_{\max}^2$ is binding, and majorises L1 turnover $\sum_i \tau_{1,i}|x_i - x_{i,\text{prev}}|$ via iteratively reweighted least squares (slicing $\mathbf{x}_{1:n}$ cleanly when combined with a risk cap).
- **6-Iteration Preview (`preview_solve`) & Jamming Contact Screen (`ContactModel`)**: Stopping the solver at $\mathrm{tol}=10^{-3}$ and 6 iterations screens candidate books $2.8\times$–$5.1\times$ faster than an exact solve, while the dimensionless constraint-contact ratio $\rho_{\text{contact}}$ flags over-constrained first-rung books before running a full ladder.

---

## 3. Benchmarks: One-Shot, Rebalance Ladder, and End-to-End `Forkfiam`

We verified all 32 CPU unit and reference tests (`pytest fastopt/tests -q`: 32 passed, 2 accelerator-hardware tests skipped) and benchmarked `fastopt` under single-threaded BLAS execution (`OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 taskset -c 0`) on both the 2-vCPU Reference VM (`fastopt/README.md`) and a single core of an AMD Ryzen 5 3600 Validation Host:

| Workload | Solver Path | Ref. VM (ms) | Val. Host (ms) | Speedup vs. CVXPY (Ref./Val.) | Speedup vs. Clarabel (Ref./Val.) | Objective Gap | Max $\|\Delta x_i\|$ |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **One-shot ($n=300, r=43$)** | `cvxpy+clarabel` | 88.3 | 79.5 | 1.0x / 1.0x | — | 0 | 0 |
| | `clarabel-direct` | 26.4 | 19.9 (21.5) | 3.3x / 4.0x | 1.0x / 1.0x | $2.1\times 10^{-9}$ | $1.2\times 10^{-5}$ |
| | **`fastopt` (12 iters)** | **10.0** | **7.1** | **8.8x / 11.2x** | **2.6x / 2.8x** | $2.1\times 10^{-6}$ | $4.4\times 10^{-4}$ |
| **One-shot ($n=1000, r=43$)** | `cvxpy+clarabel` | 1,275.5 | 949.3 | 1.0x / 1.0x | — | 0 | 0 |
| | `clarabel-direct` | 97.7 | 72.6 (71.1) | 13.1x / 13.1x | 1.0x / 1.0x | $2.1\times 10^{-10}$ | $2.3\times 10^{-7}$ |
| | **`fastopt` (18 iters)** | **25.3** | **14.8** | **50.4x / 64.1x** | **3.9x / 4.9x** | $5.3\times 10^{-6}$ | $5.3\times 10^{-4}$ |
| **Ladder ($n=500, 36\times$, /solve)** | `cvxpy` rebuild | 285.5 | 258.0 | 1.0x / 1.0x | — | 0 | 0 |
| | `clarabel-direct` | 47.2 | 40.0 | 6.0x / 6.5x | 1.0x / 1.0x | — | — |
| | **`fastopt CompiledQP`** | **15.1** | **10.5** | **18.9x / 24.7x** | **3.1x / 3.8x** | $3.2\times 10^{-6}$ | $5.5\times 10^{-4}$ |
| **`quarcc-black` ($n=100$)** | `scipy SLSQP` | 150.6 | 131.2 | 1.0x / 1.0x | — | 0 | 0 |
| | **`construct_black_book`** | **38.6** | **26.0** | **3.9x / 5.0x** | — | — | $7.4\times 10^{-5}$ |

### End-to-End `Forkfiam` E0–E3 Speedups (`fastopt/FORKFIAM.md`)

When wired into `fiam/v4b/engine/optimize.py` via `fast_optimize.try_fast_solve` on a 12-month, 400-name synthetic `Forkfiam` formation across steps E0–E3:

- **Single base stage-2 QP**: drops from **86.8 ms to 20.1 ms (4.3x)** with a maximum weight difference of $3.5 \times 10^{-7}$.
- **Full E0–E3 loop (12 formations)**: drops from **8.726 s (181.8 ms/formation)** under Clarabel to **6.502 s** with default stage-2 `fastopt`, **4.439 s** with `FIAM_FAST_STAGE0=1` fixed-sign stage-0 preview ($3.6\times$ on E1, $3.8\times$ on E2), and **2.930 s (61.0 ms/formation, 3.0x overall)** with `FIAM_FAST_TRADE=1`.
- **Daily simulator (`sim.py`, $n=500$, 1,250 sessions)**: pre-extracting NumPy borrow/spread arrays cuts simulation time from **1.07 s to 0.33 s (3.2x)** with identical ledgers.

---

## Read the Full Paper & Explore the Code

- **Paper PDF**: [`papers/fastopt/fastopt-2026.pdf`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/fastopt/fastopt-2026.pdf)
- **LaTeX Source**: [`papers/fastopt/fastopt-2026.tex`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/papers/fastopt/fastopt-2026.tex)
- **Forkfiam Integration Note**: [`fastopt/FORKFIAM.md`](https://github.com/QUARCC-Umbrella/quant-fund/blob/main/fastopt/FORKFIAM.md)
- **Live Strategies Using `fastopt`**: [**QUARCC Market Neutral US Quant Fund**](/paper-fund/quarcc-v4b) and [**QUARCC US Long-Short Equities**](/paper-fund/us-long-short-equities)

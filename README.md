# Wasserstein Regime Clustering

An interactive visualization that detects market regimes (bull, bear, crisis, calm) by clustering rolling windows of return distributions using the Wasserstein distance, instead of the usual mean/variance feature engineering.

**[Live demo](https://wasserstein-geometry-6t8y.vercel.app/)**

## What this is

Most regime-detection approaches reduce each time window to a handful of summary stats (mean, vol, skew) and cluster on those. This project skips that step: each rolling window of daily log returns is treated as a full empirical distribution, and windows are clustered directly by how much "work" it takes to transform one distribution into another — the Wasserstein (earth mover's) distance.

In one dimension this has an exact closed form: the Wasserstein distance between two empirical distributions is just the L¹ distance between their quantile functions. No entropic approximation, no optimal-transport solver — sort the samples, interpolate onto a common quantile grid, take the mean absolute difference. That closed form is what makes the whole pipeline fast enough to run client-side.

The pipeline:

1. Generate a synthetic daily price series (Markov-switching between four regime definitions — bull/bear/crisis/calm — with Student-t fat tails on top of a Gaussian base).
2. Slice it into rolling windows (63 trading days, 5-day stride).
3. Compute pairwise 1-D Wasserstein distances between all windows.
4. Run Wasserstein k-means: assign each window to its nearest cluster barycenter by W₂ distance, then recompute each barycenter as the pointwise average of its members' quantile functions (the closed-form Wasserstein barycenter in 1-D). Repeat with k-means++ initialization and multiple random restarts.
5. Label clusters economically (bull/bear/crisis/calm) using a heuristic based on each cluster's mean return and volatility.
6. Project the distance matrix into 2-D with classical MDS, and compute a Markov transition matrix and approximate silhouette score for evaluation.

**Note on data:** the price series is synthetic, generated from a seeded regime-switching model, not pulled from a real market feed. That was a deliberate choice — it means the "ground truth" regime is known, so the clustering can be checked against something. Swapping in real price data (see `src/engine/marketData.ts`) is the natural next step.

## Tech stack

- React 19 + TypeScript
- Vite 7 (built as a single-file bundle via `vite-plugin-singlefile`)
- Tailwind CSS 4
- Recharts + D3 for charts
- Framer Motion for transitions

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

No API keys or environment variables needed — everything runs in the browser on synthetic data.

## Project structure

```
src/
  engine/
    marketData.ts   # synthetic price generator (regime-switching Markov chain)
    wasserstein.ts  # exact 1-D Wasserstein distance, barycenter, KDE utilities
    clustering.ts   # rolling windows, Wasserstein k-means, MDS, silhouette score
    pipeline.ts      # orchestrates the above into one output object
  components/        # one component per section of the page (charts, panels, math writeup)
  App.tsx             # page layout / section ordering
```

## Limitations

- 1-D distributions ignore path shape within a window (order doesn't matter, only the distribution of returns does)
- Empirical densities get noisy for short windows
- Market regimes aren't truly discrete states — this imposes hard cluster boundaries on something more continuous
- Cluster labels are unsupervised; the bull/bear/crisis/calm names are a post-hoc heuristic, not something the algorithm "knows"
- Results are sensitive to rolling window length and choice of K

## Possible extensions

- Hidden Markov Models for probabilistic (rather than hard) regime assignment
- Multivariate optimal transport (sliced Wasserstein) to cluster across multiple assets jointly
- Online/streaming regime detection with recursive distance updates
- Regime-conditioned portfolio overlay (position sizing tied to cluster label)

## License

MIT — see [LICENSE](LICENSE).

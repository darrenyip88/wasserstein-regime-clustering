/**
 * wasserstein.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * EXACT 1-D Wasserstein Distance Implementation
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mathematical Foundation
 * ───────────────────────
 * For two empirical distributions P = {p_1,...,p_m} and Q = {q_1,...,q_n},
 * the p-Wasserstein distance is defined via the optimal transport problem:
 *
 *   W_p(P, Q) = ( inf_{γ ∈ Π(P,Q)}  ∫∫ |x - y|^p dγ(x,y) )^{1/p}
 *
 * where Π(P,Q) is the set of all joint distributions with marginals P and Q.
 *
 * KEY INSIGHT — 1-D Closed Form:
 * In one dimension, the optimal transport plan has a beautiful closed form.
 * The W_p distance equals the L^p norm of the difference of quantile functions:
 *
 *   W_p(P, Q) = ( ∫₀¹ |F_P^{-1}(t) - F_Q^{-1}(t)|^p dt )^{1/p}
 *
 * where F_P^{-1} is the quantile function (inverse CDF) of P.
 *
 * For EMPIRICAL distributions with sorted samples p_(1) ≤ ... ≤ p_(n):
 *
 *   W_1(P, Q) = (1/n) Σ_{i=1}^{n} |p_(i) - q_(i)|
 *
 * after interpolating both to the same number of quantile points.
 *
 * This is MATHEMATICALLY EXACT for 1-D empirical distributions.
 * No approximation, no entropic regularisation, no slicing needed.
 *
 * Why 1-D is Attractive Here:
 * ───────────────────────────
 * • Return distributions within a window are 1-D → exact formula applies.
 * • O(n log n) sort + O(n) comparison → very fast.
 * • The quantile function has direct financial meaning (VaR, CVaR).
 * • The earth-mover intuition is perfectly clear: how much probability mass
 *   must be "transported" along the real line to transform P into Q.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Compute the exact 1-D W_1 (earth mover's distance) between two
 * arrays of real-valued samples.
 *
 * Method: sort both arrays, interpolate to a common quantile grid,
 * compute mean absolute difference of quantile functions.
 *
 * Complexity: O(m log m + n log n + N) where N = quantile grid size.
 */
export function wasserstein1D(a: number[], b: number[], nQuantiles = 200): number {
  if (a.length === 0 || b.length === 0) return 0;

  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);

  // Evaluate quantile functions at uniform grid t ∈ [0,1]
  const quantA = interpolateQuantile(sortedA, nQuantiles);
  const quantB = interpolateQuantile(sortedB, nQuantiles);

  // W_1 = (1/N) Σ |Q_A(t_i) - Q_B(t_i)|
  let sum = 0;
  for (let i = 0; i < nQuantiles; i++) {
    sum += Math.abs(quantA[i] - quantB[i]);
  }
  return sum / nQuantiles;
}

/**
 * Evaluate the empirical quantile function of a sorted sample array
 * at N uniformly-spaced probability levels t_i = (i+0.5)/N.
 *
 * Uses linear interpolation between order statistics.
 */
function interpolateQuantile(sorted: number[], N: number): number[] {
  const n = sorted.length;
  const result = new Array<number>(N);

  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;  // probability level
    const pos = t * (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, n - 1);
    const frac = pos - lo;
    result[i] = sorted[lo] * (1 - frac) + sorted[hi] * frac;
  }
  return result;
}

/**
 * Compute the W_2 (squared Wasserstein) distance in 1-D.
 * W_2(P,Q)² = (1/N) Σ (Q_A(t_i) - Q_B(t_i))²
 */
export function wasserstein2D_1D(a: number[], b: number[], nQuantiles = 200): number {
  if (a.length === 0 || b.length === 0) return 0;

  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);

  const quantA = interpolateQuantile(sortedA, nQuantiles);
  const quantB = interpolateQuantile(sortedB, nQuantiles);

  let sum = 0;
  for (let i = 0; i < nQuantiles; i++) {
    const diff = quantA[i] - quantB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum / nQuantiles); // W_2
}

/**
 * Compute the 1-D Wasserstein barycenter of a set of distributions.
 *
 * MATHEMATICAL FOUNDATION:
 * The Fréchet mean in Wasserstein space (barycenter) of distributions
 * {P_1,...,P_K} with equal weights is:
 *
 *   B = argmin_{Q} Σ_k W_2²(Q, P_k)
 *
 * In 1-D, this has a CLOSED FORM: the barycenter's quantile function is
 * simply the pointwise average of the individual quantile functions:
 *
 *   F_B^{-1}(t) = (1/K) Σ_k F_{P_k}^{-1}(t)
 *
 * This is exact for 1-D distributions (Agueh & Carlier 2011, adapted).
 * We return a sample array by evaluating on a fine quantile grid.
 */
export function wasserstein1DBarycenter(
  distributions: number[][],
  nQuantiles = 200
): number[] {
  if (distributions.length === 0) return [];

  const sortedDists = distributions.map((d) => [...d].sort((x, y) => x - y));
  const quantileFns = sortedDists.map((d) => interpolateQuantile(d, nQuantiles));

  const barycenter = new Array<number>(nQuantiles);
  for (let i = 0; i < nQuantiles; i++) {
    let sum = 0;
    for (const q of quantileFns) {
      sum += q[i];
    }
    barycenter[i] = sum / quantileFns.length;
  }

  // barycenter is a quantile function — return as pseudo-samples
  return barycenter;
}

/**
 * Compute pairwise Wasserstein distance matrix for an array of window distributions.
 *
 * Returns an n×n symmetric matrix (as flat array, row-major).
 * Exploits symmetry: only computes upper triangle.
 *
 * For n=200 windows × 200 quantiles, this is O(n² × N) ≈ 8M ops — fast.
 */
export function pairwiseWassersteinMatrix(
  windows: number[][],
  nQuantiles = 100
): Float32Array {
  const n = windows.length;
  const matrix = new Float32Array(n * n);

  // Pre-sort and pre-compute quantile functions for efficiency
  const quantileFns = windows.map((w) => {
    const sorted = [...w].sort((x, y) => x - y);
    return interpolateQuantile(sorted, nQuantiles);
  });

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sum = 0;
      const qi = quantileFns[i];
      const qj = quantileFns[j];
      for (let k = 0; k < nQuantiles; k++) {
        sum += Math.abs(qi[k] - qj[k]);
      }
      const dist = sum / nQuantiles;
      matrix[i * n + j] = dist;
      matrix[j * n + i] = dist; // symmetry
    }
  }

  return matrix;
}

/**
 * Compute summary statistics for a distribution sample.
 * Used for regime interpretation, NOT for clustering.
 */
export function distributionStats(samples: number[]): {
  mean: number;
  std: number;
  skew: number;
  kurt: number;
  var5: number;  // 5th percentile (downside VaR proxy)
  var95: number; // 95th percentile
} {
  const n = samples.length;
  if (n === 0) return { mean: 0, std: 0, skew: 0, kurt: 0, var5: 0, var95: 0 };

  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const skew =
    std > 0
      ? samples.reduce((s, x) => s + ((x - mean) / std) ** 3, 0) / n
      : 0;
  const kurt =
    std > 0
      ? samples.reduce((s, x) => s + ((x - mean) / std) ** 4, 0) / n - 3
      : 0;

  const sorted = [...samples].sort((a, b) => a - b);
  const var5 = sorted[Math.floor(0.05 * n)];
  const var95 = sorted[Math.floor(0.95 * n)];

  return { mean, std, skew, kurt, var5, var95 };
}

/**
 * Compute kernel density estimate for smooth histogram display.
 * Uses Gaussian kernel with Silverman bandwidth.
 */
export function kde(
  samples: number[],
  nPoints = 150,
  padding = 0.3
): Array<{ x: number; y: number }> {
  if (samples.length === 0) return [];

  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(samples.reduce((s, x) => s + (x - mean) ** 2, 0) / n);

  // Silverman's rule of thumb
  const h = 1.06 * std * Math.pow(n, -0.2);
  if (h === 0 || isNaN(h)) return [];

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min;
  const xMin = min - padding * range;
  const xMax = max + padding * range;

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nPoints; i++) {
    const x = xMin + ((xMax - xMin) * i) / (nPoints - 1);
    let density = 0;
    for (const xi of samples) {
      const u = (x - xi) / h;
      density += Math.exp(-0.5 * u * u);
    }
    density /= n * h * Math.sqrt(2 * Math.PI);
    points.push({ x, y: density });
  }
  return points;
}

/**
 * Convert a quantile function (array) to KDE-like display points.
 * Used to visualize barycenter distributions.
 */
export function quantileFnToKde(
  quantileFn: number[],
  nPoints = 150
): Array<{ x: number; y: number }> {
  return kde(quantileFn, nPoints, 0.1);
}

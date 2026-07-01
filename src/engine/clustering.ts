/**
 * clustering.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Wasserstein k-Means on 1-D Return Distributions
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ALGORITHM: Wasserstein k-Means (1-D Exact Version)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Standard k-means in Euclidean space:
 *   Objective: min_C  Σ_i  ||x_i - c_{σ(i)}||²
 *   Step 1 (Assignment): assign each x_i to nearest centroid c_k
 *   Step 2 (Update):     c_k = mean of assigned points
 *
 * Wasserstein k-Means replaces Euclidean geometry with Wasserstein geometry:
 *   Objective: min_B  Σ_i  W_2²(P_i, B_{σ(i)})
 *   Step 1 (Assignment): assign each P_i to nearest barycenter B_k (by W_2)
 *   Step 2 (Update):     B_k = Wasserstein barycenter of assigned distributions
 *
 * In 1-D (EXACT):
 *   - W_2(P, Q) is computed via sorted quantile functions (see wasserstein.ts)
 *   - Wasserstein barycenter = pointwise mean of quantile functions
 *   - Both steps are mathematically exact, O(n log n) per comparison
 *
 * What is exact vs. approximate here:
 *   ✓ EXACT:    1-D W_1 / W_2 distance computation (quantile closed form)
 *   ✓ EXACT:    1-D Wasserstein barycenter (quantile averaging)
 *   ✓ EXACT:    Assignment step (nearest Wasserstein centroid)
 *   ~ PRACTICAL: k-means convergence (Lloyd's iterations, random restarts)
 *   ~ PRACTICAL: Rolling windows as IID sample approximations of regime dist.
 *
 * Reference ideas (not citing specific papers — these are well-known results):
 *   - 1-D Wasserstein = L¹ distance on quantile functions (classical result)
 *   - Wasserstein barycenter in 1-D = averaged quantile fn (Fréchet mean)
 *   - k-means in metric spaces (k-medoids, k-means variants in Wasserstein space)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  wasserstein2D_1D,
  wasserstein1DBarycenter,
  distributionStats,
} from "./wasserstein";

export interface Window {
  index: number;
  startDate: string;
  endDate: string;
  returns: number[];
}

export interface ClusterResult {
  labels: number[];                    // cluster label per window
  barycenters: number[][];             // Wasserstein barycenter per cluster (quantile fn)
  barycentersRaw: number[][];          // raw samples drawn from barycenter quantile fn
  inertia: number;                     // total within-cluster W_2² (objective)
  iterations: number;                  // iterations to convergence
  windowStats: WindowStats[];          // per-window summary stats
  clusterStats: ClusterStats[];        // per-cluster aggregate stats
  transitionMatrix: number[][];        // K×K transition probability matrix
}

export interface WindowStats {
  mean: number;
  std: number;
  skew: number;
  kurt: number;
  var5: number;
  var95: number;
  label: number;
}

export interface ClusterStats {
  id: number;
  count: number;
  meanReturn: number;
  meanVol: number;
  meanSkew: number;
  meanKurt: number;
  meanVar5: number;
  withinClusterDispersion: number;
  persistence: number; // fraction of consecutive same-label pairs
}

/**
 * Build rolling windows from a daily log-return series.
 *
 * @param returns    Array of daily log returns (aligned with dates)
 * @param dates      Array of date strings
 * @param windowSize Rolling window in trading days (default 63 ≈ 1 quarter)
 * @param stride     Step between windows (default 5 = weekly)
 */
export function buildRollingWindows(
  returns: number[],
  dates: string[],
  windowSize = 63,
  stride = 5
): Window[] {
  const windows: Window[] = [];
  let idx = 0;

  for (let i = 0; i + windowSize <= returns.length; i += stride) {
    windows.push({
      index: idx++,
      startDate: dates[i],
      endDate: dates[i + windowSize - 1],
      returns: returns.slice(i, i + windowSize),
    });
  }
  return windows;
}

/**
 * Wasserstein k-Means clustering of 1-D return distributions.
 *
 * Uses Lloyd's iterations with:
 *   - k-means++ style initialization (spread initial barycenters)
 *   - Multiple random restarts (best inertia kept)
 *   - W_2 distance for assignment
 *   - Exact 1-D Wasserstein barycenters for update step
 */
export function wassersteinKMeans(
  windows: Window[],
  K = 4,
  maxIter = 50,
  nRestarts = 3,
  nQuantiles = 100,
  seed = 42
): ClusterResult {
  const n = windows.length;
  if (n < K) throw new Error("Fewer windows than clusters");

  // Pre-sort all window returns once
  const sortedWindows = windows.map((w) => [...w.returns].sort((a, b) => a - b));

  let bestLabels: number[] = [];
  let bestInertia = Infinity;
  let bestBarycenters: number[][] = [];
  let bestIter = 0;

  // Seeded random for reproducibility
  let rngState = seed;
  const rng = () => {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return (rngState >>> 0) / 4294967296;
  };

  for (let restart = 0; restart < nRestarts; restart++) {
    // ── k-means++ initialization ──────────────────────────────────────────
    const centroidIndices: number[] = [];

    // Pick first centroid uniformly at random
    centroidIndices.push(Math.floor(rng() * n));

    for (let k = 1; k < K; k++) {
      // Compute distance from each window to nearest existing centroid
      const dists = sortedWindows.map((w, i) => {
        if (centroidIndices.includes(i)) return 0;
        let minDist = Infinity;
        for (const ci of centroidIndices) {
          const d = wasserstein2D_1D(w, sortedWindows[ci], nQuantiles);
          if (d < minDist) minDist = d;
        }
        return minDist * minDist; // squared distance for k-means++ weighting
      });

      // Sample proportional to squared distances
      const totalDist = dists.reduce((a, b) => a + b, 0);
      let threshold = rng() * totalDist;
      let chosen = 0;
      for (let i = 0; i < n; i++) {
        threshold -= dists[i];
        if (threshold <= 0) {
          chosen = i;
          break;
        }
      }
      centroidIndices.push(chosen);
    }

    // Initialize barycenters as the selected windows' return arrays
    let barycenters: number[][] = centroidIndices.map((ci) => sortedWindows[ci]);

    let labels = new Array<number>(n).fill(0);
    let inertia = Infinity;
    let iter = 0;

    for (iter = 0; iter < maxIter; iter++) {
      // ── Assignment step: assign each window to nearest barycenter (W_2) ──
      const newLabels = new Array<number>(n).fill(0);
      let newInertia = 0;

      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let minK = 0;
        for (let k = 0; k < K; k++) {
          const d = wasserstein2D_1D(sortedWindows[i], barycenters[k], nQuantiles);
          if (d < minDist) {
            minDist = d;
            minK = k;
          }
        }
        newLabels[i] = minK;
        newInertia += minDist * minDist;
      }

      // Check convergence
      const labelsChanged = newLabels.some((l, i) => l !== labels[i]);
      labels = newLabels;
      inertia = newInertia;

      if (!labelsChanged) break;

      // ── Update step: compute Wasserstein barycenter per cluster ──────────
      const newBarycenters: number[][] = [];
      for (let k = 0; k < K; k++) {
        const clusterWindows = sortedWindows.filter((_, i) => labels[i] === k);
        if (clusterWindows.length === 0) {
          // Empty cluster: reinitialize to a random window
          newBarycenters.push(sortedWindows[Math.floor(rng() * n)]);
        } else {
          // EXACT 1-D Wasserstein barycenter: average quantile functions
          newBarycenters.push(wasserstein1DBarycenter(clusterWindows, nQuantiles));
        }
      }
      barycenters = newBarycenters;
    }

    if (inertia < bestInertia) {
      bestInertia = inertia;
      bestLabels = [...labels];
      bestBarycenters = barycenters.map((b) => [...b]);
      bestIter = iter;
    }
  }

  // ── Post-processing ──────────────────────────────────────────────────────

  // Compute per-window stats
  const windowStats: WindowStats[] = windows.map((w, i) => ({
    ...distributionStats(w.returns),
    label: bestLabels[i],
  }));

  // Compute per-cluster aggregate stats
  const clusterStats: ClusterStats[] = [];
  for (let k = 0; k < K; k++) {
    const members = windows.filter((_, i) => bestLabels[i] === k);
    const memberStats = windowStats.filter((_, i) => bestLabels[i] === k);

    if (members.length === 0) {
      clusterStats.push({
        id: k,
        count: 0,
        meanReturn: 0,
        meanVol: 0,
        meanSkew: 0,
        meanKurt: 0,
        meanVar5: 0,
        withinClusterDispersion: 0,
        persistence: 0,
      });
      continue;
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    // Within-cluster Wasserstein dispersion
    const sortedMembers = members.map((m) => [...m.returns].sort((a, b) => a - b));
    const barycenter = wasserstein1DBarycenter(sortedMembers, 100);
    const dispersion =
      sortedMembers.reduce(
        (s, sm) => s + wasserstein2D_1D(sm, barycenter, 100) ** 2,
        0
      ) / sortedMembers.length;

    // Persistence: fraction of consecutive same-cluster windows
    const consecutive = bestLabels.reduce((count, l, i) => {
      if (i === 0) return count;
      return count + (l === k && bestLabels[i - 1] === k ? 1 : 0);
    }, 0);
    const transitions = bestLabels.reduce(
      (count, _l, i) => count + (i > 0 && bestLabels[i - 1] === k ? 1 : 0),
      0
    );
    const persistence = transitions > 0 ? consecutive / transitions : 0;

    clusterStats.push({
      id: k,
      count: members.length,
      meanReturn: avg(memberStats.map((s) => s.mean)) * 252, // annualized
      meanVol: avg(memberStats.map((s) => s.std)) * Math.sqrt(252), // annualized
      meanSkew: avg(memberStats.map((s) => s.skew)),
      meanKurt: avg(memberStats.map((s) => s.kurt)),
      meanVar5: avg(memberStats.map((s) => s.var5)),
      withinClusterDispersion: dispersion,
      persistence,
    });
  }

  // ── Transition Matrix ────────────────────────────────────────────────────
  // K×K matrix: T[i][j] = P(next regime = j | current regime = i)
  const counts = Array.from({ length: K }, () => new Array<number>(K).fill(0));
  const rowSums = new Array<number>(K).fill(0);

  for (let i = 1; i < bestLabels.length; i++) {
    const from = bestLabels[i - 1];
    const to = bestLabels[i];
    counts[from][to]++;
    rowSums[from]++;
  }

  const transitionMatrix = counts.map((row, k) =>
    row.map((c) => (rowSums[k] > 0 ? c / rowSums[k] : 0))
  );

  // Re-order cluster labels so cluster 0 = highest mean return, etc.
  const order = [...Array(K).keys()].sort(
    (a, b) => clusterStats[b].meanReturn - clusterStats[a].meanReturn
  );
  const reorderMap = new Array<number>(K);
  order.forEach((oldK, newK) => {
    reorderMap[oldK] = newK;
  });

  const reorderedLabels = bestLabels.map((l) => reorderMap[l]);
  const reorderedBarycenters = order.map((oldK) => bestBarycenters[oldK]);
  const reorderedStats = order.map((oldK) => ({
    ...clusterStats[oldK],
    id: reorderMap[oldK],
  }));
  const reorderedTransition = order.map((fromOld) =>
    order.map((toOld) => transitionMatrix[fromOld][toOld])
  );

  // Build raw sample arrays from barycenter quantile functions
  const barycentersRaw = reorderedBarycenters;

  return {
    labels: reorderedLabels,
    barycenters: reorderedBarycenters,
    barycentersRaw,
    inertia: bestInertia,
    iterations: bestIter,
    windowStats: windowStats.map((s) => ({ ...s, label: reorderMap[s.label] })),
    clusterStats: reorderedStats,
    transitionMatrix: reorderedTransition,
  };
}

/**
 * Compute silhouette-like score adapted to Wasserstein distances.
 *
 * For each window i with label k:
 *   a(i) = mean W_2 distance to other windows in same cluster (cohesion)
 *   b(i) = min over k'≠k of mean W_2 distance to cluster k' (separation)
 *   s(i) = (b(i) - a(i)) / max(a(i), b(i))
 *
 * Returns mean silhouette score ∈ [-1, 1].
 * Higher is better. Above 0.5 is strong separation.
 */
export function wassersteinSilhouette(
  windows: Window[],
  labels: number[],
  nQuantiles = 80
): number {
  const n = windows.length;
  const K = Math.max(...labels) + 1;
  const sortedWindows = windows.map((w) => [...w.returns].sort((a, b) => a - b));

  const scores: number[] = [];

  for (let i = 0; i < n; i++) {
    const ki = labels[i];
    const sameCluster = sortedWindows.filter((_, j) => j !== i && labels[j] === ki);
    const a =
      sameCluster.length > 0
        ? sameCluster.reduce(
            (s, w) => s + wasserstein2D_1D(sortedWindows[i], w, nQuantiles),
            0
          ) / sameCluster.length
        : 0;

    let b = Infinity;
    for (let k = 0; k < K; k++) {
      if (k === ki) continue;
      const otherCluster = sortedWindows.filter((_, j) => labels[j] === k);
      if (otherCluster.length === 0) continue;
      const meanDist =
        otherCluster.reduce(
          (s, w) => s + wasserstein2D_1D(sortedWindows[i], w, nQuantiles),
          0
        ) / otherCluster.length;
      if (meanDist < b) b = meanDist;
    }

    const si = b === Infinity || Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
    scores.push(si);
  }

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Compute elbow curve: within-cluster Wasserstein dispersion for K=2..maxK.
 * Used to help select the number of clusters.
 */
export function elbowAnalysis(
  windows: Window[],
  maxK = 6,
  nQuantiles = 80
): Array<{ k: number; inertia: number }> {
  const results: Array<{ k: number; inertia: number }> = [];

  for (let k = 2; k <= maxK; k++) {
    const result = wassersteinKMeans(windows, k, 30, 2, nQuantiles, 42);
    results.push({ k, inertia: result.inertia });
  }
  return results;
}

/**
 * Multi-dimensional scaling (classical MDS) on a distance matrix.
 * Projects n points from Wasserstein distance space into 2-D for visualization.
 *
 * Algorithm: Classical MDS via double-centering and eigendecomposition.
 * We implement a stable power-iteration approximation for the top 2 eigenvectors.
 */
export function mds2D(
  distMatrix: Float32Array,
  n: number
): Array<{ x: number; y: number }> {
  // Double-centering: B = -0.5 * H * D² * H  where H = I - (1/n)11^T
  const D2: number[] = new Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      D2[i * n + j] = distMatrix[i * n + j] ** 2;
    }
  }

  // Row means and grand mean
  const rowMeans: number[] = new Array(n).fill(0);
  let grandMean = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += D2[i * n + j];
    rowMeans[i] = sum / n;
    grandMean += rowMeans[i];
  }
  grandMean /= n;

  const colMeans: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += D2[i * n + j];
    colMeans[j] = sum / n;
  }

  // B[i][j] = -0.5 * (D²[i][j] - rowMean[i] - colMean[j] + grandMean)
  const B: number[] = new Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      B[i * n + j] =
        -0.5 * (D2[i * n + j] - rowMeans[i] - colMeans[j] + grandMean);
    }
  }

  // Power iteration for top 2 eigenvectors
  const matVec = (v: number[]): number[] => {
    const result: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += B[i * n + j] * v[j];
      result[i] = s;
    }
    return result;
  };

  const normalize = (v: number[]): [number[], number] => {
    let norm = 0;
    for (let i = 0; i < n; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm);
    if (norm < 1e-12) return [v, 0];
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = v[i] / norm;
    return [out, norm];
  };

  // First eigenvector
  let v1: number[] = new Array(n).fill(1.0 / Math.sqrt(n));
  let lambda1 = 0;
  for (let iter = 0; iter < 100; iter++) {
    const Bv = matVec(v1);
    const [nv, eigenval] = normalize(Bv);
    lambda1 = eigenval;
    v1 = nv;
  }

  // Deflate and get second eigenvector
  const deflate = (v: number[], eigen: number[], l: number): number[] => {
    const out = new Array<number>(n);
    let dot = 0;
    for (let i = 0; i < n; i++) dot += v[i] * eigen[i];
    for (let i = 0; i < n; i++) out[i] = v[i] - l * dot * eigen[i];
    return out;
  };

  let v2: number[] = Array.from({ length: n }, (_, i) =>
    (i % 2 === 0 ? 1 : -1) / Math.sqrt(n)
  );
  let lambda2 = 0;
  for (let iter = 0; iter < 100; iter++) {
    const Bv = matVec(v2);
    const deflated = deflate(Bv, v1, lambda1);
    const [nv, l] = normalize(deflated);
    lambda2 = l;
    v2 = nv;
  }

  // Projection: x_i = sqrt(λ₁) * v1[i], y_i = sqrt(λ₂) * v2[i]
  const scale1 = Math.sqrt(Math.max(lambda1, 0));
  const scale2 = Math.sqrt(Math.max(lambda2, 0));

  return Array.from({ length: n }, (_, i) => ({
    x: v1[i] * scale1,
    y: v2[i] * scale2,
  }));
}

/**
 * pipeline.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * End-to-end orchestration: data → windows → Wasserstein → clusters → analysis
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { generateMarketData, generateCanonicalSamples, type PriceBar } from "./marketData";
import { pairwiseWassersteinMatrix, kde, distributionStats } from "./wasserstein";
import {
  buildRollingWindows,
  wassersteinKMeans,
  mds2D,
  type Window,
  type ClusterResult,
} from "./clustering";

export interface PipelineConfig {
  nDays: number;
  seed: number;
  windowSize: number;
  stride: number;
  K: number;
  nQuantiles: number;
  nRestarts: number;
}

export const DEFAULT_CONFIG: PipelineConfig = {
  nDays: 1260,      // ~5 trading years
  seed: 42,
  windowSize: 63,   // 1 trading quarter
  stride: 5,        // weekly windows
  K: 4,             // four regimes
  nQuantiles: 80,   // quantile grid resolution
  nRestarts: 3,
};

export interface RegimeLabel {
  id: number;
  name: string;
  color: string;
  bgColor: string;
  economicInterpretation: string;
  distributionSignature: string;
}

export interface PipelineOutput {
  // Raw data
  prices: PriceBar[];
  windows: Window[];

  // Clustering results
  clusterResult: ClusterResult;

  // Regime labels (economically interpreted)
  regimeLabels: RegimeLabel[];

  // Per-window enriched data
  windowTimeline: WindowTimelinePoint[];

  // Distance matrix (subsampled for display)
  distMatrixDisplay: {
    matrix: number[][];
    n: number;
    dates: string[];
    labels: number[];
  };

  // MDS projection for scatter
  mdsPoints: Array<{ x: number; y: number; label: number; mean: number; vol: number }>;

  // Canonical distributions for pedagogy
  canonicalKdes: Record<string, Array<{ x: number; y: number }>>;
  canonicalStats: Record<string, ReturnType<typeof distributionStats>>;

  // Barycenter KDEs per cluster
  barycentersKde: Array<Array<{ x: number; y: number }>>;

  // Transition matrix
  transitionMatrix: number[][];

  // Summary stats
  silhouetteScore: number;
  config: PipelineConfig;
}

export interface WindowTimelinePoint {
  date: string;        // end date of window
  price: number;       // closing price at window end
  label: number;       // cluster label
  mean: number;        // annualized drift
  vol: number;         // annualized vol
  skew: number;
  kurt: number;
  var5: number;
}

// ─── Regime Naming Heuristic ─────────────────────────────────────────────────
// After clustering, we sort clusters by mean return (desc) and assign
// economic names based on volatility and drift characteristics.
function assignRegimeNames(
  clusterStats: ClusterResult["clusterStats"],
  K: number
): RegimeLabel[] {
  const names: RegimeLabel[] = [];

  // Each cluster gets an economic interpretation based on its stats
  for (const cs of clusterStats) {
    const annVol = cs.meanVol;

    let name: string;
    let color: string;
    let bgColor: string;
    let economicInterpretation: string;
    let distributionSignature: string;

    // Heuristic classification (ordered by return, so id=0 is highest return)
    if (cs.id === 0) {
      name = K <= 3 ? "Bull" : "Strong Bull";
      color = "#4ade80";
      bgColor = "rgba(74,222,128,0.10)";
      economicInterpretation =
        "Risk-on environment with sustained price appreciation. Characterized by positive drift and compressed volatility. Consistent with periods of central bank accommodation, strong earnings growth, or post-crisis recovery phases.";
      distributionSignature =
        "Positive drift (μ > 0), tight distribution (low σ), thin tails, right-skewed mass. Wasserstein barycenter shifted rightward vs. crisis cluster.";
    } else if (cs.id === K - 1) {
      if (annVol > 0.30) {
        name = "Crisis";
        color = "#7c3aed";
        bgColor = "rgba(124,58,237,0.12)";
        economicInterpretation =
          "Market dislocation with extreme volatility. Associated with forced liquidations, credit events, or macro shocks. Regime exhibits the widest return distribution and heaviest tails.";
        distributionSignature =
          "Near-zero or negative drift, very wide distribution, heavy tails on both sides (high kurtosis), elevated left-tail mass.";
      } else {
        name = "Bear";
        color = "#ef4444";
        bgColor = "rgba(239,68,68,0.12)";
        economicInterpretation =
          "Sustained negative drift with elevated volatility. Consistent with fundamental deterioration, tightening cycles, or valuation mean-reversion. Less extreme than crisis but structurally negative.";
        distributionSignature =
          "Negative drift (μ < 0), wider distribution than bull, left-skewed, moderate tail elevation.";
      }
    } else if (cs.id === 1 && K >= 4) {
      if (annVol < 0.12) {
        name = "Calm";
        color = "#3b82f6";
        bgColor = "rgba(59,130,246,0.12)";
        economicInterpretation =
          "Low-activity consolidation or sideways drift. Characterized by minimal directional conviction and very compressed volatility. Often precedes regime transitions in either direction.";
        distributionSignature =
          "Near-zero drift, very tight distribution (lowest σ among clusters), thin tails, near-Gaussian shape.";
      } else {
        name = "Weak Bull";
        color = "#86efac";
        bgColor = "rgba(134,239,172,0.12)";
        economicInterpretation =
          "Modest positive drift with moderate volatility. Typical of grinding uptrend phases without strong momentum or macro catalyst.";
        distributionSignature =
          "Mild positive drift, moderate distribution width, slight right skew.";
      }
    } else {
      name = "Mixed";
      color = "#f59e0b";
      bgColor = "rgba(245,158,11,0.12)";
      economicInterpretation =
        "Transitional or ambiguous regime with mixed directional signals. May correspond to rotation, sector divergence, or macro uncertainty.";
      distributionSignature =
        "Moderate characteristics across all dimensions. Acts as transitional state in the Markov chain.";
    }

    names.push({
      id: cs.id,
      name,
      color,
      bgColor,
      economicInterpretation,
      distributionSignature,
    });
  }

  return names;
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────
export function runPipeline(config: PipelineConfig = DEFAULT_CONFIG): PipelineOutput {
  // 1. Generate market data
  const prices = generateMarketData(config.nDays, config.seed);

  // 2. Extract returns and dates
  const returns = prices.map((p) => p.logReturn);
  const dates = prices.map((p) => p.date);

  // 3. Build rolling windows
  const windows = buildRollingWindows(returns, dates, config.windowSize, config.stride);

  // 4. Run Wasserstein k-means clustering
  const clusterResult = wassersteinKMeans(
    windows,
    config.K,
    50,
    config.nRestarts,
    config.nQuantiles,
    config.seed
  );

  // 5. Assign economic regime names
  const regimeLabels = assignRegimeNames(clusterResult.clusterStats, config.K);

  // 6. Build window timeline (map labels back to calendar time)
  const windowTimeline: WindowTimelinePoint[] = windows.map((w, i) => {
    const priceAtEnd = prices.find((p) => p.date === w.endDate)?.price ?? 0;
    const stats = clusterResult.windowStats[i];
    return {
      date: w.endDate,
      price: priceAtEnd,
      label: clusterResult.labels[i],
      mean: stats.mean * 252,
      vol: stats.std * Math.sqrt(252),
      skew: stats.skew,
      kurt: stats.kurt,
      var5: stats.var5,
    };
  });

  // 7. Compute pairwise distance matrix (subsampled for display)
  const maxDisplay = 80;
  const step = Math.max(1, Math.floor(windows.length / maxDisplay));
  const subsampledWindows = windows.filter((_, i) => i % step === 0);
  const subsampledLabels = clusterResult.labels.filter((_, i) => i % step === 0);
  const subsampledDates = subsampledWindows.map((w) => w.endDate);

  const distMatrixFlat = pairwiseWassersteinMatrix(
    subsampledWindows.map((w) => w.returns),
    config.nQuantiles
  );

  const nd = subsampledWindows.length;
  const distMatrix2D: number[][] = Array.from({ length: nd }, (_, i) =>
    Array.from({ length: nd }, (_, j) => distMatrixFlat[i * nd + j])
  );

  // 8. MDS projection
  const mdsCoords = mds2D(distMatrixFlat, nd);
  const mdsPoints = mdsCoords.map((pt, i) => {
    const ws = clusterResult.windowStats[Math.min(i * step, clusterResult.windowStats.length - 1)];
    return {
      ...pt,
      label: subsampledLabels[i],
      mean: (ws?.mean ?? 0) * 252,
      vol: (ws?.std ?? 0) * Math.sqrt(252),
    };
  });

  // 9. Canonical distributions for pedagogy
  const canonicalSamples = generateCanonicalSamples(800, 99);
  const canonicalKdes: Record<string, Array<{ x: number; y: number }>> = {};
  const canonicalStats: Record<string, ReturnType<typeof distributionStats>> = {};

  for (const [name, samples] of Object.entries(canonicalSamples)) {
    canonicalKdes[name] = kde(samples, 200, 0.2);
    canonicalStats[name] = distributionStats(samples);
  }

  // 10. Barycenter KDEs
  const barycentersKde = clusterResult.barycenters.map((b) => kde(b, 150, 0.1));

  // 11. Silhouette score (approximate on subsampled)
  // Computed inline for efficiency
  const silhouetteScore = computeApproxSilhouette(
    distMatrixFlat,
    subsampledLabels,
    nd
  );

  return {
    prices,
    windows,
    clusterResult,
    regimeLabels,
    windowTimeline,
    distMatrixDisplay: {
      matrix: distMatrix2D,
      n: nd,
      dates: subsampledDates,
      labels: subsampledLabels,
    },
    mdsPoints,
    canonicalKdes,
    canonicalStats,
    barycentersKde,
    transitionMatrix: clusterResult.transitionMatrix,
    silhouetteScore,
    config,
  };
}

function computeApproxSilhouette(
  distMatrix: Float32Array,
  labels: number[],
  n: number
): number {
  const K = Math.max(...labels) + 1;
  let totalScore = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    const ki = labels[i];
    let aSumCount = 0;
    let aSum = 0;

    const bSums: number[] = new Array(K).fill(0);
    const bCounts: number[] = new Array(K).fill(0);

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = distMatrix[i * n + j];
      if (labels[j] === ki) {
        aSum += d;
        aSumCount++;
      } else {
        bSums[labels[j]] += d;
        bCounts[labels[j]]++;
      }
    }

    const a = aSumCount > 0 ? aSum / aSumCount : 0;
    let b = Infinity;
    for (let k = 0; k < K; k++) {
      if (k !== ki && bCounts[k] > 0) {
        b = Math.min(b, bSums[k] / bCounts[k]);
      }
    }

    if (b === Infinity) continue;
    const s = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
    totalScore += s;
    count++;
  }

  return count > 0 ? totalScore / count : 0;
}

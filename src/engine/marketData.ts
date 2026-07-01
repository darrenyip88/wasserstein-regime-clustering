/**
 * marketData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Synthetic market price generator that produces realistic regimes:
 *   0 – Bull (positive drift, low vol)
 *   1 – Bear (negative drift, moderate-high vol)
 *   2 – Crisis (near-zero drift, very high vol, fat tails)
 *   3 – Calm / Sideways (near-zero drift, very low vol)
 *
 * We also expose canonical synthetic distributions for pedagogical charts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PriceBar {
  date: string;
  price: number;
  logReturn: number;
  trueRegime: number; // ground-truth label used only for diagnostics
}

export interface RegimeDef {
  id: number;
  name: string;
  color: string;
  bgColor: string;
  drift: number;    // daily log-return drift
  vol: number;      // daily log-return vol
  tailProb: number; // probability of a fat-tail jump draw
  jumpScale: number; // jump magnitude multiplier
  description: string;
  economicContext: string;
}

export const REGIME_DEFS: RegimeDef[] = [
  {
    id: 0,
    name: "Bull",
    color: "#6bb887",
    bgColor: "rgba(107,184,135,0.10)",
    drift: 0.0006,
    vol: 0.008,
    tailProb: 0.01,
    jumpScale: 2.0,
    description: "Positive drift, compressed volatility, thin tails",
    economicContext: "Risk-on environment, sustained price appreciation, low fear",
  },
  {
    id: 1,
    name: "Bear",
    color: "#d47c62",
    bgColor: "rgba(212,124,98,0.10)",
    drift: -0.0005,
    vol: 0.016,
    tailProb: 0.04,
    jumpScale: 2.5,
    description: "Negative drift, elevated volatility, heavier left tail",
    economicContext: "Risk-off environment, systematic selling, credit stress",
  },
  {
    id: 2,
    name: "Crisis",
    color: "#c9984a",
    bgColor: "rgba(201,152,74,0.10)",
    drift: -0.0002,
    vol: 0.030,
    tailProb: 0.10,
    jumpScale: 3.5,
    description: "Extreme dispersion, fat tails both sides, chaotic price action",
    economicContext: "Market dislocation, forced liquidations, volatility cascades",
  },
  {
    id: 3,
    name: "Calm",
    color: "#7a9eb5",
    bgColor: "rgba(122,158,181,0.10)",
    drift: 0.0001,
    vol: 0.005,
    tailProb: 0.005,
    jumpScale: 1.2,
    description: "Near-zero drift, very tight distribution, minimal tail events",
    economicContext: "Low-activity consolidation, sideways chop, risk compression",
  },
];

// ─── Seeded pseudo-random number generator (Mulberry32) ──────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal sample
function normalSample(rng: () => number, mean = 0, std = 1): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// Student-t sample via ratio method (df degrees of freedom)
function tSample(rng: () => number, df = 3): number {
  const z = normalSample(rng);
  const v = 2 * df * rng(); // chi-squared approximation
  return z / Math.sqrt(v / df);
}

/**
 * Generate a synthetic price series with realistic regime structure.
 * Regimes follow a simple Markov chain with persistence governed by
 * `meanDuration` (trading days per regime).
 */
export function generateMarketData(
  nDays = 1260,            // ~5 years of trading days
  seed = 42,
  meanDuration = 120       // average regime duration in days
): PriceBar[] {
  const rng = mulberry32(seed);

  // Markov transition: high self-loop probability
  const stay = 1 - 1 / meanDuration;

  const dates: PriceBar[] = [];
  let price = 100.0;
  let regime = 0;

  // Start date 2018-01-02
  const startDate = new Date("2018-01-02");

  for (let i = 0; i < nDays; i++) {
    // Regime transition
    if (rng() > stay) {
      // Transition to a different regime (uniform among others)
      const others = [0, 1, 2, 3].filter((r) => r !== regime);
      regime = others[Math.floor(rng() * others.length)];
    }

    const def = REGIME_DEFS[regime];

    // Daily log-return: normal base + occasional fat-tail draw
    let r: number;
    if (rng() < def.tailProb) {
      r = def.drift + def.vol * def.jumpScale * tSample(rng, 3);
    } else {
      r = normalSample(rng, def.drift, def.vol);
    }

    // Advance date (skip weekends)
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + Math.floor((i * 7) / 5));

    price = price * Math.exp(r);

    const dateStr = d.toISOString().slice(0, 10);
    dates.push({ date: dateStr, price, logReturn: r, trueRegime: regime });
  }

  return dates;
}

/**
 * Canonical synthetic return distributions for pedagogical visualisation.
 * Returns arrays of log-return samples for each regime.
 */
export function generateCanonicalSamples(
  n = 500,
  seed = 99
): Record<string, number[]> {
  const rng = mulberry32(seed);
  const result: Record<string, number[]> = {};

  for (const def of REGIME_DEFS) {
    const samples: number[] = [];
    for (let i = 0; i < n; i++) {
      let r: number;
      if (rng() < def.tailProb * 5) {
        r = def.drift + def.vol * def.jumpScale * tSample(rng, 3);
      } else {
        r = normalSample(rng, def.drift, def.vol);
      }
      samples.push(r);
    }
    result[def.name] = samples;
  }
  return result;
}

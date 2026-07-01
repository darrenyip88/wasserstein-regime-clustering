import { useMemo } from "react";
import { Layout } from "./components/Layout";
import { HeroSection } from "./components/HeroSection";
import { PriceRegimeChart } from "./components/PriceRegimeChart";
import { CumulativeReturns } from "./components/CumulativeReturns";
import { DistributionPanels } from "./components/DistributionPanels";
import { ScatterPlot } from "./components/ScatterPlot";
import { DistanceHeatmap } from "./components/DistanceHeatmap";
import { MdsPlot } from "./components/MdsPlot";
import { TransitionMatrix } from "./components/TransitionMatrix";
import { RegimeInterpretation } from "./components/RegimeInterpretation";
import { MathFoundation } from "./components/MathFoundation";
import { ModelEvaluation } from "./components/ModelEvaluation";
import { runPipeline, DEFAULT_CONFIG } from "./engine/pipeline";

// ── Thin horizontal section rule ──────────────────────────────────────────────
function Rule() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--border-hair)",
        margin: 0,
      }}
    />
  );
}

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        gap: 28,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: "var(--accent-dim)",
          border: "1px solid var(--accent-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M2 13 L5.5 7.5 L9 11 L12.5 4 L16 8"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Text */}
      <div style={{ textAlign: "center" }}>
        <div
          className="font-display"
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Computing Wasserstein distances
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
          }}
        >
          Building rolling windows · Running k-means · Estimating barycenters
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: 180,
          height: 2,
          background: "var(--bg-elevated)",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "var(--accent)",
            borderRadius: 1,
            animation: "loadingPulse 1.6s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes loadingPulse {
          0%   { width: 0%; margin-left: 0; }
          50%  { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Conclusion / future work panel ────────────────────────────────────────────
function ConclusionPanel() {
  const futureWork = [
    {
      label: "Hidden Markov Models",
      desc: "Probabilistic state transitions with latent regime inference and forward-backward algorithm.",
    },
    {
      label: "Multivariate OT",
      desc: "Extend to joint distributions over multiple assets using sliced Wasserstein distance.",
    },
    {
      label: "Online Detection",
      desc: "Streaming regime detection with recursive Wasserstein distance updates and change-point alerts.",
    },
    {
      label: "Portfolio Overlay",
      desc: "Regime-aware position sizing, risk allocation, and rebalancing triggers conditioned on cluster label.",
    },
  ];

  return (
    <section style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            height: 2,
            background: "linear-gradient(to right, var(--accent), transparent)",
            opacity: 0.6,
          }}
        />

        <div
          style={{
            padding: "48px 48px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "start",
          }}
        >
          {/* Left: summary */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Summary
            </div>
            <h2
              className="display-md"
              style={{ marginBottom: 20 }}
            >
              What this project demonstrates
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.85,
                marginBottom: 24,
                fontWeight: 300,
              }}
            >
              By treating each rolling window as a full empirical return distribution and using exact
              1-D Wasserstein distances as the clustering metric, we recover economically meaningful
              market regimes without any ad-hoc feature engineering.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.85,
                marginBottom: 0,
                fontWeight: 300,
              }}
            >
              The Wasserstein barycenter provides a principled notion of "cluster center" grounded in
              optimal transport theory — a rigorous generalization of the Euclidean centroid into the
              space of probability distributions.
            </p>

            {/* Limitations note */}
            <div
              style={{
                marginTop: 28,
                padding: "16px 18px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 8 }}>Limitations</div>
              <ul
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  color: "var(--text-muted)",
                  lineHeight: 1.75,
                  margin: 0,
                  paddingLeft: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {[
                  "1-D distributions ignore path shape within the window",
                  "Empirical densities are noisy for short windows",
                  "Market regimes are not truly discrete states",
                  "Unsupervised labels require post-hoc interpretation",
                  "Sensitivity to rolling window length and K choice",
                ].map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: future work */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Future Extensions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {futureWork.map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "16px 18px",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    transition: "border-color 0.2s, background 0.2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--accent-dim)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-base)";
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      flexShrink: 0,
                      marginTop: 5,
                      opacity: 0.6,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10.5,
                        color: "var(--accent)",
                        marginBottom: 4,
                        fontWeight: 500,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        lineHeight: 1.65,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const output = useMemo(() => runPipeline(DEFAULT_CONFIG), []);

  if (!output) return <LoadingScreen />;

  return (
    <Layout>
      {/* 0 ── Hero */}
      <HeroSection output={output} />

      <Rule />

      {/* 1 ── Price + Regime overlay */}
      <PriceRegimeChart output={output} />

      {/* 1b ── Cumulative returns (tight attachment) */}
      <div style={{ marginTop: 20, paddingBottom: 96 }}>
        <CumulativeReturns output={output} />
      </div>

      <Rule />

      {/* 2 ── Distribution Explorer */}
      <DistributionPanels output={output} />

      <Rule />

      {/* 3 ── Interpretation scatter */}
      <ScatterPlot output={output} />

      <Rule />

      {/* 4 ── Transport: Wasserstein distance heatmap + MDS */}
      <DistanceHeatmap output={output} />

      {/* MDS embedding (attached below heatmap, same section) */}
      <div style={{ paddingBottom: 96 }}>
        <MdsPlot output={output} />
      </div>

      <Rule />

      {/* 5 ── Transitions */}
      <TransitionMatrix output={output} />

      <Rule />

      {/* 6 ── Economic interpretation */}
      <RegimeInterpretation output={output} />

      <Rule />

      {/* 7 ── Math */}
      <MathFoundation />

      <Rule />

      {/* 8 ── Evaluation */}
      <ModelEvaluation output={output} />

      {/* 9 ── Conclusion + future work */}
      <ConclusionPanel />
    </Layout>
  );
}

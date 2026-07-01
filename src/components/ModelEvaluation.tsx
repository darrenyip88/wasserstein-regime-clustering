import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PipelineOutput } from "../engine/pipeline";

interface ModelEvaluationProps {
  output: PipelineOutput;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { color: string; count: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-soft)",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 500,
          color: payload[0].payload.color,
        }}
      >
        W₂ dispersion: {payload[0].value.toFixed(2)}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
        {payload[0].payload.count} windows
      </div>
    </div>
  );
}

export function ModelEvaluation({ output }: ModelEvaluationProps) {
  const { clusterResult, regimeLabels, silhouetteScore, config } = output;

  const dispersionData = regimeLabels.map((r) => {
    const cs = clusterResult.clusterStats[r.id];
    return {
      name: r.name,
      dispersion: cs ? +(cs.withinClusterDispersion * 10000).toFixed(4) : 0,
      color: r.color,
      count: cs?.count ?? 0,
    };
  });

  const metrics = [
    {
      label: "Wasserstein Silhouette",
      value: silhouetteScore.toFixed(3),
      desc: "Mean (b−a)/max(a,b) in Wasserstein space. Range [−1,1]. Values > 0.3 indicate meaningful separation.",
      color: "var(--accent)",
      barPct: Math.max(0, silhouetteScore),
    },
    {
      label: "Total Inertia (W₂²)",
      value: clusterResult.inertia.toExponential(2),
      desc: "Sum of squared Wasserstein distances from each window to its assigned barycenter — the k-means objective being minimized.",
      color: "var(--calm)",
      barPct: 0.55,
    },
    {
      label: "Window Size",
      value: `${config.windowSize}d`,
      desc: "Rolling window length in trading days. 63 days ≈ 1 quarter. Longer windows → smoother regimes, slower responsiveness.",
      color: "var(--text-muted)",
      barPct: config.windowSize / 126,
    },
    {
      label: "k-means++ Restarts",
      value: String(config.nRestarts),
      desc: "Best-of-N random restarts with smart initialization. Reduces sensitivity to initialization in the Lloyd iteration.",
      color: "var(--text-muted)",
      barPct: config.nRestarts / 5,
    },
    {
      label: "Converged In",
      value: `${clusterResult.iterations} iter`,
      desc: "Lloyd's iterations to convergence. Wasserstein k-means typically converges faster than Euclidean k-means.",
      color: "var(--text-muted)",
      barPct: Math.min(1, clusterResult.iterations / 50),
    },
    {
      label: "K (Regimes)",
      value: String(config.K),
      desc: "Number of clusters. Informed by silhouette scores across K=2…6 and economic interpretability.",
      color: "var(--bull)",
      barPct: config.K / 6,
    },
  ];

  return (
    <section id="evaluation" style={{ paddingTop: 96, paddingBottom: 64 }}>
      <div style={{ marginBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          07 — Model Evaluation
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "end",
          }}
        >
          <h2 className="display-lg">Cluster quality metrics</h2>
          <p className="prose" style={{ margin: 0 }}>
            Since this is unsupervised, evaluation relies on within-cluster Wasserstein dispersion, silhouette analysis, and economic interpretability — not held-out labels.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
        {/* Metrics panel */}
        <div
          className="card"
          style={{ padding: "28px 28px" }}
        >
          <div className="eyebrow" style={{ marginBottom: 20 }}>
            Configuration & evaluation
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {metrics.map((m) => (
              <div
                key={m.label}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid var(--border-hair)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {m.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 500,
                      color: m.color,
                    }}
                  >
                    {m.value}
                  </span>
                </div>
                {/* Bar */}
                <div
                  style={{
                    height: 2,
                    background: "var(--border-subtle)",
                    borderRadius: 1,
                    overflow: "hidden",
                    marginBottom: 7,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(m.barPct * 100, 100)}%`,
                      height: "100%",
                      background: m.color,
                      borderRadius: 1,
                    }}
                  />
                </div>
                <p className="prose-sm" style={{ margin: 0 }}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dispersion bar chart */}
        <div
          className="card"
          style={{ padding: "28px 28px" }}
        >
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Within-cluster Wasserstein dispersion
          </div>
          <p className="prose-sm" style={{ marginBottom: 20 }}>
            Mean W₂ distance from each window to its cluster barycenter (×10⁻⁴). Lower = tighter, more cohesive cluster.
          </p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dispersionData}
                margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                barSize={28}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, fill: "var(--text-muted)" }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                <Bar dataKey="dispersion" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {dispersionData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.color}
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insight note */}
          <div
            style={{
              marginTop: 16,
              padding: "13px 14px",
              background: "var(--bg-base)",
              borderRadius: 8,
              border: "1px solid var(--border-hair)",
            }}
          >
            <p className="prose-sm" style={{ margin: 0 }}>
              Higher dispersion in volatile regimes (Crisis, Bear) reflects genuine distributional heterogeneity — not poor clustering. Bull and Calm regimes tend to cluster more tightly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

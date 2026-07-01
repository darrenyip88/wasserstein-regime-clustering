import type { PipelineOutput } from "../engine/pipeline";

interface RegimeInterpretationProps {
  output: PipelineOutput;
}

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "12px 14px",
        background: "var(--bg-elevated)",
        borderRadius: 10,
        border: "1px solid var(--border-hair)",
        flex: 1,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 500,
          color: color ?? "var(--text-secondary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function RegimeInterpretation({ output }: RegimeInterpretationProps) {
  const { regimeLabels, clusterResult } = output;

  return (
    <section id="regime-detail" style={{ paddingTop: 96, paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          06 — Economic Interpretation
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "end",
          }}
        >
          <h2 className="display-lg">What each regime tells us</h2>
          <p className="prose" style={{ margin: 0 }}>
            Clusters are interpreted post-hoc through their distributional properties.
            Language is appropriately hedged — these are unsupervised labels that{" "}
            <em style={{ color: "var(--text-primary)", fontStyle: "italic" }}>
              appear consistent with
            </em>{" "}
            known market states, not verified ground-truth classifications.
          </p>
        </div>
      </div>

      {/* Regime cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {regimeLabels.map((r, idx) => {
          const cs = clusterResult.clusterStats[r.id];
          if (!cs) return null;

          const annRet = cs.meanReturn * 252 * 100;
          const annVol = cs.meanVol * 100;
          const skew = cs.meanSkew;
          const kurt = cs.meanKurt;
          const var5 = cs.meanVar5 * 100;
          const persistence = cs.persistence;
          const avgDur = persistence > 0.01
            ? `~${((1 / (1 - persistence)) * 5).toFixed(0)} trading days`
            : "∞";

          return (
            <div
              key={r.id}
              style={{
                background: "var(--bg-surface)",
                border: `1px solid var(--border-subtle)`,
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              {/* Card top bar */}
              <div
                style={{
                  height: 3,
                  background: r.color,
                  opacity: 0.65,
                }}
              />

              <div
                style={{
                  padding: "28px 32px",
                  display: "grid",
                  gridTemplateColumns: "280px 1fr",
                  gap: 40,
                  alignItems: "start",
                }}
              >
                {/* Left: name + metrics */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div
                      className="pill"
                      style={{
                        background: `${r.color}14`,
                        border: `1px solid ${r.color}28`,
                        color: r.color,
                      }}
                    >
                      Regime {String.fromCharCode(65 + idx)}
                    </div>
                  </div>
                  <h3
                    className="font-display"
                    style={{
                      fontSize: 36,
                      fontWeight: 400,
                      color: r.color,
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    {r.name}
                  </h3>
                  <p className="prose-sm" style={{ marginBottom: 20 }}>
                    {r.distributionSignature}
                  </p>

                  {/* Metrics row */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <MetricPill
                      label="Ann. Return"
                      value={`${annRet >= 0 ? "+" : ""}${annRet.toFixed(1)}%`}
                      color={annRet >= 0 ? "var(--bull)" : "var(--bear)"}
                    />
                    <MetricPill
                      label="Ann. Vol"
                      value={`${annVol.toFixed(1)}%`}
                      color="var(--text-secondary)"
                    />
                    <MetricPill
                      label="VaR 5%"
                      value={`${var5.toFixed(2)}%`}
                      color="var(--bear)"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <MetricPill
                      label="Skew"
                      value={skew.toFixed(3)}
                      color={skew < -0.1 ? "var(--bear)" : skew > 0.1 ? "var(--bull)" : "var(--text-muted)"}
                    />
                    <MetricPill
                      label="Ex. Kurt"
                      value={kurt.toFixed(2)}
                      color={kurt > 1.5 ? "var(--crisis)" : "var(--text-muted)"}
                    />
                    <MetricPill
                      label="Avg Duration"
                      value={avgDur}
                      color="var(--text-muted)"
                    />
                  </div>
                </div>

                {/* Right: interpretation */}
                <div>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>
                    Economic interpretation
                  </div>
                  <p className="prose" style={{ marginBottom: 20 }}>
                    {r.economicInterpretation}
                  </p>

                  {/* Inline tag strip */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      {
                        show: annRet > 2,
                        label: "Positive drift",
                        color: "var(--bull)",
                      },
                      {
                        show: annRet < -1,
                        label: "Negative drift",
                        color: "var(--bear)",
                      },
                      {
                        show: annVol < 10,
                        label: "Low volatility",
                        color: "var(--calm)",
                      },
                      {
                        show: annVol > 20,
                        label: "High volatility",
                        color: "var(--bear)",
                      },
                      {
                        show: kurt > 1.5,
                        label: "Fat tails",
                        color: "var(--crisis)",
                      },
                      {
                        show: skew < -0.15,
                        label: "Left-skewed",
                        color: "var(--bear)",
                      },
                      {
                        show: persistence > 0.8,
                        label: "Persistent",
                        color: r.color,
                      },
                      {
                        show: cs.count > 30,
                        label: "Frequent",
                        color: "var(--text-muted)",
                      },
                    ]
                      .filter((t) => t.show)
                      .map((t) => (
                        <div
                          key={t.label}
                          className="insight-tag"
                          style={{ color: t.color, borderColor: `${t.color}28` }}
                        >
                          <div
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: t.color,
                            }}
                          />
                          {t.label}
                        </div>
                      ))}
                  </div>

                  {/* Window count */}
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 16,
                      borderTop: "1px solid var(--border-hair)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        fontWeight: 400,
                        color: "var(--text-muted)",
                      }}
                    >
                      <span style={{ color: r.color, fontWeight: 600 }}>
                        {cs.count}
                      </span>{" "}
                      rolling windows assigned · {((cs.count / (clusterResult.labels.length || 1)) * 100).toFixed(1)}% of total
                    </div>
                    {/* Mini bar */}
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: "var(--border-subtle)",
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(cs.count / (clusterResult.labels.length || 1)) * 100}%`,
                          height: "100%",
                          background: r.color,
                          borderRadius: 1,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

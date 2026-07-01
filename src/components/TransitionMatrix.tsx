import type { PipelineOutput } from "../engine/pipeline";

interface TransitionMatrixProps {
  output: PipelineOutput;
}

export function TransitionMatrix({ output }: TransitionMatrixProps) {
  const { transitionMatrix, regimeLabels, clusterResult } = output;

  const persistence = clusterResult.clusterStats.map((cs) => ({
    id: cs.id,
    persistence: cs.persistence,
    count: cs.count,
    avgRunLength: cs.persistence > 0.01
      ? `~${((1 / (1 - cs.persistence)) * 5).toFixed(0)}d`
      : "∞",
  }));

  return (
    <section id="transitions" style={{ paddingTop: 96, paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          05 — Regime Dynamics
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "end",
          }}
        >
          <h2 className="display-lg">Transition probabilities</h2>
          <p className="prose" style={{ margin: 0 }}>
            Empirical Markov transition matrix T[i→j] estimated from consecutive window pairs. High diagonal values indicate persistent regimes. Off-diagonal entries reveal the most likely regime switches.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        {/* Transition heatmap */}
        <div
          className="card"
          style={{ padding: "28px 28px" }}
        >
          <div className="eyebrow" style={{ marginBottom: 20 }}>
            P(next | current) — row-stochastic
          </div>

          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `120px repeat(${regimeLabels.length}, 1fr)`,
              gap: 6,
              marginBottom: 8,
            }}
          >
            <div />
            {regimeLabels.map((r) => (
              <div
                key={r.id}
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: r.color,
                  letterSpacing: "0.02em",
                  paddingBottom: 8,
                  borderBottom: `1px solid ${r.color}28`,
                }}
              >
                {r.name}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {transitionMatrix.map((row, fromIdx) => {
            const fromLabel = regimeLabels[fromIdx];
            if (!fromLabel) return null;
            return (
              <div
                key={fromIdx}
                style={{
                  display: "grid",
                  gridTemplateColumns: `120px repeat(${regimeLabels.length}, 1fr)`,
                  gap: 6,
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                {/* From label */}
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: fromLabel.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: fromLabel.color,
                      flexShrink: 0,
                    }}
                  />
                  {fromLabel.name}
                </div>

                {/* Cells */}
                {row.map((prob, toIdx) => {
                  const isDiag = fromIdx === toIdx;
                  const toLabel = regimeLabels[toIdx];
                  const intensity = Math.pow(prob, 0.65);

                  return (
                    <div
                      key={toIdx}
                      title={`P(${fromLabel.name} → ${toLabel?.name ?? toIdx}) = ${(prob * 100).toFixed(1)}%`}
                      style={{
                        height: 48,
                        borderRadius: 8,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        background: isDiag
                          ? `${toLabel?.color ?? "#888"}14`
                          : `rgba(255,248,235,${0.01 + intensity * 0.05})`,
                        border: isDiag
                          ? `1px solid ${toLabel?.color ?? "#888"}28`
                          : "1px solid var(--border-hair)",
                        position: "relative",
                        overflow: "hidden",
                        cursor: "default",
                        transition: "background 0.2s",
                      }}
                    >
                      {/* Fill bar bottom */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${prob * 100}%`,
                          background: isDiag
                            ? `${toLabel?.color ?? "#888"}18`
                            : `rgba(255,248,235,0.03)`,
                          borderRadius: "0 0 8px 8px",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          fontWeight: 500,
                          color: isDiag
                            ? toLabel?.color ?? "#888"
                            : prob > 0.15
                            ? "var(--text-secondary)"
                            : "var(--text-muted)",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {(prob * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Persistence sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            className="card"
            style={{ padding: "24px 24px" }}
          >
            <div className="eyebrow" style={{ marginBottom: 20 }}>
              Regime persistence
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {persistence.map((p) => {
                const label = regimeLabels[p.id];
                if (!label) return null;
                return (
                  <div key={p.id} style={{ marginBottom: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: label.color,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            fontWeight: 500,
                            color: label.color,
                          }}
                        >
                          {label.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {(p.persistence * 100).toFixed(1)}%
                      </span>
                    </div>
                    {/* Bar */}
                    <div
                      style={{
                        height: 3,
                        background: "var(--border-subtle)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${p.persistence * 100}%`,
                          height: "100%",
                          background: label.color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10.5,
                        fontWeight: 400,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      Avg duration: {p.avgRunLength}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {[
            {
              label: "Interpretation",
              text: "High diagonal values (e.g., >80%) suggest momentum — a regime is likely to persist from one week to the next. Low diagonal values indicate rapid switching or transitional states.",
            },
            {
              label: "Markov assumption",
              text: "This matrix treats regime transitions as first-order Markov. Real markets have longer memory. A hidden Markov model would be a natural extension.",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "18px 20px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 14,
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                {item.label}
              </div>
              <p className="prose-sm" style={{ margin: 0 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

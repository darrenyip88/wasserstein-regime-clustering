import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
} from "recharts";
import type { PipelineOutput } from "../engine/pipeline";

interface ScatterPlotProps {
  output: PipelineOutput;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { vol: number; mean: number; skew: number; kurt: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-soft)",
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 10,
        }}
      >
        Rolling Window
      </div>
      {[
        {
          label: "Ann. Return",
          value: `${d.mean >= 0 ? "+" : ""}${d.mean.toFixed(1)}%`,
          color: d.mean >= 0 ? "var(--bull)" : "var(--bear)",
        },
        { label: "Ann. Vol", value: `${d.vol.toFixed(1)}%`, color: "var(--text-secondary)" },
        { label: "Skewness", value: d.skew?.toFixed(3), color: "var(--text-muted)" },
        { label: "Ex. Kurtosis", value: d.kurt?.toFixed(3), color: "var(--text-muted)" },
      ].map((row) => (
        <div
          key={row.label}
          style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 3 }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            {row.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              fontWeight: 500,
              color: row.color,
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ScatterPlot({ output }: ScatterPlotProps) {
  const { clusterResult, regimeLabels } = output;

  const clusterGroups = regimeLabels.map((r) => ({
    regime: r,
    points: clusterResult.windowStats
      .filter((s) => s.label === r.id)
      .map((s) => ({
        vol: s.std * Math.sqrt(252) * 100,
        mean: s.mean * 252 * 100,
        skew: s.skew,
        kurt: s.kurt,
        label: s.label,
      })),
  }));

  const centroids = regimeLabels.map((r) => {
    const cs = clusterResult.clusterStats[r.id];
    return {
      r,
      annRet: (cs?.meanReturn ?? 0) * 252 * 100,
      annVol: (cs?.meanVol ?? 0) * 100,
      skew: cs?.meanSkew ?? 0,
    };
  });

  return (
    <section id="interpretation" style={{ paddingTop: 96, paddingBottom: 64 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* Left */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            03 — Interpretation
          </div>
          <h2 className="display-lg" style={{ marginBottom: 16 }}>
            Mean–Volatility space
          </h2>
          <p className="prose" style={{ marginBottom: 24 }}>
            Each point is a 63-day rolling window. Color reflects the{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              Wasserstein cluster label
            </span>
            , not a scalar feature. This view is for{" "}
            <em style={{ color: "var(--text-primary)" }}>
              interpretation
            </em>
            , not clustering input.
          </p>
          <p className="prose" style={{ marginBottom: 32 }}>
            Regimes occupy distinct regions — Bull tilts toward high return / low vol, Crisis clusters at high vol extremes. These are{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              consequences
            </span>{" "}
            of distributional clustering, not its inputs.
          </p>

          {/* Centroid table */}
          <div
            style={{
              borderRadius: 12,
              border: "1px solid var(--border-subtle)",
              overflow: "hidden",
              background: "var(--bg-surface)",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 4,
              }}
            >
              {["Regime", "μ (ann.)", "σ (ann.)", "Skew"].map((h) => (
                <span
                  key={h}
                  className="eyebrow"
                  style={{ fontSize: 9.5 }}
                >
                  {h}
                </span>
              ))}
            </div>
            {centroids.map(({ r, annRet, annVol, skew }) => (
              <div
                key={r.id}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border-hair)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: r.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: r.color,
                    }}
                  >
                    {r.name}
                  </span>
                </div>
                <span
                  className="data-value"
                  style={{
                    color: annRet >= 0 ? "var(--bull)" : "var(--bear)",
                  }}
                >
                  {annRet >= 0 ? "+" : ""}{annRet.toFixed(1)}%
                </span>
                <span
                  className="data-value"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {annVol.toFixed(1)}%
                </span>
                <span
                  className="data-value"
                  style={{
                    color:
                      skew < -0.1
                        ? "var(--bear)"
                        : skew > 0.1
                        ? "var(--bull)"
                        : "var(--text-muted)",
                  }}
                >
                  {skew.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: scatter */}
        <div
          className="card"
          style={{ padding: "24px 20px 16px" }}
        >
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Wasserstein clusters projected onto scalar axes
          </div>
          <div style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="vol"
                  type="number"
                  name="Volatility"
                  label={{
                    value: "Ann. Volatility (%)",
                    position: "insideBottom",
                    offset: -4,
                    style: {
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      fontWeight: 500,
                      fill: "var(--text-muted)",
                    },
                  }}
                  tick={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fill: "var(--text-muted)",
                  }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="mean"
                  type="number"
                  name="Return"
                  label={{
                    value: "Ann. Return (%)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    style: {
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      fontWeight: 500,
                      fill: "var(--text-muted)",
                    },
                  }}
                  tick={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fill: "var(--text-muted)",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <ZAxis range={[14, 14]} />
                <ReferenceLine
                  y={0}
                  stroke="rgba(255,248,235,0.08)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                {clusterGroups.map(({ regime, points }) => (
                  <Scatter
                    key={regime.id}
                    name={regime.name}
                    data={points}
                    fill={regime.color}
                    fillOpacity={0.52}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {/* Regime color legend */}
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
              paddingTop: 12,
              borderTop: "1px solid var(--border-hair)",
            }}
          >
            {regimeLabels.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: r.color,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: r.color,
                  }}
                >
                  {r.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

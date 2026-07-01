import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import type { PipelineOutput } from "../engine/pipeline";

interface MdsPlotProps {
  output: PipelineOutput;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { x: number; y: number; mean: number; vol: number };
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
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        MDS PROJECTION
      </div>
      {[
        {
          label: "Component 1",
          value: d.x.toFixed(4),
          color: "var(--text-secondary)",
        },
        {
          label: "Component 2",
          value: d.y.toFixed(4),
          color: "var(--text-secondary)",
        },
        {
          label: "Ann. Return",
          value: `${(d.mean * 100).toFixed(1)}%`,
          color: d.mean > 0 ? "var(--bull)" : "var(--bear)",
        },
        {
          label: "Ann. Vol",
          value: `${(d.vol * 100).toFixed(1)}%`,
          color: "var(--text-muted)",
        },
      ].map((row) => (
        <div
          key={row.label}
          style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 3 }}
        >
          <span
            style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-muted)" }}
          >
            {row.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: row.color,
              fontWeight: 500,
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MdsPlot({ output }: MdsPlotProps) {
  const { mdsPoints, regimeLabels } = output;

  const groups = regimeLabels.map((r) => ({
    regime: r,
    points: mdsPoints.filter((p) => p.label === r.id),
  }));

  return (
    <div
      className="card"
      style={{ padding: "28px 28px 20px", marginTop: 16 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2.2fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Left */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Wasserstein Geometry (MDS)
          </div>
          <h3
            className="font-display"
            style={{ fontSize: 22, fontWeight: 400, color: "var(--text-primary)", margin: "0 0 14px" }}
          >
            2-D embedding of the distance matrix
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.8,
              marginBottom: 20,
              fontWeight: 300,
            }}
          >
            Classical MDS applied to the pairwise Wasserstein matrix. Each point is a rolling window
            projected into 2-D so that inter-point distances approximate Wasserstein geometry.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.8,
              margin: 0,
              fontWeight: 300,
            }}
          >
            Well-separated clusters here correspond to distributional distinctness — not just
            differing means or variances.
          </p>

          {/* Regime dots */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {regimeLabels.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: r.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: r.color,
                  }}
                >
                  {r.name}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    color: "var(--text-faint)",
                    marginLeft: "auto",
                  }}
                >
                  {groups.find((g) => g.regime.id === r.id)?.points.length ?? 0} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: scatter */}
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis
                dataKey="x"
                type="number"
                name="MDS-1"
                tick={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fill: "var(--text-muted)",
                }}
                label={{
                  value: "Component 1",
                  position: "insideBottom",
                  offset: -4,
                  style: {
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fill: "var(--text-muted)",
                    letterSpacing: "0.06em",
                  },
                }}
                axisLine={{ stroke: "var(--border-subtle)" }}
                tickLine={false}
              />
              <YAxis
                dataKey="y"
                type="number"
                name="MDS-2"
                tick={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  fill: "var(--text-muted)",
                }}
                label={{
                  value: "Component 2",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  style: {
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fill: "var(--text-muted)",
                    letterSpacing: "0.06em",
                  },
                }}
                axisLine={false}
                tickLine={false}
              />
              <ZAxis range={[16, 16]} />
              <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
              {groups.map(({ regime, points }) => (
                <Scatter
                  key={regime.id}
                  name={regime.name}
                  data={points}
                  fill={regime.color}
                  fillOpacity={0.55}
                  isAnimationActive={false}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

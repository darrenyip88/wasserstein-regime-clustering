import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";
import type { PipelineOutput } from "../engine/pipeline";
import { kde } from "../engine/wasserstein";

interface DistributionPanelsProps {
  output: PipelineOutput;
}

function MiniStat({
  label,
  value,
  color,
  barPct,
}: {
  label: string;
  value: string;
  color?: string;
  barPct?: number;
}) {
  return (
    <div className="stat-row">
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {barPct !== undefined && (
          <div
            style={{
              width: 36,
              height: 2,
              background: "var(--border-subtle)",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(barPct * 100, 100)}%`,
                height: "100%",
                background: color ?? "var(--accent)",
                borderRadius: 1,
              }}
            />
          </div>
        )}
        <span
          className="data-value"
          style={{ color: color ?? "var(--text-secondary)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function RegimeCard({
  regime,
  kdeData,
  baryKde,
  cs,
  maxVol,
  maxCount,
  isActive,
  onHover,
}: {
  regime: PipelineOutput["regimeLabels"][number];
  kdeData: Array<{ x: number; y: number }>;
  baryKde: Array<{ x: number; y: number }>;
  cs: { count: number; meanReturn: number; meanVol: number; meanSkew: number; meanKurt: number; meanVar5: number; persistence: number };
  maxVol: number;
  maxCount: number;
  isActive: boolean;
  onHover: (id: number | null) => void;
}) {
  const gradId = `dist-grad-${regime.id}`;
  const baryGradId = `dist-bary-${regime.id}`;
  const annRet = cs.meanReturn * 252 * 100;
  const annVol = cs.meanVol * 100;
  const persistence = cs.persistence;
  const avgDur = persistence > 0.01
    ? `~${((1 / (1 - persistence)) * 5).toFixed(0)}d`
    : ">200d";

  return (
    <div
      className="hover-lift"
      onMouseEnter={() => onHover(regime.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        background: isActive ? `${regime.color}08` : "var(--bg-surface)",
        border: `1px solid ${isActive ? regime.color + "28" : "var(--border-subtle)"}`,
        borderRadius: 20,
        overflow: "hidden",
        transition: "background 0.25s, border-color 0.25s",
        cursor: "default",
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "20px 22px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div>
          <div
            className="pill"
            style={{
              background: `${regime.color}14`,
              border: `1px solid ${regime.color}28`,
              color: regime.color,
              marginBottom: 8,
            }}
          >
            Regime {regime.id}
          </div>
          <h3
            className="font-display"
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: regime.color,
              lineHeight: 1,
            }}
          >
            {regime.name}
          </h3>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              fontWeight: 500,
              color: annRet >= 0 ? "var(--bull)" : "var(--bear)",
              letterSpacing: "-0.02em",
            }}
          >
            {annRet >= 0 ? "+" : ""}{annRet.toFixed(1)}%
          </div>
          <div className="eyebrow" style={{ marginTop: 4 }}>ann. return</div>
        </div>
      </div>

      {/* KDE chart */}
      <div style={{ height: 108 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={kdeData}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={regime.color} stopOpacity={0.26} />
                <stop offset="100%" stopColor={regime.color} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id={baryGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={regime.color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={regime.color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="x" hide />
            <YAxis hide />
            <ReferenceLine
              x={0}
              stroke="rgba(255,248,235,0.08)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: 8,
                      padding: "8px 12px",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
                      {typeof label === "number" ? `r = ${(label * 100).toFixed(2)}%` : label}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: regime.color, fontWeight: 500 }}>
                      ρ = {Number(payload[0].value).toFixed(4)}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke={regime.color}
              strokeWidth={1.6}
              fill={`url(#${gradId})`}
              dot={false}
              isAnimationActive={false}
              opacity={0.8}
            />
            {baryKde.length > 0 && (
              <Area
                data={baryKde}
                type="monotone"
                dataKey="y"
                stroke={regime.color}
                strokeWidth={2}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
                isAnimationActive={false}
                opacity={0.5}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div style={{ padding: "4px 22px 20px" }}>
        <MiniStat
          label="Ann. Volatility"
          value={`${annVol.toFixed(1)}%`}
          color="var(--text-secondary)"
          barPct={maxVol > 0 ? cs.meanVol / maxVol : 0}
        />
        <MiniStat
          label="Skewness"
          value={cs.meanSkew.toFixed(3)}
          color={cs.meanSkew < -0.15 ? "var(--bear)" : cs.meanSkew > 0.15 ? "var(--bull)" : "var(--text-muted)"}
        />
        <MiniStat
          label="Ex. Kurtosis"
          value={cs.meanKurt.toFixed(2)}
          color={cs.meanKurt > 1.5 ? "var(--crisis)" : "var(--text-muted)"}
        />
        <MiniStat
          label="5th Pctile (VaR)"
          value={`${(cs.meanVar5 * 100).toFixed(2)}%`}
          color="var(--bear)"
        />
        <MiniStat
          label="Windows"
          value={String(cs.count)}
          barPct={maxCount > 0 ? cs.count / maxCount : 0}
          color={regime.color}
        />
        <MiniStat label="Avg Duration" value={avgDur} color="var(--text-muted)" />
      </div>
    </div>
  );
}

export function DistributionPanels({ output }: DistributionPanelsProps) {
  const { clusterResult, regimeLabels, windows, barycentersKde } = output;
  const [activeRegime, setActiveRegime] = useState<number | null>(null);

  const clusterData = useMemo(() => {
    return regimeLabels.map((r) => {
      const memberWindows = windows.filter(
        (_, i) => clusterResult.labels[i] === r.id
      );
      const allReturns = memberWindows.flatMap((w) => w.returns);
      const kdeData = kde(allReturns, 180, 0.20);
      const cs = clusterResult.clusterStats[r.id];
      return { r, kdeData, cs, baryKde: barycentersKde[r.id] ?? [] };
    });
  }, [clusterResult, regimeLabels, windows, barycentersKde]);

  const maxVol = Math.max(...clusterData.map((d) => d.cs?.meanVol ?? 0));
  const maxCount = Math.max(...clusterData.map((d) => d.cs?.count ?? 0));

  return (
    <section id="distributions" style={{ paddingTop: 96, paddingBottom: 64 }}>
      {/* Section header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
          alignItems: "end",
          marginBottom: 48,
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            02 — Distribution Explorer
          </div>
          <h2 className="display-lg">
            Return distributions by regime
          </h2>
        </div>
        <p className="prose" style={{ margin: 0 }}>
          Each panel shows the empirical density of returns pooled across all windows assigned to that cluster. The dashed line is the{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Wasserstein barycenter</span>{" "}
          — the optimal transport centroid of the regime.
        </p>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Pooled returns KDE", dash: false },
          { label: "Wasserstein barycenter", dash: true },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="24" height="2" viewBox="0 0 24 2">
              {l.dash ? (
                <line x1="0" y1="1" x2="24" y2="1" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 3" />
              ) : (
                <line x1="0" y1="1" x2="24" y2="1" stroke="var(--text-muted)" strokeWidth="1.5" />
              )}
            </svg>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                fontWeight: 400,
                color: "var(--text-muted)",
              }}
            >
              {l.label}
            </span>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {clusterData.map(({ r, kdeData, cs, baryKde }) => {
          if (!cs) return null;
          return (
            <RegimeCard
              key={r.id}
              regime={r}
              kdeData={kdeData}
              baryKde={baryKde}
              cs={cs}
              maxVol={maxVol}
              maxCount={maxCount}
              isActive={activeRegime === r.id}
              onHover={setActiveRegime}
            />
          );
        })}
      </div>

      {/* Bottom note */}
      <div
        style={{
          marginTop: 28,
          padding: "16px 20px",
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 7 }} />
        <p className="prose-sm" style={{ margin: 0 }}>
          The visual separation of these distributions is what Wasserstein distance measures precisely — it quantifies the minimum "work" needed to transport one distribution's mass to match another. Distributions that look visually distinct here will have large pairwise W₁ distances.
        </p>
      </div>
    </section>
  );
}

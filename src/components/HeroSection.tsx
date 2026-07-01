import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PipelineOutput } from "../engine/pipeline";
import { kde } from "../engine/wasserstein";

interface HeroSectionProps {
  output: PipelineOutput;
}

// ── Distribution comparison card ──────────────────────────────────────────────
function DistCard({
  name,
  tag,
  color,
  dimColor,
  borderColor,
  kdeData,
  stats,
  align,
}: {
  name: string;
  tag: string;
  color: string;
  dimColor: string;
  borderColor: string;
  kdeData: Array<{ x: number; y: number }>;
  stats: Array<{ label: string; value: string }>;
  align: "left" | "right";
}) {
  const gradId = `hero-grad-${name.replace(/\s/g, "")}`;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: "36px 32px 28px",
        background: dimColor,
        borderRadius: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow — reduced opacity for restraint */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: color,
          opacity: 0.05,
          filter: "blur(70px)",
          top: -50,
          left: align === "left" ? -50 : "auto",
          right: align === "right" ? -50 : "auto",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: align === "left" ? "flex-start" : "flex-end",
          marginBottom: 24,
          gap: 10,
        }}
      >
        <div
          className="pill"
          style={{
            background: `${color}14`,
            border: `1px solid ${borderColor}`,
            color,
          }}
        >
          {tag}
        </div>
        <h3
          className="font-display"
          style={{
            fontSize: 32,
            fontWeight: 400,
            color,
            lineHeight: 1,
            textAlign: align,
          }}
        >
          {name}
        </h3>
      </div>

      {/* KDE chart */}
      <div style={{ height: 120, marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={kdeData}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis dataKey="x" hide />
            <ReferenceLine
              x={0}
              stroke="rgba(255,248,235,0.10)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={1.8}
              fill={`url(#${gradId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          borderTop: `1px solid ${borderColor}`,
          paddingTop: 16,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              justifyContent: align === "left" ? "flex-start" : "flex-end",
              alignItems: "center",
              gap: 10,
              flexDirection: align === "left" ? "row" : "row-reverse",
              padding: "6px 0",
              borderBottom: "1px solid rgba(255,248,235,0.04)",
            }}
          >
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
              {s.label}
            </span>
            <span
              className="data-value"
              style={{ color, fontSize: 12 }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VS Divider ─────────────────────────────────────────────────────────────────
function VsDivider() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 4px",
        position: "relative",
        flexShrink: 0,
        width: 1,
        background: "var(--border-subtle)",
      }}
    >
      <div
        style={{
          position: "absolute",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-soft)",
          borderRadius: 999,
          padding: "7px 11px",
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        vs
      </div>
    </div>
  );
}

// ── Summary metric strip ───────────────────────────────────────────────────────
function MetricStrip({
  items,
}: {
  items: Array<{ value: string; label: string; sub?: string }>;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderRadius: 16,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            flex: 1,
            padding: "20px 16px",
            borderRight: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
            textAlign: "center",
          }}
        >
          <div
            className="metric-num"
            style={{ fontSize: 22, color: "var(--text-primary)", marginBottom: 5 }}
          >
            {item.value}
          </div>
          <div className="metric-label" style={{ marginBottom: item.sub ? 3 : 0 }}>
            {item.label}
          </div>
          {item.sub && (
            <div className="metric-sub">{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main HeroSection ──────────────────────────────────────────────────────────
export function HeroSection({ output }: HeroSectionProps) {
  const { clusterResult, regimeLabels, silhouetteScore, config, windows } = output;

  const { bullKde, bearKde, bullStats, bearStats } = useMemo(() => {
    const byMean = [...clusterResult.clusterStats].sort(
      (a, b) => b.meanReturn - a.meanReturn
    );
    const bullId = byMean[0]?.id ?? 0;
    const bearId = byMean[byMean.length - 1]?.id ?? 1;

    const bullW = windows.filter((_, i) => clusterResult.labels[i] === bullId);
    const bearW = windows.filter((_, i) => clusterResult.labels[i] === bearId);
    const bullR = bullW.flatMap((w) => w.returns);
    const bearR = bearW.flatMap((w) => w.returns);

    const allR = [...bullR, ...bearR];
    const gMin = Math.min(...allR);
    const gMax = Math.max(...allR);

    const bullCs = clusterResult.clusterStats[bullId];
    const bearCs = clusterResult.clusterStats[bearId];

    return {
      bullKde: kde(bullR, 120, 0.14).filter(
        (p) => p.x >= gMin * 1.4 && p.x <= gMax * 1.4
      ),
      bearKde: kde(bearR, 120, 0.14).filter(
        (p) => p.x >= gMin * 1.4 && p.x <= gMax * 1.4
      ),
      bullStats: [
        { label: "Drift", value: `+${(bullCs.meanReturn * 252 * 100).toFixed(1)}% ann.` },
        { label: "Volatility", value: `${(bullCs.meanVol * 100).toFixed(1)}% ann.` },
        { label: "Kurtosis", value: bullCs.meanKurt.toFixed(2) },
      ],
      bearStats: [
        { label: "Drift", value: `${(bearCs.meanReturn * 252 * 100).toFixed(1)}% ann.` },
        { label: "Volatility", value: `${(bearCs.meanVol * 100).toFixed(1)}% ann.` },
        { label: "Kurtosis", value: bearCs.meanKurt.toFixed(2) },
      ],
    };
  }, [clusterResult, windows]);

  const bullLabel = regimeLabels.find((r) => {
    const byMean = [...clusterResult.clusterStats].sort((a, b) => b.meanReturn - a.meanReturn);
    return r.id === (byMean[0]?.id ?? 0);
  });
  const bearLabel = regimeLabels.find((r) => {
    const byMean = [...clusterResult.clusterStats].sort((a, b) => b.meanReturn - a.meanReturn);
    return r.id === (byMean[byMean.length - 1]?.id ?? 1);
  });

  const metrics = [
    { value: windows.length.toString(), label: "Rolling Windows", sub: `${config.windowSize}d each` },
    { value: String(config.K), label: "Regimes", sub: "k-means clusters" },
    { value: silhouetteScore.toFixed(3), label: "Silhouette", sub: "Wasserstein-adapted" },
    { value: "W₁", label: "Distance", sub: "Exact 1-D OT" },
    { value: "~5yr", label: "Horizon", sub: "1,260 trading days" },
  ];

  return (
    <section
      id="hero"
      className="dot-grid"
      style={{ paddingTop: 88, paddingBottom: 108 }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Eyebrow pills */}
        <div
          className="fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 36,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { text: "Optimal Transport", accent: true },
            { text: "Unsupervised Learning", accent: false },
            { text: "Full Distributions", accent: false },
          ].map((p) => (
            <div
              key={p.text}
              className="pill"
              style={
                p.accent
                  ? {
                      background: "var(--accent-dim)",
                      border: "1px solid var(--accent-border)",
                      color: "var(--accent)",
                    }
                  : {
                      background: "rgba(255,248,235,0.04)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)",
                    }
              }
            >
              {p.text}
            </div>
          ))}
        </div>

        {/* Main title */}
        <h1
          className="font-display fade-up fade-up-1"
          style={{
            fontSize: "clamp(40px, 6vw, 74px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            margin: "0 0 6px",
          }}
        >
          Market Regime
        </h1>
        <h1
          className="font-display fade-up fade-up-1"
          style={{
            fontSize: "clamp(40px, 6vw, 74px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            margin: "0 0 32px",
            fontStyle: "italic",
          }}
        >
          <span style={{ color: "var(--accent)" }}>Clustering</span>
        </h1>

        {/* Subtitle — Manrope, readable, not ultra-thin */}
        <p
          className="fade-up fade-up-2"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 400,
            color: "var(--text-secondary)",
            lineHeight: 1.75,
            maxWidth: 540,
            margin: "0 auto 44px",
          }}
        >
          Clustering{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            full return distributions
          </span>{" "}
          with{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            Wasserstein geometry
          </span>{" "}
          to detect persistent market states — without reducing distributions to scalars.
        </p>

        {/* CTA */}
        <div className="fade-up fade-up-2" style={{ marginBottom: 64 }}>
          <a href="#regimes" className="btn-primary">
            Explore Regimes
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2.5 6.5h8M8 3.5l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        {/* ── Hero distribution panel ── */}
        <div
          className="fade-up fade-up-3"
          style={{
            borderRadius: 24,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span className="eyebrow">Distribution Comparison</span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 400,
                color: "var(--text-muted)",
              }}
            >
              Kernel density · 63-day rolling returns
            </span>
          </div>

          {/* Two distribution cards */}
          <div style={{ display: "flex" }}>
            <DistCard
              name={bullLabel?.name ?? "Bull Market"}
              tag="Regime A"
              color="var(--bull)"
              dimColor="rgba(107,184,135,0.04)"
              borderColor="var(--bull-border)"
              kdeData={bullKde}
              stats={bullStats}
              align="left"
            />
            <VsDivider />
            <DistCard
              name={bearLabel?.name ?? "Bear Market"}
              tag="Regime D"
              color="var(--bear)"
              dimColor="rgba(212,124,98,0.04)"
              borderColor="var(--bear-border)"
              kdeData={bearKde}
              stats={bearStats}
              align="right"
            />
          </div>

          {/* Bottom note */}
          <div
            style={{
              padding: "13px 24px",
              borderTop: "1px solid var(--border-subtle)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                fontWeight: 400,
                color: "var(--text-muted)",
              }}
            >
              W₁ distance between these distributions drives the clustering — not scalar features like mean or variance
            </span>
          </div>
        </div>

        {/* ── Metric strip ── */}
        <div className="fade-up fade-up-4">
          <MetricStrip items={metrics} />
        </div>
      </div>
    </section>
  );
}

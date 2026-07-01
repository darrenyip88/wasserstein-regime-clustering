import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { PipelineOutput } from "../engine/pipeline";

interface PriceRegimeChartProps {
  output: PipelineOutput;
}

interface RegimeSpan {
  start: string;
  end: string;
  label: number;
  color: string;
  name: string;
}

function SectionHeader({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{num}</div>
      <h2 className="display-lg" style={{ marginBottom: 14 }}>
        {title}
      </h2>
      <p className="prose" style={{ margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

function CustomTooltipContent({
  active,
  payload,
  label,
  regimeLabels,
  windowTimeline,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  regimeLabels: PipelineOutput["regimeLabels"];
  windowTimeline: PipelineOutput["windowTimeline"];
}) {
  if (!active || !payload?.length || !label) return null;
  const price = payload[0].value;
  const wpt = windowTimeline.find((w) => w.date >= label);
  const regime = wpt ? regimeLabels[wpt.label] : null;

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-soft)",
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 500,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        {price.toFixed(2)}
      </div>
      {regime && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 8px",
            borderRadius: 6,
            background: `${regime.color}14`,
            border: `1px solid ${regime.color}28`,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: regime.color,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 500,
              color: regime.color,
            }}
          >
            {regime.name} Regime
          </span>
        </div>
      )}
    </div>
  );
}

// Slim regime strip
function RegimeStrip({
  windowTimeline,
  regimeLabels,
}: {
  windowTimeline: PipelineOutput["windowTimeline"];
  regimeLabels: PipelineOutput["regimeLabels"];
}) {
  if (windowTimeline.length === 0) return null;
  const total = windowTimeline.length;

  const spans: { start: number; end: number; label: number; color: string; name: string }[] = [];
  let cur = { start: 0, label: windowTimeline[0].label };
  for (let i = 1; i < total; i++) {
    if (windowTimeline[i].label !== cur.label) {
      const r = regimeLabels[cur.label];
      spans.push({ start: cur.start, end: i - 1, label: cur.label, color: r?.color ?? "#888", name: r?.name ?? "" });
      cur = { start: i, label: windowTimeline[i].label };
    }
  }
  const rLast = regimeLabels[cur.label];
  spans.push({ start: cur.start, end: total - 1, label: cur.label, color: rLast?.color ?? "#888", name: rLast?.name ?? "" });

  return (
    <div style={{ marginTop: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Regime timeline</div>
      <div
        style={{
          height: 20,
          display: "flex",
          borderRadius: 6,
          overflow: "hidden",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {spans.map((span, i) => {
          const width = ((span.end - span.start + 1) / total) * 100;
          return (
            <div
              key={i}
              title={span.name}
              style={{
                width: `${width}%`,
                background: span.color,
                opacity: 0.68,
                transition: "opacity 0.2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.68"; }}
            />
          );
        })}
      </div>
      {/* Year ticks */}
      <div style={{ position: "relative", height: 16, marginTop: 4 }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500, color: "var(--text-faint)", position: "absolute", left: 0 }}>
          {windowTimeline[0]?.date.slice(0, 4)}
        </span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 500, color: "var(--text-faint)", position: "absolute", right: 0 }}>
          {windowTimeline[total - 1]?.date.slice(0, 4)}
        </span>
      </div>
    </div>
  );
}

export function PriceRegimeChart({ output }: PriceRegimeChartProps) {
  const { prices, windowTimeline, regimeLabels } = output;
  const [hoveredRegime, setHoveredRegime] = useState<number | null>(null);

  const spans: RegimeSpan[] = useMemo(() => {
    const result: RegimeSpan[] = [];
    if (windowTimeline.length === 0) return result;
    let currentLabel = windowTimeline[0].label;
    let spanStart = windowTimeline[0].date;
    for (let i = 1; i < windowTimeline.length; i++) {
      if (windowTimeline[i].label !== currentLabel) {
        result.push({
          start: spanStart,
          end: windowTimeline[i - 1].date,
          label: currentLabel,
          color: regimeLabels[currentLabel]?.color ?? "#888",
          name: regimeLabels[currentLabel]?.name ?? "",
        });
        currentLabel = windowTimeline[i].label;
        spanStart = windowTimeline[i].date;
      }
    }
    result.push({
      start: spanStart,
      end: windowTimeline[windowTimeline.length - 1].date,
      label: currentLabel,
      color: regimeLabels[currentLabel]?.color ?? "#888",
      name: regimeLabels[currentLabel]?.name ?? "",
    });
    return result;
  }, [windowTimeline, regimeLabels]);

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(prices.length / 500));
    return prices
      .filter((_, i) => i % step === 0)
      .map((p) => ({ date: p.date, price: +p.price.toFixed(2) }));
  }, [prices]);

  const tickDates = useMemo(() => {
    const seen = new Set<string>();
    return chartData
      .filter((d) => {
        const yr = d.date.slice(0, 4);
        if (!seen.has(yr)) { seen.add(yr); return true; }
        return false;
      })
      .map((d) => d.date);
  }, [chartData]);

  const priceMin = Math.min(...chartData.map((d) => d.price)) * 0.97;
  const priceMax = Math.max(...chartData.map((d) => d.price)) * 1.03;

  return (
    <section id="regimes" style={{ paddingTop: 96, paddingBottom: 64 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2.4fr",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div>
          <SectionHeader
            num="01 — Price & Regimes"
            title="Detected market states over time"
            body="Each rolling window is assigned to the nearest Wasserstein barycenter. The price series is shaded by cluster label, revealing how regimes evolve through calendar time."
          />

          {/* Regime legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {regimeLabels.map((r) => {
              const cs = output.clusterResult.clusterStats[r.id];
              const annRet = (cs?.meanReturn ?? 0) * 252 * 100;
              const isHovered = hoveredRegime === r.id;
              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoveredRegime(r.id)}
                  onMouseLeave={() => setHoveredRegime(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: isHovered ? `${r.color}10` : "transparent",
                    border: `1px solid ${isHovered ? r.color + "30" : "var(--border-hair)"}`,
                    cursor: "default",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: r.color,
                      flexShrink: 0,
                      boxShadow: isHovered ? `0 0 8px ${r.color}60` : "none",
                      transition: "box-shadow 0.2s",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: isHovered ? r.color : "var(--text-secondary)",
                        transition: "color 0.2s",
                      }}
                    >
                      {r.name}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      color: annRet >= 0 ? "var(--bull)" : "var(--bear)",
                      fontWeight: 500,
                    }}
                  >
                    {annRet >= 0 ? "+" : ""}{annRet.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insight note */}
          <div
            style={{
              marginTop: 24,
              padding: "16px 18px",
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 8 }}>Key insight</div>
            <p className="prose-sm" style={{ margin: 0 }}>
              Regime assignment is driven by Wasserstein distance to the cluster barycenter — the full distributional shape, not just mean return or volatility.
            </p>
          </div>
        </div>

        {/* Right column: chart */}
        <div>
          <div
            className="card"
            style={{ padding: "24px 24px 16px", overflow: "hidden" }}
          >
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  {spans.map((span, i) => {
                    const isHov = hoveredRegime === span.label;
                    return (
                      <ReferenceArea
                        key={i}
                        x1={span.start}
                        x2={span.end}
                        fill={span.color}
                        fillOpacity={isHov ? 0.16 : 0.08}
                      />
                    );
                  })}

                  <XAxis
                    dataKey="date"
                    ticks={tickDates}
                    tickFormatter={(v) => v.slice(0, 4)}
                    tick={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 500,
                      fill: "var(--text-muted)",
                    }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[priceMin, priceMax]}
                    tickFormatter={(v) => `${v.toFixed(0)}`}
                    tick={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fill: "var(--text-muted)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={
                      <CustomTooltipContent
                        regimeLabels={regimeLabels}
                        windowTimeline={windowTimeline}
                      />
                    }
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--text-secondary)"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Regime strip */}
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--border-hair)" }}>
              <RegimeStrip
                windowTimeline={windowTimeline}
                regimeLabels={regimeLabels}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

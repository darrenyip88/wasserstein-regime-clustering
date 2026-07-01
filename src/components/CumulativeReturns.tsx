import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PipelineOutput } from "../engine/pipeline";

interface CumulativeReturnsProps {
  output: PipelineOutput;
}

function CustomTooltip({
  active,
  payload,
  label,
  regimeLabels,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: number } }>;
  label?: string;
  regimeLabels: PipelineOutput["regimeLabels"];
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const regLabel = regimeLabels[payload[0].payload.label];
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-soft)",
        borderRadius: 10,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-muted)", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 17,
          fontWeight: 500,
          color: val >= 0 ? "var(--bull)" : "var(--bear)",
          letterSpacing: "-0.02em",
          marginBottom: 6,
        }}
      >
        {val >= 0 ? "+" : ""}{val.toFixed(2)}%
      </div>
      {regLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: regLabel.color }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: regLabel.color }}>
            {regLabel.name}
          </span>
        </div>
      )}
    </div>
  );
}

export function CumulativeReturns({ output }: CumulativeReturnsProps) {
  const { prices, windowTimeline, regimeLabels } = output;

  const cumData = useMemo(() => {
    const step = Math.max(1, Math.floor(prices.length / 400));
    let cum = 0;
    return prices
      .filter((_, i) => i % step === 0)
      .map((p) => {
        cum += p.logReturn;
        const wpt = windowTimeline.find((w) => w.date >= p.date);
        return {
          date: p.date,
          cumReturn: +(cum * 100).toFixed(2),
          label: wpt?.label ?? 0,
        };
      });
  }, [prices, windowTimeline]);

  const regimeStats = useMemo(() => {
    return regimeLabels.map((r) => {
      const regimePrices = prices.filter((_, i) => {
        const wpt = windowTimeline.find((w) => w.date >= prices[i].date);
        return wpt?.label === r.id;
      });
      const totalReturn = regimePrices.reduce((s, p) => s + p.logReturn, 0) * 100;
      const days = regimePrices.length;
      return { r, totalReturn, days };
    });
  }, [prices, windowTimeline, regimeLabels]);

  const finalReturn = cumData[cumData.length - 1]?.cumReturn ?? 0;
  const minReturn = Math.min(...cumData.map((d) => d.cumReturn));
  const maxReturn = Math.max(...cumData.map((d) => d.cumReturn));
  const yPad = (maxReturn - minReturn) * 0.08;

  const tickDates = useMemo(() => {
    const seen = new Set<string>();
    return cumData.filter((d) => {
      const yr = d.date.slice(0, 4);
      if (!seen.has(yr)) { seen.add(yr); return true; }
      return false;
    }).map((d) => d.date);
  }, [cumData]);

  return (
    <div style={{ marginTop: 0, paddingBottom: 0 }}>
      <div
        className="card"
        style={{ padding: "24px 24px 16px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Cumulative log-return</div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                fontWeight: 500,
                color: finalReturn >= 0 ? "var(--bull)" : "var(--bear)",
                letterSpacing: "-0.02em",
              }}
            >
              {finalReturn >= 0 ? "+" : ""}{finalReturn.toFixed(1)}%
            </div>
          </div>

          {/* Per-regime contribution */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {regimeStats.map(({ r, totalReturn, days }) => (
              <div key={r.id} style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: r.color }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: r.color }}>
                    {r.name}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: totalReturn >= 0 ? "var(--bull)" : "var(--bear)", fontWeight: 500 }}>
                  {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(1)}%
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)" }}>
                  {days}d
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                ticks={tickDates}
                tickFormatter={(v) => v.slice(0, 4)}
                tick={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "var(--border-subtle)" }}
                tickLine={false}
              />
              <YAxis
                domain={[minReturn - yPad, maxReturn + yPad]}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 4" />
              <Tooltip
                content={<CustomTooltip regimeLabels={regimeLabels} />}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="cumReturn"
                stroke="var(--accent)"
                strokeWidth={1.6}
                fill="url(#cumGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

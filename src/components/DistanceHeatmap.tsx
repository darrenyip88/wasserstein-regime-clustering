import { useRef, useEffect } from "react";
import type { PipelineOutput } from "../engine/pipeline";

interface DistanceHeatmapProps {
  output: PipelineOutput;
}

export function DistanceHeatmap({ output }: DistanceHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { distMatrixDisplay, regimeLabels } = output;
  const { matrix, n, labels } = distMatrixDisplay;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const containerW = canvas.parentElement?.clientWidth ?? 440;
    const size = Math.min(containerW, 440);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    let maxVal = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && matrix[i][j] > maxVal) maxVal = matrix[i][j];
      }
    }

    const cellSize = size / n;

    // Warm colormap: charcoal → warm stone → terracotta
    function distToColor(t: number): string {
      const p = Math.pow(t, 0.55);
      if (p < 0.42) {
        // near-black → muted warm brown
        const s = p / 0.42;
        const r = Math.round(15 + s * (55 - 15));
        const g = Math.round(14 + s * (44 - 14));
        const b = Math.round(13 + s * (36 - 13));
        return `rgb(${r},${g},${b})`;
      } else if (p < 0.74) {
        // warm stone → amber
        const s = (p - 0.42) / 0.32;
        const r = Math.round(55 + s * (160 - 55));
        const g = Math.round(44 + s * (110 - 44));
        const b = Math.round(36 + s * (55 - 36));
        return `rgb(${r},${g},${b})`;
      } else {
        // amber → terracotta
        const s = (p - 0.74) / 0.26;
        const r = Math.round(160 + s * (212 - 160));
        const g = Math.round(110 + s * (100 - 110));
        const b = Math.round(55 + s * (80 - 55));
        return `rgb(${r},${g},${b})`;
      }
    }

    // Draw cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const raw = i === j ? 0 : matrix[i][j] / (maxVal || 1);
        if (i === j) {
          ctx.fillStyle = "rgba(255,248,235,0.05)";
        } else {
          ctx.fillStyle = distToColor(raw);
        }
        ctx.fillRect(
          j * cellSize,
          i * cellSize,
          Math.ceil(cellSize) + 0.5,
          Math.ceil(cellSize) + 0.5
        );
      }
    }

    // Regime boundary lines
    const changes: number[] = [];
    for (let i = 1; i < labels.length; i++) {
      if (labels[i] !== labels[i - 1]) changes.push(i);
    }

    ctx.strokeStyle = "rgba(255,248,235,0.14)";
    ctx.lineWidth = 0.75;
    changes.forEach((pos) => {
      const px = pos * cellSize;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, px);
      ctx.lineTo(size, px);
      ctx.stroke();
    });

    // Outer border
    ctx.strokeStyle = "rgba(255,248,235,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);
  }, [matrix, n, labels]);

  // Build cluster block annotations
  const clusterBlocks: { name: string; color: string; startPct: number; widthPct: number }[] = [];
  if (labels.length > 0) {
    let start = 0;
    let curLabel = labels[0];
    for (let i = 1; i < labels.length; i++) {
      if (labels[i] !== curLabel) {
        const rl = regimeLabels[curLabel];
        if (rl) {
          clusterBlocks.push({
            name: rl.name,
            color: rl.color,
            startPct: (start / labels.length) * 100,
            widthPct: ((i - start) / labels.length) * 100,
          });
        }
        curLabel = labels[i];
        start = i;
      }
    }
    const rlLast = regimeLabels[curLabel];
    if (rlLast) {
      clusterBlocks.push({
        name: rlLast.name,
        color: rlLast.color,
        startPct: (start / labels.length) * 100,
        widthPct: ((labels.length - start) / labels.length) * 100,
      });
    }
  }

  return (
    <section id="transport" style={{ paddingTop: 96, paddingBottom: 64 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          04 — Optimal Transport Structure
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "end",
          }}
        >
          <h2 className="display-lg">
            Pairwise Wasserstein distances
          </h2>
          <p className="prose" style={{ margin: 0 }}>
            Each cell encodes W₁(Pᵢ, Pⱼ) — the exact Wasserstein distance between two rolling windows.
            Dark blocks indicate distributional similarity; bright regions signal regime transitions.
            Windows are ordered by calendar time.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Canvas */}
        <div>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid var(--border-subtle)",
              overflow: "hidden",
              background: "var(--bg-base)",
            }}
          >
            {/* Top axis strip */}
            <div
              style={{
                height: 8,
                display: "flex",
                borderBottom: "1px solid var(--border-hair)",
              }}
            >
              {clusterBlocks.map((b, i) => (
                <div
                  key={i}
                  style={{
                    width: `${b.widthPct}%`,
                    background: b.color,
                    opacity: 0.55,
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex" }}>
              {/* Left axis strip */}
              <div
                style={{
                  width: 8,
                  display: "flex",
                  flexDirection: "column",
                  borderRight: "1px solid var(--border-hair)",
                  flexShrink: 0,
                }}
              >
                {clusterBlocks.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      height: `${b.widthPct}%`,
                      background: b.color,
                      opacity: 0.55,
                    }}
                  />
                ))}
              </div>
              {/* Canvas */}
              <div className="canvas-wrap" style={{ borderRadius: 0, flex: 1 }}>
                <canvas ref={canvasRef} style={{ display: "block" }} />
              </div>
            </div>
          </div>

          {/* Color scale legend */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10.5,
                fontWeight: 500,
                color: "var(--text-muted)",
              }}
            >
              Low W₁
            </span>
            <div
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background:
                  "linear-gradient(to right, rgb(15,14,13), rgb(55,44,36), rgb(160,110,55), rgb(212,100,80))",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10.5,
                fontWeight: 500,
                color: "var(--text-muted)",
              }}
            >
              High W₁
            </span>
          </div>
        </div>

        {/* Right: insight cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            {
              label: "Reading the heatmap",
              text: "Dark diagonal blocks = windows that cluster together, sharing similar return distributions. Bright off-diagonal regions = regime transitions where distributions diverge.",
            },
            {
              label: "What's exact",
              text: "W₁(P,Q) = ∫₀¹ |F⁻¹_P(t) − F⁻¹_Q(t)| dt is computed exactly in O(n log n) by sorting empirical samples. No approximation, no entropic regularization.",
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

          <div
            style={{
              padding: "18px 20px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Cluster structure
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {regimeLabels.map((r) => {
                const cs = output.clusterResult.clusterStats[r.id];
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: r.color,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {r.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      {cs?.count ?? 0} windows
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

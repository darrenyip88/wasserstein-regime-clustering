const STEPS = [
  {
    index: "01",
    title: "Log-returns",
    formula: "rₜ = log(Pₜ / Pₜ₋₁)",
    body: "Daily log-returns are approximately additive over time and symmetric around zero. They form the raw material for each rolling window and are well-behaved for distributional analysis.",
    color: "var(--accent)",
  },
  {
    index: "02",
    title: "Rolling windows",
    formula: "Wₙ = {rₙ₋ₖ₊₁, …, rₙ}",
    body: "Each window of length k=63 days becomes an empirical distribution. Windows slide with stride s=5 (weekly), giving dense temporal coverage without recomputing from scratch.",
    color: "var(--calm)",
  },
  {
    index: "03",
    title: "1-D Wasserstein",
    formula: "W₁(P,Q) = ∫₀¹ |F⁻¹_P(t) − F⁻¹_Q(t)| dt",
    body: "In 1-D, the Wasserstein distance equals the L¹ norm of the difference of quantile functions. This is computed exactly in O(n log n) by sorting empirical samples. No entropic regularization needed.",
    color: "var(--bull)",
  },
  {
    index: "04",
    title: "k-means objective",
    formula: "min_B Σᵢ W₂²(Pᵢ, B_{σ(i)})",
    body: "Wasserstein k-means replaces Euclidean centroids with Wasserstein barycenters. Assignment: nearest barycenter in W₂. Update: average quantile functions to form the new barycenter.",
    color: "var(--bear)",
  },
  {
    index: "05",
    title: "1-D barycenter",
    formula: "F⁻¹_B(t) = (1/|C|) Σₖ F⁻¹_{Pₖ}(t)",
    body: "The 1-D Wasserstein barycenter has a closed-form solution: pointwise average of quantile functions. This is the Fréchet mean in Wasserstein space — exact, not approximate.",
    color: "var(--crisis)",
  },
];

export function MathFoundation() {
  return (
    <section id="math" style={{ paddingTop: 96, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Mathematical Foundation
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "end",
          }}
        >
          <h2 className="display-lg">From prices to regimes</h2>
          <p className="prose" style={{ margin: 0 }}>
            Five exact mathematical steps connect raw price data to Wasserstein-geometry regime clusters.
            In 1-D, every step has a closed-form solution — no approximations, no numerical solvers.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.index}
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr 1fr",
              gap: 32,
              alignItems: "center",
              padding: "28px 0",
              borderBottom:
                i < STEPS.length - 1 ? "1px solid var(--border-hair)" : "none",
            }}
          >
            {/* Step number */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 36,
                fontWeight: 500,
                color: "var(--text-faint)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {s.index}
            </div>

            {/* Title + formula */}
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: s.color,
                  marginBottom: 10,
                  letterSpacing: "0",
                }}
              >
                {s.title}
              </div>
              <div
                className="formula"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderLeft: `2px solid ${s.color}`,
                  borderRadius: "0 8px 8px 0",
                  padding: "10px 16px",
                }}
              >
                {s.formula}
              </div>
            </div>

            {/* Body */}
            <p className="prose-sm" style={{ margin: 0 }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>

      {/* Exactness note */}
      <div
        style={{
          marginTop: 40,
          padding: "20px 24px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
        }}
      >
        {[
          {
            label: "Exact",
            desc: "W₁ distance via sorted quantile functions. Barycenter via pointwise quantile average.",
            color: "var(--bull)",
          },
          {
            label: "Practical",
            desc: "Lloyd's algorithm for k-means convergence. k-means++ initialization. Multiple restarts.",
            color: "var(--calm)",
          },
          {
            label: "Approximate",
            desc: "MDS 2-D embedding preserves approximate distances. 1-D W₂ used in k-means objective (matches W₁ exactly for empirical distributions of equal size).",
            color: "var(--accent)",
          },
        ].map((item) => (
          <div key={item.label}>
            <div
              className="pill"
              style={{
                background: `${item.color}10`,
                border: `1px solid ${item.color}22`,
                color: item.color,
                marginBottom: 12,
              }}
            >
              {item.label}
            </div>
            <p className="prose-sm" style={{ margin: 0 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

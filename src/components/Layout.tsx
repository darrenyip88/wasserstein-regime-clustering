import React, { useEffect, useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: "Regimes",       href: "#regimes" },
  { label: "Distributions", href: "#distributions" },
  { label: "Transport",     href: "#transport" },
  { label: "Transitions",   href: "#transitions" },
  { label: "Method",        href: "#math" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
        background: scrolled
          ? "rgba(15,15,14,0.94)"
          : "rgba(15,15,14,0.60)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        transition: "border-color 0.3s, background 0.3s",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 clamp(20px, 4vw, 48px)",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Logo */}
        <a
          href="#hero"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 10 L4.5 6 L7 9 L9.5 3.5 L12 6.5"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0",
            }}
          >
            Wasserstein<span style={{ color: "var(--accent)" }}>.</span>Markets
          </span>
        </a>

        {/* Desktop nav */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
          className="desktop-nav"
        >
          {NAV_ITEMS.map((item) => (
            <a key={item.label} href={item.href} className="nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right badge + mobile menu */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div
            className="pill"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              color: "var(--accent)",
            }}
          >
            Research Demo
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: "var(--text-muted)",
            }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              {menuOpen ? (
                <path d="M3 3L15 15M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div
          style={{
            padding: "12px 24px 20px",
            background: "rgba(15,15,14,0.98)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="nav-link"
              onClick={() => setMenuOpen(false)}
              style={{ display: "block", padding: "10px 0", borderRadius: 0 }}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-subtle)",
        marginTop: 120,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "56px clamp(20px, 4vw, 48px) 44px",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 40,
            marginBottom: 48,
          }}
        >
          {[
            {
              label: "Methodology",
              text: "1-D Wasserstein distances computed exactly via sorted quantile functions. Barycenters are exact 1-D Fréchet means. Rolling windows: 63-day (≈1 quarter), stride 5 (weekly).",
            },
            {
              label: "Data",
              text: "Synthetic SPY-like price series with Markov regime switching and realistic fat-tail structure. ~1,260 trading days across 4 canonical regimes. Illustrative, not real market data.",
            },
            {
              label: "Stack",
              text: "React 19 · TypeScript · Recharts · Pure-TypeScript optimal transport engine. No external OT libraries — Wasserstein distance implemented from first principles.",
            },
          ].map((col) => (
            <div key={col.label}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                {col.label}
              </div>
              <p className="prose-sm" style={{ margin: 0 }}>
                {col.text}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid var(--border-hair)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-faint)",
              letterSpacing: "0.02em",
            }}
          >
            Market Regime Clustering · Wasserstein k-Means on Full Return Distributions
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              color: "var(--text-faint)",
              letterSpacing: "0.02em",
            }}
          >
            Quant Research Portfolio Project
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <Nav />
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 clamp(20px, 4vw, 48px)",
        }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

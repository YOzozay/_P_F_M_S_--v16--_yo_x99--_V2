import React from 'react';

export function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--bg-kpi)", border: "1px solid var(--border-kpi)", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-muted)" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: accent || "var(--c-heading)", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: "var(--c-subtle)" }}>{sub}</span>}
    </div>
  );
}
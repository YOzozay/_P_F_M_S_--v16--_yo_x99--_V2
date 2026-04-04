import React from 'react';
import { uiTokens } from '../../styles/tokens';

export function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--bg-kpi)", border: "1px solid var(--border-kpi)", borderRadius: uiTokens.radius.xl, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: uiTokens.fontSize.xs, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-muted)" }}>{label}</span>
      <span style={{ fontSize: uiTokens.fontSize.h3, fontWeight: 700, color: accent || "var(--c-heading)", fontFamily: uiTokens.fontFamilyMono, letterSpacing: "-0.02em" }}>{value}</span>
      {sub && <span style={{ fontSize: uiTokens.fontSize.xs, color: "var(--c-subtle)" }}>{sub}</span>}
    </div>
  );
}
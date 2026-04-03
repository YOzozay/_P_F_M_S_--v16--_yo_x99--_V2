import React from 'react';

export function ProgressBar({ pct, color }) {
  const c = color || (pct > 80 ? "#f43f5e" : pct > 50 ? "#f59e0b" : "#10b981");
  return (
    <div style={{ background: "var(--border-card)", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, height: "100%", background: c, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}
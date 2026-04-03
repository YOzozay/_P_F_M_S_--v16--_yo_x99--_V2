import React from 'react';

export function Badge({ text, color }) {
  const c = color || "#10b981";
  return (
    <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}44`, borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}
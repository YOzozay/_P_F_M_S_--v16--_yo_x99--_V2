import React from 'react';

export function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
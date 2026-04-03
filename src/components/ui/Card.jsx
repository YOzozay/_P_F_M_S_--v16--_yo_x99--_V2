import React from 'react';

export function Card({ children, style }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: 16, ...style }}>
      {children}
    </div>
  );
}
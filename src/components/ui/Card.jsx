import React from 'react';
import { uiTokens } from '../../styles/tokens';

export function Card({ children, style }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: uiTokens.radius.xl, ...style }}>
      {children}
    </div>
  );
}
import React from 'react';
import { uiTokens } from '../../styles/tokens';

export function FormField({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: uiTokens.fontSize.xs, color: "var(--c-muted)", marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "var(--color-expense)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}
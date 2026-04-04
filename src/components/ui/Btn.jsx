import React from 'react';
import { uiTokens } from '../../styles/tokens';

export function Btn({ children, onClick, color = "var(--color-income)", disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: `${color}22`, border: `1px solid ${color}44`, borderRadius: small ? uiTokens.radius.sm : uiTokens.radius.md,
      padding: small ? `${uiTokens.spacing.xs} ${uiTokens.spacing.md}` : `${uiTokens.spacing.sm} 0`, color, fontSize: small ? uiTokens.fontSize.sm : uiTokens.fontSize.md, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: uiTokens.fontFamilyBase,
      width: small ? "auto" : "100%",
    }}>
      {children}
    </button>
  );
}

export function XBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: "var(--c-dim)", cursor: "pointer", fontSize: uiTokens.fontSize.lg, padding: "0 0 0 4px", lineHeight: 1, flexShrink: 0 }}>
      ✕
    </button>
  );
}
import React from 'react';

export function Btn({ children, onClick, color = "#10b981", disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: `${color}22`, border: `1px solid ${color}44`, borderRadius: small ? 7 : 10,
      padding: small ? "4px 12px" : "9px 0", color, fontSize: small ? 11 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit",
      width: small ? "auto" : "100%",
    }}>
      {children}
    </button>
  );
}

export function XBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: "var(--c-dim)", cursor: "pointer", fontSize: 14, padding: "0 0 0 4px", lineHeight: 1, flexShrink: 0 }}>
      ✕
    </button>
  );
}
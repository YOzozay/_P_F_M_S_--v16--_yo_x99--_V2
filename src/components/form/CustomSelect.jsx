import React, { useState, useEffect, useRef } from 'react';
import { uiTokens } from '../../styles/tokens';

export function CustomSelect({ value, onChange, options, placeholder = "เลือก..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : null;
  
  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: uiTokens.radius.md, padding: `${uiTokens.spacing.sm} ${uiTokens.spacing.md}`, color: label ? "var(--c-text)" : "var(--c-subtle)", fontSize: uiTokens.fontSize.md, cursor: "pointer", fontFamily: uiTokens.fontFamilyBase, fontWeight: label ? 500 : 400, textAlign: "left" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label || placeholder}</span>
        <span style={{ fontSize: 10, color: "var(--c-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "var(--bg-picker)", border: "1px solid var(--border-input)", borderRadius: 12, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.3)", maxHeight: 240, overflowY: "auto" }}>
          {options.map((opt, i) => {
            const val = opt.value ?? opt; const lbl = opt.label ?? opt; const active = val === value;
            return <button key={i} onClick={() => { onChange(val); setOpen(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", border: "none", background: active ? "rgba(16,185,129,0.15)" : "transparent", color: active ? "var(--color-income)" : "var(--c-text)", fontSize: uiTokens.fontSize.md, fontWeight: active ? 600 : 400, fontFamily: uiTokens.fontFamilyBase, cursor: "pointer", textAlign: "left", borderBottom: i < options.length - 1 ? "1px solid var(--border-subtle)" : "none" }} onMouseEnter={e => { if (!active) e.target.style.background = "var(--bg-kpi)"; }} onMouseLeave={e => { if (!active) e.target.style.background = "transparent"; }}>{lbl}</button>;
          })}
        </div>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { MONTHS } from "../../utils/dateUtils";

export function MonthPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.split("-")[0]));
  const activeMonth = Number(value.split("-")[1]) - 1;
  const select = (mi) => { onChange(`${year}-${String(mi + 1).padStart(2, "0")}`); setOpen(false); };
  
  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 10, padding: "8px 14px", color: "var(--c-text)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, minWidth: 150, justifyContent: "space-between" }}>
        <span>{MONTHS[activeMonth]} {year}</span>
        <span style={{ fontSize: 10, color: "var(--c-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100, background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 14, padding: "16px", minWidth: 220, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button onClick={() => setYear(y => y - 1)} style={{ background: "var(--border-card)", border: "none", borderRadius: 7, width: 28, height: 28, color: "var(--c-secondary)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-heading)", fontFamily: "'DM Mono', monospace" }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)} style={{ background: "var(--border-card)", border: "none", borderRadius: 7, width: 28, height: 28, color: "var(--c-secondary)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {MONTHS.map((m, i) => {
              const isCurrent = year === Number(value.split("-")[0]) && i === activeMonth;
              return <button key={m} onClick={() => select(i)} style={{ padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: isCurrent ? 700 : 400, fontFamily: "inherit", background: isCurrent ? "#10b981" : "var(--border-subtle)", color: isCurrent ? "#fff" : "var(--c-secondary)", transition: "all 0.1s" }}>{m}</button>;
            })}
          </div>
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button onClick={() => { const n = new Date(); setYear(n.getFullYear()); select(n.getMonth()); }} style={{ background: "none", border: "none", color: "#10b981", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>เดือนนี้</button>
          </div>
        </div>
      )}
    </div>
  );
}
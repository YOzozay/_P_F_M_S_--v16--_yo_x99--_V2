import React, { useState } from "react";
import { MONTHS } from "../../utils/dateUtils";

const DAY_LABELS = ["อา","จ","อ","พ","พฤ","ศ","ส"];

export function DatePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("day");
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : new Date().getMonth());
  const [yearPage, setYearPage] = useState(Math.floor((parsed ? parsed.getFullYear() : new Date().getFullYear()) / 12) * 12);
  
  const display = parsed ? `${String(parsed.getDate()).padStart(2,"0")}/${String(parsed.getMonth()+1).padStart(2,"0")}/${parsed.getFullYear()}` : placeholder || "เลือกวันที่";
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: daysInPrev - firstDay + 1 + i, cur: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, cur: true });
  const rem = 42 - cells.length;
  for (let i = 1; i <= rem; i++) cells.push({ day: i, cur: false });
  
  const select = (day) => { onChange(`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`); setOpen(false); setMode("day"); };
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1); } else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1); } else setViewMonth(m=>m+1); };
  const isSelected = (day) => parsed && parsed.getFullYear()===viewYear && parsed.getMonth()===viewMonth && parsed.getDate()===day;
  const isToday = (day) => { const t=new Date(); return t.getFullYear()===viewYear && t.getMonth()===viewMonth && t.getDate()===day; };
  
  const iconBtn = { background: "var(--border-card)", border: "none", borderRadius: 7, width: 28, height: 28, color: "var(--c-secondary)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" };
  const yearList = Array.from({ length: 12 }, (_, i) => yearPage + i);
  
  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <button onClick={() => { setOpen(o=>!o); setMode("day"); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 10, padding: "9px 12px", color: value ? "var(--c-text)" : "var(--c-subtle)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: value ? 500 : 400 }}>
        <span>{display}</span>
        <span style={{ fontSize: 12, color: "var(--c-muted)" }}>📅</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200, background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 14, padding: "14px", width: 260, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
          {mode === "year" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button onClick={() => setYearPage(y => y - 12)} style={iconBtn}>‹</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-heading)" }}>{yearPage}–{yearPage+11}</span>
                <button onClick={() => setYearPage(y => y + 12)} style={iconBtn}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {yearList.map(y => <button key={y} onClick={() => { setViewYear(y); setMode("day"); }} style={{ padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: y === viewYear ? 700 : 400, fontFamily: "inherit", background: y === viewYear ? "#10b981" : "var(--border-subtle)", color: y === viewYear ? "#fff" : "var(--c-secondary)", transition: "all 0.1s" }}>{y}</button>)}
              </div>
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <button onClick={() => setMode("day")} style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 11, cursor: "pointer" }}>← กลับ</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button onClick={prevMonth} style={iconBtn}>‹</button>
                <button onClick={() => { setYearPage(Math.floor(viewYear/12)*12); setMode("year"); }} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "var(--c-heading)", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px", borderRadius: 6 }}>
                  {MONTHS[viewMonth]} {viewYear} ▾
                </button>
                <button onClick={nextMonth} style={iconBtn}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
                {DAY_LABELS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--c-subtle)", fontWeight: 600, padding: "3px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map((cell, i) => {
                  const sel = cell.cur && isSelected(cell.day);
                  const tod = cell.cur && isToday(cell.day);
                  return <button key={i} onClick={() => cell.cur && select(cell.day)} style={{ padding: "6px 0", borderRadius: 7, border: sel ? "none" : tod ? "1px solid rgba(16,185,129,0.4)" : "none", background: sel ? "#10b981" : "transparent", color: sel ? "#fff" : cell.cur ? (tod ? "#10b981" : "var(--c-text)") : "var(--c-dimmer)", fontSize: 12, fontWeight: sel || tod ? 700 : 400, cursor: cell.cur ? "pointer" : "default", fontFamily: "inherit" }}>{cell.day}</button>;
                })}
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => { onChange(""); setOpen(false); }} style={{ background: "none", border: "none", color: "var(--c-muted)", fontSize: 11, cursor: "pointer" }}>ล้าง</button>
                <button onClick={() => { const t=new Date(); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); select(t.getDate()); }} style={{ background: "none", border: "none", color: "#10b981", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>วันนี้</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
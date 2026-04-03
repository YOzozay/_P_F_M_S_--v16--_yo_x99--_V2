
import React, { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ─────────────────────────────────────────
   GS API
───────────────────────────────────────── */
const GS_URL = "https://script.google.com/macros/s/AKfycbwq2q-_Zv-TaFtz0AUOBNIbMZmW8dLhFjqo0IYubYk26YhiV3xaJC7nuwdjJ8kAZBeJ/exec";

const apiGet = (params) => {
  const qs = new URLSearchParams(params).toString();
  return fetch(`${GS_URL}?${qs}`).then(r => r.json());
};
const apiPost = (body) =>
  fetch(GS_URL, { method: "POST", body: JSON.stringify(body) }).then(r => r.json());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

/* ─────────────────────────────────────────
   UTILS
───────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtShort = (n) => {
  n = Number(n) || 0;
  if (n >= 1000000) return `฿${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `฿${(n / 1000).toFixed(0)}K`;
  return `฿${n}`;
};
const getPayMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const getToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: 10, padding: "9px 12px", color: "var(--c-text)", fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
const MON = { "01":"ม.ค.","02":"ก.พ.","03":"มี.ค.","04":"เม.ย.","05":"พ.ค.","06":"มิ.ย.","07":"ก.ค.","08":"ส.ค.","09":"ก.ย.","10":"ต.ค.","11":"พ.ย.","12":"ธ.ค." };
const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

/* ─────────────────────────────────────────
   NAV
───────────────────────────────────────── */
const NAV_ITEMS = [
  { key: "dashboard",    label: "Dashboard",      icon: "⬡" },
  { key: "year",         label: "Year Overview",  icon: "◱" },
  { key: "expenses",     label: "Expenses",       icon: "◈" },
  { key: "fixed",        label: "Fixed Expenses", icon: "◧" },
  { key: "loans",        label: "งวดรถ & บ้าน",  icon: "◑" },
  { key: "debt",         label: "Debt",           icon: "◉" },
  { key: "credit",       label: "Credit Cards",   icon: "▣" },
  { key: "installments", label: "Installments",   icon: "◫" },
  { key: "payments",     label: "Payment Center", icon: "◆" },
  { key: "worklog",      label: "Worklog",        icon: "◎" },
  { key: "settings",     label: "Settings",       icon: "⚙" },
];

/* ─────────────────────────────────────────
   SHARED UI
───────────────────────────────────────── */
function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--bg-kpi)", border: "1px solid var(--border-kpi)", borderRadius: 16, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-muted)" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: accent || "var(--c-heading)", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: "var(--c-subtle)" }}>{sub}</span>}
    </div>
  );
}
function ProgressBar({ pct, color }) {
  const c = color || (pct > 80 ? "#f43f5e" : pct > 50 ? "#f59e0b" : "#10b981");
  return (
    <div style={{ background: "var(--border-card)", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, height: "100%", background: c, borderRadius: 99, transition: "width 0.5s ease" }} />
    </div>
  );
}
function Badge({ text, color }) {
  const c = color || "#10b981";
  return <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}44`, borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "2px 8px", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</span>;
}
function Section({ title, children, action }) {
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
function Card({ children, style }) {
  return <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderRadius: 16, ...style }}>{children}</div>;
}
function Btn({ children, onClick, color = "#10b981", disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: `${color}22`, border: `1px solid ${color}44`, borderRadius: small ? 7 : 10,
      padding: small ? "4px 12px" : "9px 0", color, fontSize: small ? 11 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit",
      width: small ? "auto" : "100%",
    }}>{children}</button>
  );
}
function FormField({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#f43f5e" }}> *</span>}
      </label>
      {children}
    </div>
  );
}
function FInput({ label, type = "text", value, onChange, placeholder, required }) {
  return (
    <FormField label={label} required={required}>
      {type === "date"
        ? <DatePicker value={value} onChange={onChange} placeholder={placeholder} />
        : <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={inputStyle} />
      }
    </FormField>
  );
}
function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", gap: 14 }}>
      <div className="spin-loader" />
      <span style={{ color: "var(--c-subtle)", fontSize: 12, letterSpacing: "0.06em" }}>กำลังโหลด...</span>
    </div>
  );
}
function ErrMsg({ msg }) {
  return <div style={{ padding: "12px 16px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, color: "#f87171", fontSize: 12, marginBottom: 16 }}>{msg}</div>;
}
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-tooltip)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--c-secondary)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontFamily: "'DM Mono', monospace" }}>{p.name}: {fmtShort(p.value)}</div>)}
    </div>
  );
};
const XBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: "none", border: "none", color: "var(--c-dim)", cursor: "pointer", fontSize: 14, padding: "0 0 0 4px", lineHeight: 1, flexShrink: 0 }}>✕</button>
);

/* ─────────────────────────────────────────
   MONTH PICKER
───────────────────────────────────────── */
function MonthPicker({ value, onChange }) {
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

/* ─────────────────────────────────────────
   DATE PICKER (with year picker)
───────────────────────────────────────── */
const DAY_LABELS = ["อา","จ","อ","พ","พฤ","ศ","ส"];
function DatePicker({ value, onChange, placeholder }) {
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

/* ─────────────────────────────────────────
   CUSTOM SELECT
───────────────────────────────────────── */
function CustomSelect({ value, onChange, options, placeholder = "เลือก..." }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : null;
  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 10, padding: "9px 12px", color: label ? "var(--c-text)" : "var(--c-subtle)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: label ? 500 : 400, textAlign: "left" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label || placeholder}</span>
        <span style={{ fontSize: 10, color: "var(--c-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "var(--bg-picker)", border: "1px solid var(--border-input)", borderRadius: 12, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.3)", maxHeight: 240, overflowY: "auto" }}>
          {options.map((opt, i) => {
            const val = opt.value ?? opt; const lbl = opt.label ?? opt; const active = val === value;
            return <button key={i} onClick={() => { onChange(val); setOpen(false); }} style={{ display: "block", width: "100%", padding: "10px 14px", border: "none", background: active ? "rgba(16,185,129,0.15)" : "transparent", color: active ? "#10b981" : "var(--c-text)", fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: "inherit", cursor: "pointer", textAlign: "left", borderBottom: i < options.length - 1 ? "1px solid var(--border-subtle)" : "none" }} onMouseEnter={e => { if (!active) e.target.style.background = "var(--bg-kpi)"; }} onMouseLeave={e => { if (!active) e.target.style.background = "transparent"; }}>{lbl}</button>;
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAY MODAL (shared)
───────────────────────────────────────── */
function PayModal({ loan, onClose, onConfirm, loading, err }) {
  const [amt, setAmt] = useState(String(loan.monthly_due));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 18, padding: "24px 24px 20px", width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)", marginBottom: 4 }}>💳 ชำระงวด</div>
          <div style={{ fontSize: 13, color: "var(--c-secondary)" }}>{loan.name}</div>
          <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>ค่างวด {fmt(loan.monthly_due)} · คงเหลือ {fmt(loan.remaining_amount)}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>จำนวนที่ต้องการจ่าย (฿)</label>
          <input type="number" value={amt} onChange={e => setAmt(e.target.value)} style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }} autoFocus onKeyDown={e => { if (e.key === "Enter") onConfirm(Number(amt)); if (e.key === "Escape") onClose(); }} />
        </div>
        {err && <ErrMsg msg={err} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn onClick={onClose} color="var(--c-muted)">ยกเลิก</Btn>
          <Btn onClick={() => onConfirm(Number(amt))} color="#10b981" disabled={loading}>{loading ? "กำลังชำระ..." : "ยืนยันชำระ"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   LOAN UTILS — คำนวณงวดจาก total_amount/monthly_due
   ✅ ไม่พึ่ง start_date (แม่นยำกว่า)
───────────────────────────────────────── */
const calcLoanInstallment = (loan) => {
  const totalAmt = Number(loan.total_amount) || 0;
  const monthly  = Number(loan.monthly_due)  || 0;
  const remMonths = Number(loan.remaining_months) || 0;
  if (!totalAmt || !monthly) return null;
  const total = Math.round(totalAmt / monthly);      // e.g. 1,026,480 / 12,220 = 84
  const paid  = Math.max(0, total - remMonths);      // 84 - 57 = 27
  return { paid, total };
};

/* ─────────────────────────────────────────
   PAGE: LOAN
───────────────────────────────────────── */
function LoanPage() {
  const [carLoans, setCarLoans]   = useState([]);
  const [homeLoans, setHomeLoans] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState(null);
  const [tab, setTab]             = useState("car");
  const [payModal, setPayModal]   = useState(null); // { loan, loanType }
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr]       = useState(null);
  const [backfilling, setBackfilling] = useState(false);

  const emptyForm = { name: "", lender: "", total_amount: "", monthly_due: "", due_day: "20", remaining_months: "", start_date: "", end_date: "" };
  const [carForm, setCarForm]   = useState(emptyForm);
  const [homeForm, setHomeForm] = useState(emptyForm);
  const fc = (k, v) => setCarForm(p => ({ ...p, [k]: v }));
  const fh = (k, v) => setHomeForm(p => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiGet({ action: "getCarLoans" }), apiGet({ action: "getHomeLoans" })])
      .then(([car, home]) => { setCarLoans(Array.isArray(car) ? car : []); setHomeLoans(Array.isArray(home) ? home : []); })
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // คำนวณเดือนที่ผ่านไปตั้งแต่ start_date
  const calcBackfill = (startDateStr) => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr + "T00:00:00");
    const now = new Date();
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  };

  const handleAdd = async (loanType) => {
    const form = loanType === "car_loan" ? carForm : homeForm;
    if (!form.name || !form.total_amount || !form.monthly_due) return;
    setErr(null);
    // Clear form immediately
    if (loanType === "car_loan") setCarForm(emptyForm);
    else setHomeForm(emptyForm);
    try {
      await apiPost({ action: "addLoan", loan_type: loanType, ...form });
      const backfill = calcBackfill(form.start_date);
      if (backfill > 0) {
        setBackfilling(true);
        // Get new loan id
        const loans = await apiGet({ action: loanType === "car_loan" ? "getCarLoans" : "getHomeLoans" });
        const newLoan = Array.isArray(loans) ? loans.find(l => l.name === form.name) : null;
        if (newLoan) {
          const maxPay = Math.min(backfill, Math.round(Number(form.total_amount) / Number(form.monthly_due)));
          for (let i = 0; i < maxPay; i++) {
            const res = await apiPost({ action: "payLoan", loan_type: loanType, loan_id: newLoan.id, amount: Number(form.monthly_due) });
            if (res.error) break;
            await delay(400); // หน่วงเวลาไม่ให้ GAS rate limit
          }
        }
        setBackfilling(false);
      }
      load();
    } catch { setErr("บันทึกไม่สำเร็จ"); setBackfilling(false); }
  };

  const confirmPay = async (amount) => {
    if (!payModal) return;
    const { loan, loanType } = payModal;
    if (!amount || amount <= 0) { setPayErr("จำนวนไม่ถูกต้อง"); return; }
    setPayLoading(true); setPayErr(null);
    try {
      const res = await apiPost({ action: "payLoan", loan_type: loanType, loan_id: loan.id, amount });
      if (res.error) { setPayErr(res.error); return; }
      setPayModal(null);
      load();
    } catch { setPayErr("ชำระไม่สำเร็จ"); }
    finally { setPayLoading(false); }
  };

  const handleDelete = async (id, loanType) => {
    if (!confirm("ลบรายการนี้?")) return;
    try { await apiPost({ action: "deleteLoan", loan_type: loanType, id }); load(); }
    catch { setErr("ลบไม่สำเร็จ"); }
  };

  const LoanCard = ({ loan, loanType, color }) => {
    const totalAmt  = Number(loan.total_amount) || 0;
    const remaining = Number(loan.remaining_amount) || 0;
    const paid      = totalAmt - remaining;
    const pct       = totalAmt > 0 ? (paid / totalAmt) * 100 : 0;
    const closed    = loan.status === "closed";
    const inst      = calcLoanInstallment(loan); // ✅ ใช้สูตรใหม่

    return (
      <Card style={{ padding: "20px 22px", opacity: closed ? 0.6 : 1, borderColor: closed ? "rgba(16,185,129,0.3)" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>{loan.name}</span>
              {closed && <Badge text="ชำระครบ" color="#10b981" />}
              {!closed && inst && <Badge text={`งวด ${inst.paid}/${inst.total}`} color={color} />}
            </div>
            <div style={{ fontSize: 11, color: "var(--c-subtle)" }}>{loan.lender}</div>
            <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
              Due วันที่ {loan.due_day} · งวดละ {fmt(loan.monthly_due)}
              {!closed && Number(loan.remaining_months) > 0 && (
                <span style={{ color, marginLeft: 8, fontWeight: 600 }}>· เหลืออีก {loan.remaining_months} งวด</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontSize: 10, color: "var(--c-muted)", marginBottom: 3 }}>ยอดคงเหลือ</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 18, color: closed ? "var(--c-subtle)" : "#f87171" }}>{fmt(remaining)}</div>
          </div>
        </div>
        <ProgressBar pct={pct} color={closed ? "#10b981" : pct > 70 ? "#10b981" : pct > 40 ? "#f59e0b" : color} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11 }}>
          <span style={{ color: "var(--c-subtle)" }}>ชำระแล้ว {pct.toFixed(1)}% · {fmt(paid)}</span>
          <span style={{ color: "var(--c-muted)" }}>รวม {fmt(totalAmt)}</span>
        </div>
        {(loan.start_date || loan.end_date) && (
          <div style={{ marginTop: 8, fontSize: 10, color: "var(--c-subtle)", display: "flex", gap: 12 }}>
            {loan.start_date && <span>เริ่ม {loan.start_date}</span>}
            {loan.end_date && <span>สิ้นสุด {loan.end_date}</span>}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <Btn onClick={() => handleDelete(loan.id, loanType)} color="#f43f5e" small>ลบ</Btn>
          {!closed && <Btn onClick={() => { setPayErr(null); setPayModal({ loan, loanType }); }} color={color} small>💳 ชำระ {fmt(loan.monthly_due)}</Btn>}
        </div>
      </Card>
    );
  };

  const AddForm = ({ loanType, form, setField }) => {
    const backfill = calcBackfill(form.start_date);
    return (
      <Card style={{ padding: "20px 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FInput label="ชื่อ *" value={form.name} onChange={v => setField("name", v)} placeholder="ชื่อสัญญา" />
          <FInput label="สถาบันการเงิน" value={form.lender} onChange={v => setField("lender", v)} placeholder="ชื่อสถาบัน" />
          <FInput label="ยอดกู้รวม (฿) *" type="number" value={form.total_amount} onChange={v => setField("total_amount", v)} placeholder="เช่น 1026480" />
          <FInput label="ค่างวด / เดือน (฿) *" type="number" value={form.monthly_due} onChange={v => setField("monthly_due", v)} placeholder="เช่น 12220" />
          <FInput label="Due Day" type="number" value={form.due_day} onChange={v => setField("due_day", v)} placeholder="20" />
          <FInput label="งวดที่เหลือตอนนี้" type="number" value={form.remaining_months} onChange={v => setField("remaining_months", v)} placeholder="เช่น 57" />
          <FInput label="วันเริ่มสัญญา" type="date" value={form.start_date} onChange={v => setField("start_date", v)} />
          <FInput label="วันสิ้นสุดสัญญา" type="date" value={form.end_date} onChange={v => setField("end_date", v)} />
        </div>
        {backfill > 0 && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, fontSize: 12, color: "#f59e0b" }}>
            ⚡ พบวันเริ่มย้อนหลัง {backfill} เดือน — ระบบจะบันทึกการชำระย้อนหลังให้อัตโนมัติ (อาจใช้เวลาสักครู่)
          </div>
        )}
        {backfilling && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, fontSize: 12, color: "#10b981" }}>
            ⏳ กำลังบันทึกประวัติการชำระ กรุณารอสักครู่...
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Btn onClick={() => handleAdd(loanType)} color={loanType === "car_loan" ? "#3b82f6" : "#a78bfa"} disabled={backfilling}>
            {backfilling ? "กำลังบันทึก..." : `+ เพิ่ม${loanType === "car_loan" ? "งวดรถ" : "งวดบ้าน"}`}
          </Btn>
        </div>
      </Card>
    );
  };

  const carActive  = carLoans.filter(l => l.status !== "closed");
  const homeActive = homeLoans.filter(l => l.status !== "closed");
  const totalCar  = carActive.reduce((s, l) => s + (Number(l.remaining_amount) || 0), 0);
  const totalHome = homeActive.reduce((s, l) => s + (Number(l.remaining_amount) || 0), 0);

  return (
    <div>
      {err && <ErrMsg msg={err} />}
      {payModal && (
        <PayModal loan={payModal.loan} onClose={() => setPayModal(null)} onConfirm={confirmPay} loading={payLoading} err={payErr} />
      )}
      <Section title="ภาพรวม">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <KpiCard label="ยอดงวดรถคงเหลือ"  value={fmt(totalCar)}  accent="#3b82f6" sub={`${carActive.length} สัญญา`} />
          <KpiCard label="ยอดงวดบ้านคงเหลือ" value={fmt(totalHome)} accent="#a78bfa" sub={`${homeActive.length} สัญญา`} />
          <KpiCard label="รวมภาระทั้งหมด"    value={fmt(totalCar + totalHome)} accent="#f43f5e" />
        </div>
      </Section>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["car", "🚗 งวดรถ", "#3b82f6"], ["home", "🏠 งวดบ้าน", "#a78bfa"]].map(([key, label, color]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: "8px 20px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: tab === key ? 700 : 400, background: tab === key ? `${color}22` : "var(--bg-input)", color: tab === key ? color : "var(--c-muted)", border: `1px solid ${tab === key ? `${color}44` : "var(--border-input)"}`, transition: "all 0.15s" }}>{label}</button>
        ))}
      </div>
      {loading ? <Loading /> : (
        <>
          {tab === "car" && (
            <>
              <Section title="สัญญางวดรถ">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {carLoans.length === 0
                    ? <Card style={{ padding: "20px 18px" }}><span style={{ fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีสัญญางวดรถ</span></Card>
                    : carLoans.map(l => <LoanCard key={l.id} loan={l} loanType="car_loan" color="#3b82f6" />)
                  }
                </div>
              </Section>
              <Section title="เพิ่มสัญญางวดรถ"><AddForm loanType="car_loan" form={carForm} setField={fc} /></Section>
            </>
          )}
          {tab === "home" && (
            <>
              <Section title="สัญญางวดบ้าน">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {homeLoans.length === 0
                    ? <Card style={{ padding: "20px 18px" }}><span style={{ fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีสัญญางวดบ้าน</span></Card>
                    : homeLoans.map(l => <LoanCard key={l.id} loan={l} loanType="home_loan" color="#a78bfa" />)
                  }
                </div>
              </Section>
              <Section title="เพิ่มสัญญางวดบ้าน"><AddForm loanType="home_loan" form={homeForm} setField={fh} /></Section>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: DASHBOARD
───────────────────────────────────────── */
function DashboardPage() {
  const [payMonth, setPayMonth]     = useState(getPayMonth());
  const [summary, setSummary]       = useState(null);
  const [upcoming, setUpcoming]     = useState([]);
  const [loans, setLoans]           = useState({ car: [], home: [] });
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState(null);
  const [loanPayModal, setLoanPayModal] = useState(null);
  const [loanPayLoading, setLoanPayLoading] = useState(false);
  const [loanPayErr, setLoanPayErr] = useState(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false); // popup ดูทั้งหมด
  const today = new Date();

  useEffect(() => {
    setLoading(true); setErr(null);
    Promise.all([
      apiGet({ action: "summary", payMonth }),
      apiGet({ action: "getUpcomingInstallments" }),
      apiGet({ action: "getCarLoans" }),
      apiGet({ action: "getHomeLoans" }),
    ]).then(([s, u, car, home]) => {
      if (s.error) throw new Error(s.error);
      setSummary(s);
      setUpcoming(Array.isArray(u) ? u : []);
      setLoans({
        car:  Array.isArray(car)  ? car.filter(l => l.status !== "closed")  : [],
        home: Array.isArray(home) ? home.filter(l => l.status !== "closed") : [],
      });
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [payMonth]);

  const confirmLoanPay = async (amount) => {
    if (!loanPayModal) return;
    const loan = loanPayModal;
    if (!amount || amount <= 0) { setLoanPayErr("จำนวนไม่ถูกต้อง"); return; }
    setLoanPayLoading(true); setLoanPayErr(null);
    try {
      const res = await apiPost({ action: "payLoan", loan_type: loan._type, loan_id: loan.id, amount });
      if (res.error) { setLoanPayErr(res.error); return; }
      setLoanPayModal(null);
      const [car, home] = await Promise.all([apiGet({ action: "getCarLoans" }), apiGet({ action: "getHomeLoans" })]);
      setLoans({ car: Array.isArray(car) ? car.filter(l => l.status !== "closed") : [], home: Array.isArray(home) ? home.filter(l => l.status !== "closed") : [] });
    } catch { setLoanPayErr("ชำระไม่สำเร็จ"); }
    finally { setLoanPayLoading(false); }
  };

  const allActiveLoans = [
    ...loans.car.map(l => ({ ...l, _type: "car_loan", _color: "#3b82f6", _icon: "🚗" })),
    ...loans.home.map(l => ({ ...l, _type: "home_loan", _color: "#a78bfa", _icon: "🏠" })),
  ];

  return (
    <div>
      {loanPayModal && (
        <PayModal loan={loanPayModal} onClose={() => setLoanPayModal(null)} onConfirm={confirmLoanPay} loading={loanPayLoading} err={loanPayErr} />
      )}
      {/* Upcoming popup modal */}
      {showAllUpcoming && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setShowAllUpcoming(false); }}>
          <div style={{ background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 18, padding: "20px", width: "100%", maxWidth: 440, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>📅 Upcoming Payments</div>
              <XBtn onClick={() => setShowAllUpcoming(false)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcoming.map(item => {
                const diff = item.due_date ? Math.ceil((new Date(item.due_date) - today) / 86400000) : null;
                const urgent = diff !== null && diff <= 7;
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-kpi)", borderRadius: 12, border: `1px solid ${urgent ? "rgba(244,63,94,0.25)" : "var(--border-subtle)"}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: urgent ? "#f87171" : "var(--c-text)" }}>{item.card_name}</div>
                      <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2 }}>{item.description} · Due {item.due_date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: urgent ? "#f87171" : "var(--c-heading)" }}>{fmt(item.amount)}</div>
                      {diff !== null && <Badge text={diff > 0 ? `อีก ${diff}d` : "วันนี้!"} color={urgent ? "#f43f5e" : "var(--c-muted)"} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <FormField label="Pay Month"><MonthPicker value={payMonth} onChange={setPayMonth} /></FormField>
      </div>
      {err && <ErrMsg msg={err} />}
      {loading && <Loading />}

      {!loading && summary && (() => {
        const s = summary;
        const burnPct = s.netIncome > 0 ? (s.expenses.totalExpenses / s.netIncome) * 100 : 0;
        return (
          <>
            <Section title={`รายรับ · ${MON[payMonth.split("-")[1]]} ${payMonth.split("-")[0]}`}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <KpiCard label="Gross Income"  value={fmt(s.income.grossIncome)}   accent="#10b981" />
                <KpiCard label="Net Income"    value={fmt(s.netIncome)}             accent="#34d399" sub={`หักแล้ว ${fmt(s.deductions.totalDeduction)}`} />
                <KpiCard label="Net Balance"   value={fmt(s.netBalance)}            accent="#60a5fa" />
                <KpiCard label="เงินเดือน"     value={fmt(s.income.monthlySalary)} />
                <KpiCard label="OT Pay"        value={fmt(s.income.otPay)}          accent="#a78bfa" sub={`1.5x: ${s.income.ot15}h · 3x: ${s.income.ot3}h · Holiday: ${s.income.holidayHours}h`} />
                <KpiCard label="Meal + Fuel"   value={fmt(s.income.mealNormal + s.income.mealOt + s.income.fuel)} sub={`Meal ${fmt(s.income.mealNormal + s.income.mealOt)} · Fuel ${fmt(s.income.fuel)}`} />
              </div>
            </Section>

            <Section title="การหัก (Deductions)">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <KpiCard label="ประกันสังคม" value={fmt(s.deductions.socialSecurity)} accent="#f87171" />
                <KpiCard label="กยศ."        value={fmt(s.deductions.studentLoan)}    accent="#f87171" />
                <KpiCard label="รวมหัก"      value={fmt(s.deductions.totalDeduction)} accent="#f43f5e" />
              </div>
            </Section>

            <Section title="รายจ่าย">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <KpiCard label="Variable"   value={fmt(s.expenses.variable.total)}  accent="#f43f5e" />
                <KpiCard label="Fixed"      value={fmt(s.expenses.fixed.total)}      accent="#f59e0b" />
                <KpiCard label="รวมรายจ่าย" value={fmt(s.expenses.totalExpenses)}    accent="#f43f5e" />
              </div>
            </Section>

            <Section title="Burn Rate">
              <Card style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <span style={{ color: "var(--c-secondary)", fontSize: 13 }}>รายจ่ายต่อรายได้สุทธิ</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 700, color: burnPct > 80 ? "#f43f5e" : burnPct > 60 ? "#f59e0b" : "#10b981" }}>{burnPct.toFixed(1)}%</span>
                </div>
                <ProgressBar pct={burnPct} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--c-subtle)" }}>
                  <span>{fmt(s.expenses.totalExpenses)} จ่ายออก</span>
                  <span>{fmt(s.netBalance)} เหลือ</span>
                </div>
              </Card>
            </Section>

            {s.expenses.fixed.items?.length > 0 && (
              <Section title="Fixed Expenses Breakdown">
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {s.expenses.fixed.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 18px", borderBottom: i < s.expenses.fixed.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", fontSize: 13 }}>
                      <span style={{ color: "var(--c-secondary)" }}>{item.name}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#f59e0b" }}>{fmt(item.amount)}</span>
                    </div>
                  ))}
                </Card>
              </Section>
            )}

            {/* งวดรถ & งวดบ้าน */}
            {allActiveLoans.length > 0 && (
              <Section title="งวดรถ & งวดบ้าน">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allActiveLoans.map(loan => {
                    const totalAmt = Number(loan.total_amount) || 0;
                    const rem      = Number(loan.remaining_amount) || 0;
                    const paid     = totalAmt - rem;
                    const pct      = totalAmt > 0 ? (paid / totalAmt) * 100 : 0;
                    const inst     = calcLoanInstallment(loan); // ✅ สูตรใหม่
                    return (
                      <Card key={loan.id} style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14 }}>{loan._icon}</span>
                              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>{loan.name}</span>
                              <Badge text={loan._type === "car_loan" ? "รถ" : "บ้าน"} color={loan._color} />
                              {inst && <Badge text={`งวด ${inst.paid}/${inst.total}`} color={loan._color} />}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--c-subtle)" }}>
                              {loan.lender}
                              {Number(loan.remaining_months) > 0 && <span style={{ color: loan._color, marginLeft: 6, fontWeight: 600 }}>· เหลือ {loan.remaining_months} งวด</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                            <div style={{ fontSize: 9, color: "var(--c-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>คงเหลือ</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 16, color: "#f87171" }}>{fmt(rem)}</div>
                          </div>
                        </div>
                        <ProgressBar pct={pct} color={loan._color} />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "var(--c-subtle)" }}>
                          <span>{pct.toFixed(1)}% ชำระแล้ว ({fmt(paid)})</span>
                          <span>รวม {fmt(totalAmt)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                          <Btn onClick={() => { setLoanPayErr(null); setLoanPayModal(loan); }} color={loan._color} small>
                            💳 ชำระ {fmt(loan.monthly_due)}
                          </Btn>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ✅ Upcoming Payments — แสดง 1 รายการ + ปุ่มดูทั้งหมด */}
            <Section
              title="Upcoming Payments"
              action={
                upcoming.length > 1
                  ? <button onClick={() => setShowAllUpcoming(true)} style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 7, padding: "4px 12px", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      ดูทั้งหมด ({upcoming.length})
                    </button>
                  : null
              }
            >
              {upcoming.length === 0
                ? <Card style={{ padding: "20px 18px" }}><span style={{ fontSize: 12, color: "var(--c-subtle)" }}>ไม่มีรายการที่ใกล้ครบกำหนด</span></Card>
                : (() => {
                  const item = upcoming[0]; // แสดงแค่รายการแรก
                  const diff = item.due_date ? Math.ceil((new Date(item.due_date) - today) / 86400000) : null;
                  const urgent = diff !== null && diff <= 7;
                  return (
                    <Card style={{ padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: urgent ? "rgba(244,63,94,0.3)" : undefined }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: urgent ? "#f87171" : "var(--c-text)" }}>{item.card_name}</div>
                        <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2 }}>{item.description} · Due {item.due_date}</div>
                        {upcoming.length > 1 && <div style={{ fontSize: 10, color: "var(--c-subtle)", marginTop: 3 }}>และอีก {upcoming.length - 1} รายการ</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: urgent ? "#f87171" : "var(--c-heading)" }}>{fmt(item.amount)}</div>
                        {diff !== null && <Badge text={diff > 0 ? `อีก ${diff}d` : "วันนี้!"} color={urgent ? "#f43f5e" : "var(--c-muted)"} />}
                      </div>
                    </Card>
                  );
                })()
              }
            </Section>
          </>
        );
      })()}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: YEAR OVERVIEW
───────────────────────────────────────── */
function YearPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  useEffect(() => {
    setLoading(true); setErr(null);
    apiGet({ action: "yearSummary", year }).then(d => { if (d.error) throw new Error(d.error); setData(Array.isArray(d) ? d : []); }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [year]);
  const filled = data.filter(m => m.netIncome > 0);
  const totalIncome = filled.reduce((s, m) => s + m.netIncome, 0);
  const totalExpenses = filled.reduce((s, m) => s + m.totalExpenses, 0);
  const totalBalance = filled.reduce((s, m) => s + m.netBalance, 0);
  return (
    <div>
      <div style={{ marginBottom: 20, maxWidth: 160 }}><FormField label="ปี"><input type="number" value={year} onChange={e => setYear(e.target.value)} style={inputStyle} min="2020" max="2099" /></FormField></div>
      {err && <ErrMsg msg={err} />}
      {loading && <Loading />}
      {!loading && data.length > 0 && (
        <>
          <Section title={`${year} · สรุปรายปี`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <KpiCard label="รายรับสุทธิรวม" value={fmt(totalIncome)} accent="#10b981" sub={`${filled.length} เดือน`} />
              <KpiCard label="รายจ่ายรวม" value={fmt(totalExpenses)} accent="#f43f5e" />
              <KpiCard label="เงินออมรวม" value={fmt(totalBalance)} accent="#60a5fa" sub={`เฉลี่ย ${fmt(Math.round(totalBalance / Math.max(filled.length, 1)))}/เดือน`} />
            </div>
          </Section>
          <Section title="Income vs Expenses by Month">
            <Card style={{ padding: "20px 16px" }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.map(m => ({ name: MON[m.payMonth.split("-")[1]], income: m.netIncome, expense: m.totalExpenses }))} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "var(--c-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--c-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="รายรับ" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expense" name="รายจ่าย" fill="#f43f5e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 18, marginTop: 8 }}>{[["#10b981","รายรับ"],["#f43f5e","รายจ่าย"]].map(([c,l]) => <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--c-secondary)" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}</span>)}</div>
            </Card>
          </Section>
          <Section title="Monthly Detail">
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr 1fr", padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", fontSize: 10, color: "var(--c-subtle)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <span>เดือน</span><span style={{ textAlign: "right" }}>รายรับ</span><span style={{ textAlign: "right" }}>รายจ่าย</span><span style={{ textAlign: "right" }}>คงเหลือ</span>
              </div>
              {data.map((m, i) => {
                const empty = m.netIncome === 0 && m.totalExpenses === 0;
                return (
                  <div key={m.payMonth} style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr 1fr", padding: "12px 18px", borderBottom: i < data.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center", opacity: empty ? 0.3 : 1 }}>
                    <span style={{ fontSize: 12, color: "var(--c-secondary)", fontWeight: 600 }}>{MON[m.payMonth.split("-")[1]]}</span>
                    <span style={{ textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#10b981" }}>{empty ? "—" : fmt(m.netIncome)}</span>
                    <span style={{ textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#f87171" }}>{empty ? "—" : fmt(m.totalExpenses)}</span>
                    <span style={{ textAlign: "right", fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: m.netBalance >= 0 ? "#60a5fa" : "#f43f5e" }}>{empty ? "—" : fmt(m.netBalance)}</span>
                  </div>
                );
              })}
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: EXPENSES
───────────────────────────────────────── */
function ExpensesPage() {
  const [payMonth, setPayMonth] = useState(getPayMonth());
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ date: getToday(), category: "", amount: "", payment_method: "", note: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const catColor = { Food:"#10b981",Transport:"#3b82f6",Shopping:"#a78bfa",Utilities:"#f59e0b",Entertainment:"#f43f5e",Health:"#34d399",Other:"var(--c-muted)" };
  useEffect(() => { apiGet({ action: "getExpenseMeta" }).then(d => { setCategories(d.categories || []); setPaymentMethods(d.paymentMethods || []); }); }, []);
  const loadExpenses = useCallback(() => {
    setLoading(true); setErr(null);
    apiGet({ action: "getExpenses", payMonth }).then(d => setExpenses(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดรายจ่ายไม่สำเร็จ")).finally(() => setLoading(false));
  }, [payMonth]);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  const handleAdd = async () => {
    if (!form.category || !form.amount) return;
    setSubmitting(true); setErr(null);
    const tempId = `temp_${Date.now()}`;
    const item = { id: tempId, ...form, amount: Number(form.amount) };
    setExpenses(p => [item, ...p]);
    setForm({ date: getToday(), category: "", amount: "", payment_method: "", note: "" });
    try { await apiPost({ action: "addExpense", date: item.date, category: item.category, amount: item.amount, payment_method: item.payment_method, note: item.note }); loadExpenses(); }
    catch { setExpenses(p => p.filter(x => x.id !== tempId)); setErr("บันทึกไม่สำเร็จ"); }
    finally { setSubmitting(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm("ลบรายจ่ายนี้?")) return;
    setExpenses(p => p.filter(x => x.id !== id));
    try { await apiPost({ action: "deleteExpense", id }); } catch { loadExpenses(); setErr("ลบไม่สำเร็จ"); }
  };
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return (
    <div>
      <div style={{ marginBottom: 20 }}><FormField label="Pay Month"><MonthPicker value={payMonth} onChange={setPayMonth} /></FormField></div>
      {err && <ErrMsg msg={err} />}
      <Section title="Add Expense">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="วันที่" type="date" value={form.date} onChange={v => f("date", v)} required />
            <FInput label="จำนวน (฿)" type="number" value={form.amount} onChange={v => f("amount", v)} placeholder="0" required />
            <FormField label="หมวดหมู่" required><CustomSelect value={form.category} onChange={v => f("category", v)} options={categories} placeholder="เลือกหมวด" /></FormField>
            <FormField label="วิธีชำระ"><CustomSelect value={form.payment_method} onChange={v => f("payment_method", v)} options={paymentMethods} placeholder="เลือกวิธีชำระ" /></FormField>
            <div style={{ gridColumn: "span 2" }}><FInput label="หมายเหตุ" value={form.note} onChange={v => f("note", v)} placeholder="Optional" /></div>
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={handleAdd} color="#10b981" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ เพิ่มรายจ่าย"}</Btn></div>
        </Card>
      </Section>
      <Section title={`รายการ · รวม ${fmt(total)}`}>
        {loading ? <Loading /> : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {expenses.length === 0
              ? <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ไม่มีรายการในช่วงนี้</div>
              : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "88px 1fr 1fr 88px 28px", padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", fontSize: 10, color: "var(--c-subtle)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <span>วันที่</span><span>หมวด</span><span>หมายเหตุ</span><span style={{ textAlign: "right" }}>จำนวน</span><span />
                  </div>
                  {expenses.map((e, i) => (
                    <div key={e.id} style={{ display: "grid", gridTemplateColumns: "88px 1fr 1fr 88px 28px", padding: "11px 18px", borderBottom: i < expenses.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--c-muted)" }}>{e.date}</span>
                      <span><Badge text={e.category || "?"} color={catColor[e.category] || "var(--c-muted)"} /></span>
                      <span style={{ fontSize: 11, color: "var(--c-subtle)" }}>{e.note || "—"}</span>
                      <span style={{ textAlign: "right", fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 13 }}>{fmt(e.amount)}</span>
                      <XBtn onClick={() => handleDelete(e.id)} />
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--border-card)" }}>
                    <span style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600 }}>รวม</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#f43f5e" }}>{fmt(total)}</span>
                  </div>
                </>
              )}
          </Card>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: FIXED EXPENSES
───────────────────────────────────────── */
function FixedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", start_date: "", end_date: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const load = useCallback(() => { setLoading(true); apiGet({ action: "getFixedList" }).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.start_date) return;
    setSubmitting(true);
    try { await apiPost({ action: "addFixedExpense", ...form }); load(); setForm({ name: "", amount: "", start_date: "", end_date: "" }); }
    catch { setErr("บันทึกไม่สำเร็จ"); } finally { setSubmitting(false); }
  };
  const handleToggle = async (id) => { setItems(p => p.map(x => x.id === id ? { ...x, active: !x.active } : x)); try { await apiPost({ action: "toggleFixedExpense", id }); } catch { load(); } };
  const handleDelete = async (id) => { if (!confirm("ลบรายการนี้?")) return; setItems(p => p.filter(x => x.id !== id)); try { await apiPost({ action: "deleteFixedExpense", id }); } catch { load(); } };
  const totalActive = items.filter(i => i.active).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  return (
    <div>
      {err && <ErrMsg msg={err} />}
      <Section title="Monthly Summary"><KpiCard label="Total Active / Month" value={fmt(totalActive)} accent="#f59e0b" sub={`${items.filter(i => i.active).length} รายการ active`} /></Section>
      <Section title="Add Fixed Expense">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="ชื่อรายจ่าย" value={form.name} onChange={v => f("name", v)} placeholder="Internet, Rent…" required />
            <FInput label="จำนวน / เดือน (฿)" type="number" value={form.amount} onChange={v => f("amount", v)} placeholder="0" required />
            <FInput label="เริ่มต้น" type="date" value={form.start_date} onChange={v => f("start_date", v)} required />
            <FInput label="สิ้นสุด (ว่าง = ตลอดไป)" type="date" value={form.end_date} onChange={v => f("end_date", v)} />
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={handleAdd} color="#f59e0b" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ เพิ่มรายจ่ายประจำ"}</Btn></div>
        </Card>
      </Section>
      <Section title="Fixed Expenses List">
        {loading ? <Loading /> : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {items.length === 0 ? <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีรายการ</div>
              : items.map((item, i) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", padding: "13px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center", gap: 12, opacity: item.active ? 1 : 0.45 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)" }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: "var(--c-subtle)", marginTop: 2 }}>ตั้งแต่ {item.start_date}{item.end_date ? ` ถึง ${item.end_date}` : " — ตลอดไป"}</div>
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: item.active ? "#f59e0b" : "var(--c-subtle)", fontSize: 13 }}>{fmt(item.amount)}</span>
                  <button onClick={() => handleToggle(item.id)} style={{ background: item.active ? "rgba(16,185,129,0.1)" : "var(--border-subtle)", border: `1px solid ${item.active ? "rgba(16,185,129,0.3)" : "var(--border-input)"}`, borderRadius: 6, padding: "4px 10px", color: item.active ? "#10b981" : "var(--c-muted)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{item.active ? "Active" : "Inactive"}</button>
                  <XBtn onClick={() => handleDelete(item.id)} />
                </div>
              ))
            }
            {items.length > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--border-card)" }}><span style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600 }}>รวม Active / เดือน</span><span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#f59e0b" }}>{fmt(totalActive)}</span></div>}
          </Card>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: DEBT
───────────────────────────────────────── */
function DebtPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: "", total_amount: "", monthly_due: "", due_day: "5" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const load = useCallback(() => { setLoading(true); apiGet({ action: "getDebts" }).then(d => setDebts(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const handleAdd = async () => {
    if (!form.name || !form.total_amount) return;
    try { await apiPost({ action: "addDebt", ...form }); load(); setForm({ name: "", total_amount: "", monthly_due: "", due_day: "5" }); }
    catch (e) { setErr(e.message || "เพิ่มไม่สำเร็จ"); }
  };
  const handleDelete = async (id) => { if (!confirm("ลบหนี้นี้?")) return; try { await apiPost({ action: "deleteDebt", id }); load(); } catch { setErr("ลบไม่สำเร็จ"); } };
  const handlePay = async (d) => {
    const input = prompt(`ชำระหนี้ "${d.name}"\nจำนวน (default: ${d.monthly_due}):`, d.monthly_due);
    if (!input) return;
    const amount = Number(input);
    if (!amount || amount > Number(d.remaining_amount)) { alert("จำนวนไม่ถูกต้อง"); return; }
    setPayingId(d.id);
    try { await apiPost({ action: "payDebt", debt_id: d.id, amount }); load(); }
    catch (e) { setErr(e.message || "ชำระไม่สำเร็จ"); } finally { setPayingId(null); }
  };
  return (
    <div>
      {err && <ErrMsg msg={err} />}
      <Section title="Add Debt">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="ชื่อหนี้" value={form.name} onChange={v => f("name", v)} placeholder="ชื่อหนี้" required />
            <FInput label="ยอดรวม (฿)" type="number" value={form.total_amount} onChange={v => f("total_amount", v)} placeholder="50000" required />
            <FInput label="จ่ายต่อเดือน (฿)" type="number" value={form.monthly_due} onChange={v => f("monthly_due", v)} placeholder="5000" required />
            <FInput label="Due Day (1–31)" type="number" value={form.due_day} onChange={v => f("due_day", v)} placeholder="15" required />
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={handleAdd} color="#3b82f6">+ เพิ่มหนี้</Btn></div>
        </Card>
      </Section>
      <Section title="Debt Overview">
        {loading ? <Loading /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {debts.length === 0 && <Card style={{ padding: "20px 18px" }}><span style={{ fontSize: 12, color: "var(--c-subtle)" }}>ไม่มีหนี้</span></Card>}
            {debts.map(d => {
              const paidAmt = Number(d.total_amount) - Number(d.remaining_amount);
              const pct = Number(d.total_amount) > 0 ? (paidAmt / Number(d.total_amount)) * 100 : 0;
              const closed = d.status === "closed";
              return (
                <Card key={d.id} style={{ padding: "20px 22px", opacity: closed ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 8 }}>{d.name} {closed && <Badge text="Closed" color="var(--c-muted)" />}</div>
                      <div style={{ fontSize: 11, color: "var(--c-subtle)", marginTop: 3 }}>Due day {d.due_day} · Monthly {fmt(d.monthly_due)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "var(--c-subtle)", marginBottom: 2 }}>คงเหลือ</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 17, color: closed ? "var(--c-muted)" : "#f87171" }}>{fmt(d.remaining_amount)}</div>
                    </div>
                  </div>
                  <ProgressBar pct={pct} color={closed ? "var(--c-subtle)" : pct > 80 ? "#10b981" : pct > 50 ? "#f59e0b" : "#3b82f6"} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11 }}>
                    <span style={{ color: "var(--c-subtle)" }}>ชำระแล้ว {pct.toFixed(0)}%</span>
                    <span style={{ color: "var(--c-subtle)" }}>รวม {fmt(d.total_amount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                    <Btn onClick={() => handleDelete(d.id)} color="#f43f5e" small>ลบ</Btn>
                    {!closed && <Btn onClick={() => handlePay(d)} color="#10b981" small disabled={payingId === d.id}>{payingId === d.id ? "กำลังชำระ..." : "ชำระ"}</Btn>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: CREDIT CARDS
───────────────────────────────────────── */
function CreditPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [statements, setStatements] = useState({});
  const [err, setErr] = useState(null);
  const [cardForm, setCardForm] = useState({ name: "", credit_limit: "", closing_day: "", due_day: "" });
  const [txForm, setTxForm] = useState({ card_id: "", description: "", amount: "", transaction_date: getToday(), installment_months: "0" });
  const fc = (k, v) => setCardForm(p => ({ ...p, [k]: v }));
  const ft = (k, v) => setTxForm(p => ({ ...p, [k]: v }));
  const load = useCallback(() => { setLoading(true); apiGet({ action: "getCreditSummary" }).then(d => setCards(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const toggleStatement = async (cardId) => {
    if (selectedCard === cardId) { setSelectedCard(null); return; }
    setSelectedCard(cardId);
    if (!statements[cardId]) { const now = new Date(); const stmt = await apiGet({ action: "getCreditStatement", card_id: cardId, year: now.getFullYear(), month: now.getMonth() + 1 }); setStatements(p => ({ ...p, [cardId]: stmt })); }
  };
  const handleCreateCard = async () => { if (!cardForm.name || !cardForm.credit_limit) return; try { await apiPost({ action: "createCreditCard", ...cardForm }); load(); setCardForm({ name: "", credit_limit: "", closing_day: "", due_day: "" }); } catch (e) { setErr(e.message || "สร้างบัตรไม่สำเร็จ"); } };
  const handleCreateTx = async () => { if (!txForm.card_id || !txForm.description || !txForm.amount) return; try { await apiPost({ action: "createCreditTransaction", ...txForm, installment_months: Number(txForm.installment_months) || 0 }); load(); setTxForm({ card_id: "", description: "", amount: "", transaction_date: getToday(), installment_months: "0" }); } catch (e) { setErr(e.message || "บันทึก transaction ไม่สำเร็จ"); } };
  return (
    <div>
      {err && <ErrMsg msg={err} />}
      <Section title="Credit Cards">
        {loading ? <Loading /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cards.map(c => {
              const util = Number(c.utilization_percent) || 0;
              const color = util > 75 ? "#f43f5e" : util > 50 ? "#f59e0b" : "#10b981";
              const active = selectedCard === c.card_id;
              const stmt = statements[c.card_id];
              return (
                <Card key={c.card_id} style={{ padding: "18px 22px", borderColor: active ? "rgba(96,165,250,0.35)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--c-text)" }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "var(--c-subtle)", marginTop: 2 }}>Limit {fmt(c.credit_limit)} · Available {fmt(c.available_credit)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 16, color }}>{util.toFixed(1)}%</div>
                      <div style={{ fontSize: 10, color: "var(--c-subtle)" }}>{fmt(c.outstanding)} ใช้ไปแล้ว</div>
                    </div>
                  </div>
                  <ProgressBar pct={util} color={color} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: "var(--c-subtle)" }}>Next due: {c.next_due_date || "—"} · {fmt(c.next_due_amount)}</span>
                    <Btn onClick={() => toggleStatement(c.card_id)} color="#60a5fa" small>{active ? "ซ่อน Statement" : "ดู Statement"}</Btn>
                  </div>
                  {active && (
                    <div style={{ marginTop: 14, padding: "14px 16px", background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10 }}>
                      {!stmt ? <div style={{ fontSize: 12, color: "var(--c-subtle)" }}>กำลังโหลด...</div>
                        : stmt.error ? <div style={{ fontSize: 12, color: "#f87171" }}>{stmt.error}</div>
                        : (
                          <>
                            <div style={{ fontSize: 10, color: "#60a5fa", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Statement Summary</div>
                            {[["รอบบัญชี", `${stmt.statement_period_start} → ${stmt.statement_period_end}`], ["วันครบกำหนด", stmt.due_date], ["ยอดที่ต้องชำระ", fmt(stmt.statement_total)]].map(([k, v]) => (
                              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                                <span style={{ color: "var(--c-muted)" }}>{k}</span>
                                <span style={{ fontFamily: k === "ยอดที่ต้องชำระ" ? "'DM Mono', monospace" : "inherit", fontWeight: k === "ยอดที่ต้องชำระ" ? 700 : 400, color: k === "ยอดที่ต้องชำระ" ? "#60a5fa" : "var(--c-text)" }}>{v}</span>
                              </div>
                            ))}
                          </>
                        )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Section>
      <Section title="Add Credit Card">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="ชื่อบัตร" value={cardForm.name} onChange={v => fc("name", v)} placeholder="KBank Platinum" required />
            <FInput label="วงเงิน (฿)" type="number" value={cardForm.credit_limit} onChange={v => fc("credit_limit", v)} required />
            <FInput label="Closing Day" type="number" value={cardForm.closing_day} onChange={v => fc("closing_day", v)} placeholder="25" required />
            <FInput label="Due Day" type="number" value={cardForm.due_day} onChange={v => fc("due_day", v)} placeholder="15" required />
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={handleCreateCard} color="#3b82f6">+ เพิ่มบัตร</Btn></div>
        </Card>
      </Section>
      <Section title="Add Transaction">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="บัตร" required><CustomSelect value={txForm.card_id} onChange={v => ft("card_id", v)} options={cards.map(c => ({ value: c.card_id, label: c.name }))} placeholder="เลือกบัตร" /></FormField>
            <FInput label="วันที่" type="date" value={txForm.transaction_date} onChange={v => ft("transaction_date", v)} required />
            <FInput label="รายการ" value={txForm.description} onChange={v => ft("description", v)} placeholder="รายการ" required />
            <FInput label="จำนวน (฿)" type="number" value={txForm.amount} onChange={v => ft("amount", v)} placeholder="0" required />
            <div style={{ gridColumn: "span 2" }}><FInput label="แบ่งผ่อน (0 = จ่ายเต็ม)" type="number" value={txForm.installment_months} onChange={v => ft("installment_months", v)} placeholder="0" /></div>
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={handleCreateTx} color="#3b82f6">+ บันทึก Transaction</Btn></div>
        </Card>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: INSTALLMENTS
───────────────────────────────────────── */
function InstallmentsPage() {
  const [rawList, setRawList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const load = useCallback(() => { setLoading(true); apiGet({ action: "getInstallments" }).then(d => setRawList(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const groups = Object.values(rawList.reduce((acc, inst) => { const txId = inst.transaction_id; if (!acc[txId]) acc[txId] = { transaction_id: txId, description: inst.description, card_name: inst.card_name, months: inst.months, total_amount: inst.total_amount, installments: [] }; acc[txId].installments.push(inst); return acc; }, {}));
  const handleCancel = async (txId) => { if (!confirm("ยกเลิก transaction นี้?")) return; try { await apiPost({ action: "cancelCreditTransaction", transaction_id: txId }); load(); } catch (e) { setErr(e.message || "ยกเลิกไม่สำเร็จ"); } };
  const handlePayNext = async (group) => {
    const next = group.installments.find(i => i.status === "unpaid");
    if (!next) return;
    if (!confirm(`จ่ายงวดที่ ${next.installment_no} — ${fmt(next.amount)}\nDue: ${next.due_date}`)) return;
    try { await apiPost({ action: "payCreditInstallment", installment_id: next.id }); load(); } catch (e) { setErr(e.message || "ชำระไม่สำเร็จ"); }
  };
  return (
    <div>
      {err && <ErrMsg msg={err} />}
      <Section title="Active Installment Plans" action={<Badge text={`${groups.filter(g => g.installments.some(i => i.status === "unpaid")).length} plans`} color="#3b82f6" />}>
        {loading ? <Loading /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {groups.length === 0 && <Card style={{ padding: "20px 18px" }}><span style={{ fontSize: 12, color: "var(--c-subtle)" }}>ไม่มีรายการผ่อนชำระ</span></Card>}
            {groups.map(group => {
              const paid = group.installments.filter(i => i.status === "paid").length;
              const paidAmt = group.installments.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
              const unpaidAmt = group.installments.filter(i => i.status === "unpaid").reduce((s, i) => s + Number(i.amount), 0);
              const pct = group.months > 0 ? (paid / group.months) * 100 : 0;
              const allPaid = paid === group.months;
              const nextUnpaid = group.installments.find(i => i.status === "unpaid");
              return (
                <Card key={group.transaction_id} style={{ padding: "20px 22px", opacity: allPaid ? 0.7 : 1, borderColor: allPaid ? "rgba(16,185,129,0.2)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--c-text)" }}>{group.description}</span>
                        {allPaid && <Badge text="ชำระครบ" color="#10b981" />}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--c-subtle)" }}>{group.card_name}</div>
                      <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 3 }}>
                        ชำระแล้ว {paid}/{group.months} งวด
                        {nextUnpaid && <span style={{ color: "#f59e0b", marginLeft: 8 }}>· Next: {nextUnpaid.due_date} ({fmt(nextUnpaid.amount)})</span>}
                      </div>
                    </div>
                    {!allPaid && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <Btn onClick={() => handlePayNext(group)} color="#10b981" small>จ่ายงวดถัดไป</Btn>
                        <Btn onClick={() => handleCancel(group.transaction_id)} color="#f43f5e" small>ยกเลิก</Btn>
                      </div>
                    )}
                  </div>
                  <ProgressBar pct={pct} color={allPaid ? "#10b981" : "#3b82f6"} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11 }}>
                    <span style={{ color: "var(--c-subtle)" }}>{pct.toFixed(0)}% · {fmt(paidAmt)} ชำระแล้ว</span>
                    {!allPaid && <span style={{ color: "var(--c-muted)" }}>คงเหลือ {fmt(unpaidAmt)}</span>}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {group.installments.map(inst => {
                      const isNext = inst.id === nextUnpaid?.id;
                      return <div key={inst.id} title={`งวด ${inst.installment_no} · ${inst.due_date}`} style={{ width: 26, height: 26, borderRadius: 6, background: inst.status === "paid" ? "rgba(16,185,129,0.25)" : isNext ? "rgba(59,130,246,0.25)" : "var(--border-subtle)", border: `1px solid ${inst.status === "paid" ? "rgba(16,185,129,0.5)" : isNext ? "rgba(59,130,246,0.5)" : "var(--border-mid)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: inst.status === "paid" ? "#10b981" : isNext ? "#60a5fa" : "var(--c-dim)" }}>{inst.installment_no}</div>;
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "var(--c-subtle)", display: "flex", justifyContent: "space-between" }}>
                    <span>ยอดรวม {fmt(group.total_amount)}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(Math.round(group.total_amount / group.months))}/งวด</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: PAYMENT CENTER
───────────────────────────────────────── */
function PaymentCenterPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [paidCount, setPaidCount] = useState(0);
  const [err, setErr] = useState(null);
  const today = new Date();
  const load = useCallback(() => { setLoading(true); setErr(null); apiPost({ action: "getDuePayments" }).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const handlePay = async (item) => {
    if (!confirm(`ยืนยันชำระ ${item.title}\n${item.subtitle}\nจำนวน ${fmt(item.amount)}`)) return;
    const key = `${item.type}-${item.source_id}`;
    setProcessingId(key);
    try {
      const res = await apiPost({ action: "processPayment", type: item.type, source_id: item.source_id, amount: item.amount });
      if (res.error) { setErr(res.error); return; }
      setItems(p => p.filter(i => !(i.type === item.type && String(i.source_id) === String(item.source_id))));
      setPaidCount(p => p + 1);
    } catch (e) { setErr(e.message || "ชำระไม่สำเร็จ"); } finally { setProcessingId(null); }
  };
  const typeColor = { debt:"#f43f5e",installment:"#3b82f6",fixed:"#f59e0b",credit:"#a78bfa",car_loan:"#3b82f6",home_loan:"#a78bfa" };
  const typeLabel = { debt:"Debt",installment:"ผ่อน",fixed:"Fixed",credit:"Credit",car_loan:"รถ",home_loan:"บ้าน" };
  const totalDue = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  return (
    <div>
      <Section title="Due This Month">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <KpiCard label="รายการทั้งหมด" value={`${items.length} รายการ`} accent="#60a5fa" />
          <KpiCard label="ยอดรวมที่ต้องจ่าย" value={fmt(totalDue)} accent="#f43f5e" />
          <KpiCard label="ชำระแล้วเดือนนี้" value={`${paidCount} รายการ`} accent="#10b981" />
        </div>
      </Section>
      <Section title="Payment Queue">
        {loading ? <Loading /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {err && <ErrMsg msg={err} />}
            {items.length === 0 && <Card style={{ padding: "32px", textAlign: "center" }}><div style={{ fontSize: 22, marginBottom: 8 }}>✓</div><div style={{ color: "#10b981", fontWeight: 600, fontSize: 14 }}>ชำระครบทุกรายการแล้ว!</div></Card>}
            {items.map(item => {
              const diff = item.due_date ? Math.ceil((new Date(item.due_date) - today) / 86400000) : null;
              const urgent = diff !== null && diff <= 7;
              const color = typeColor[item.type] || "var(--c-muted)";
              const key = `${item.type}-${item.source_id}`;
              return (
                <Card key={key} style={{ padding: "15px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: urgent ? "rgba(244,63,94,0.25)" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{typeLabel[item.type]}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: urgent ? "#f87171" : "var(--c-text)" }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2 }}>{item.subtitle}</div>
                      {diff !== null && <div style={{ fontSize: 10, color: urgent ? "#f87171" : "var(--c-subtle)", marginTop: 2, fontWeight: 600 }}>{item.due_date} · {diff > 0 ? `อีก ${diff} วัน` : diff === 0 ? "วันนี้!" : `เกิน ${Math.abs(diff)} วัน`}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 14, color: urgent ? "#f87171" : "var(--c-heading)" }}>{fmt(item.amount)}</span>
                    <Btn onClick={() => handlePay(item)} color="#10b981" small disabled={processingId === key}>{processingId === key ? "กำลังชำระ..." : "ชำระ"}</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: WORKLOG
───────────────────────────────────────── */
function WorklogPage() {
  const [payMonth, setPayMonth] = useState(getPayMonth());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ date: getToday(), holiday_hours: "", ot_evening_1_5x: "", ot_evening_3x: "", note: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const lastOT = useRef({ ot_evening_1_5x: "2.5", ot_evening_3x: "0" });
  const load = useCallback(() => { setLoading(true); apiGet({ action: "getWorklogs", payMonth }).then(d => setLogs(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false)); }, [payMonth]);
  useEffect(() => { load(); }, [load]);
  const handleAdd = async () => {
    if (!form.date) return;
    setSubmitting(true); setErr(null);
    if (form.ot_evening_1_5x || form.ot_evening_3x) lastOT.current = { ot_evening_1_5x: form.ot_evening_1_5x, ot_evening_3x: form.ot_evening_3x };
    const tempId = `temp_${Date.now()}`;
    const item = { id: tempId, date: form.date, holiday_hours: Number(form.holiday_hours) || 0, ot15: Number(form.ot_evening_1_5x) || 0, ot3: Number(form.ot_evening_3x) || 0, note: form.note };
    setLogs(p => [item, ...p]);
    setForm({ date: getToday(), holiday_hours: "", ot_evening_1_5x: "", ot_evening_3x: "", note: "" });
    try { await apiPost({ action: "addWorklog", date: item.date, holiday_hours: item.holiday_hours, ot_evening_1_5x: item.ot15, ot_evening_3x: item.ot3, note: item.note }); load(); }
    catch { setLogs(p => p.filter(x => x.id !== tempId)); setErr("บันทึกไม่สำเร็จ"); } finally { setSubmitting(false); }
  };
  const handleQuickLog = async () => {
    const ot15 = Number(lastOT.current.ot_evening_1_5x) || 0;
    const ot3  = Number(lastOT.current.ot_evening_3x) || 0;
    if (!ot15 && !ot3) { setErr("ยังไม่มีค่า OT ที่จำไว้ — กรอกครั้งแรกก่อนครับ"); return; }
    setSubmitting(true); setErr(null);
    const tempId = `temp_${Date.now()}`;
    const item = { id: tempId, date: getToday(), holiday_hours: 0, ot15, ot3, note: "Quick log" };
    setLogs(p => [item, ...p]);
    try { await apiPost({ action: "addWorklog", date: item.date, holiday_hours: 0, ot_evening_1_5x: ot15, ot_evening_3x: ot3, note: "Quick log" }); load(); }
    catch { setLogs(p => p.filter(x => x.id !== tempId)); setErr("บันทึกไม่สำเร็จ"); } finally { setSubmitting(false); }
  };
  const handleDelete = async (id) => { if (!confirm("ลบรายการ worklog นี้?")) return; setLogs(p => p.filter(l => l.id !== id)); try { await apiPost({ action: "deleteWorklog", id }); } catch { load(); setErr("ลบไม่สำเร็จ"); } };
  const totalOT15 = logs.reduce((s, l) => s + (Number(l.ot15) || 0), 0);
  const totalOT3  = logs.reduce((s, l) => s + (Number(l.ot3) || 0), 0);
  const totalHoliday = logs.reduce((s, l) => s + (Number(l.holiday_hours) || 0), 0);
  return (
    <div>
      <div style={{ marginBottom: 20 }}><FormField label="Pay Month"><MonthPicker value={payMonth} onChange={setPayMonth} /></FormField></div>
      {err && <ErrMsg msg={err} />}
      <Section title="OT Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <KpiCard label="OT 1.5x (ชม.)" value={`${totalOT15}h`} accent="#a78bfa" />
          <KpiCard label="OT 3x (ชม.)" value={`${totalOT3}h`} accent="#f59e0b" />
          <KpiCard label="Holiday (ชม.)" value={`${totalHoliday}h`} accent="#10b981" />
        </div>
      </Section>
      <Section title="Log OT">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="วันที่" type="date" value={form.date} onChange={v => f("date", v)} required />
            <FInput label="Holiday Hours" type="number" value={form.holiday_hours} onChange={v => f("holiday_hours", v)} placeholder="0" />
            <FInput label="OT Evening 1.5x (ชม.)" type="number" value={form.ot_evening_1_5x} onChange={v => f("ot_evening_1_5x", v)} placeholder="0" />
            <FInput label="OT Evening 3x (ชม.)" type="number" value={form.ot_evening_3x} onChange={v => f("ot_evening_3x", v)} placeholder="0" />
            <div style={{ gridColumn: "span 2" }}><FInput label="หมายเหตุ" value={form.note} onChange={v => f("note", v)} placeholder="Optional note" /></div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Btn onClick={handleAdd} color="#a78bfa" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ บันทึก OT"}</Btn>
            <Btn onClick={handleQuickLog} color="#f59e0b" disabled={submitting}>⚡ Quick Log วันนี้</Btn>
          </div>
        </Card>
      </Section>
      <Section title="Work Log History">
        {loading ? <Loading /> : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {logs.length === 0 && <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีรายการในช่วงนี้</div>}
            {logs.map((l, i) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: i < logs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>{l.date}</div>
                  <div style={{ fontSize: 10, color: "var(--c-subtle)", marginTop: 2 }}>{l.note || "—"}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {Number(l.holiday_hours) > 0 && <Badge text={`Holiday ${l.holiday_hours}h`} color="#10b981" />}
                  {Number(l.ot15) > 0 && <Badge text={`OT1.5 ${l.ot15}h`} color="#a78bfa" />}
                  {Number(l.ot3) > 0 && <Badge text={`OT3 ${l.ot3}h`} color="#f59e0b" />}
                  <XBtn onClick={() => handleDelete(l.id)} />
                </div>
              </div>
            ))}
          </Card>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE: SETTINGS
───────────────────────────────────────── */
function SettingsPage() {
  const [config, setConfig] = useState({});
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);
  const [salaryForm, setSalaryForm] = useState({ effective_date: "", salary: "" });
  const load = useCallback(() => { setLoading(true); Promise.all([apiGet({ action: "getConfig" }), apiGet({ action: "getSalaryHistory" })]).then(([cfg, hist]) => { setConfig(cfg || {}); setSalaryHistory(Array.isArray(hist) ? hist : []); }).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const handleSaveConfig = async () => { setSaving(true); try { await apiPost({ action: "updateConfig", ...config }); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch { setErr("บันทึกไม่สำเร็จ"); } finally { setSaving(false); } };
  const handleAddSalary = async () => { if (!salaryForm.effective_date || !salaryForm.salary) return; setSaving(true); try { await apiPost({ action: "addSalaryHistory", ...salaryForm }); setSalaryForm({ effective_date: "", salary: "" }); load(); } catch { setErr("บันทึกไม่สำเร็จ"); } finally { setSaving(false); } };
  const CONFIG_LABELS = { salary_divisor_days:"วันทำงาน/เดือน (หาร)",work_hours_per_day:"ชั่วโมง/วัน",ot_multiplier_1:"OT Holiday ×",ot_multiplier_1_5:"OT 1.5x ×",ot_multiplier_3:"OT 3x ×",ot_meal_threshold_hours:"OT ได้ค่าอาหาร (ชม.ขั้นต่ำ)",meal_normal_per_day:"ค่าอาหาร Normal/วัน",meal_ot_per_day:"ค่าอาหาร OT/วัน",fuel_per_day:"ค่าน้ำมัน/วัน",social_security_max_base:"ฐานประกันสังคม (สูงสุด)",social_security_rate:"อัตราประกันสังคม",student_loan_fixed:"กยศ. หักคงที่/เดือน" };
  return (
    <div>
      {err && <ErrMsg msg={err} />}
      {loading ? <Loading /> : (
        <>
          <Section title="Payroll Config">
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {Object.entries(CONFIG_LABELS).map(([key, label]) => (
                  <FormField key={key} label={label}><input type="number" value={config[key] ?? ""} onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} step="0.01" /></FormField>
                ))}
              </div>
              <div style={{ marginTop: 14 }}><Btn onClick={handleSaveConfig} color={saved ? "#10b981" : "#60a5fa"} disabled={saving}>{saved ? "✓ บันทึกแล้ว" : saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</Btn></div>
            </Card>
          </Section>
          <Section title="Add Salary History">
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FInput label="Effective Date" type="date" value={salaryForm.effective_date} onChange={v => setSalaryForm(p => ({ ...p, effective_date: v }))} required />
                <FInput label="เงินเดือน (฿)" type="number" value={salaryForm.salary} onChange={v => setSalaryForm(p => ({ ...p, salary: v }))} required />
              </div>
              <div style={{ marginTop: 14 }}><Btn onClick={handleAddSalary} color="#60a5fa" disabled={saving}>+ บันทึกเงินเดือนใหม่</Btn></div>
            </Card>
          </Section>
          <Section title="Salary History">
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {salaryHistory.length === 0
                ? <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีข้อมูล</div>
                : salaryHistory.map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 20px", borderBottom: i < salaryHistory.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ fontSize: 13, color: "var(--c-secondary)" }}>{h.effective_date}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#10b981", fontSize: 14 }}>{fmt(h.salary)}</span>
                  </div>
                ))
              }
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   APP SHELL
───────────────────────────────────────── */
const PAGE_MAP = {
  dashboard: DashboardPage, year: YearPage, expenses: ExpensesPage, fixed: FixedPage,
  loans: LoanPage, debt: DebtPage, credit: CreditPage, installments: InstallmentsPage,
  payments: PaymentCenterPage, worklog: WorklogPage, settings: SettingsPage,
};

export default function App() {
  const [page, setPage]               = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme]             = useState(() => localStorage.getItem("finance-theme") || "dark");
  const toggleTheme = () => setTheme(t => { const n = t === "dark" ? "light" : "dark"; localStorage.setItem("finance-theme", n); return n; });
  const isDark = theme === "dark";
  const PageComponent = PAGE_MAP[page];
  const currentNav = NAV_ITEMS.find(n => n.key === page);
  const BOTTOM_NAV = [
    { key: "dashboard", label: "Home",     icon: "⬡" },
    { key: "expenses",  label: "Expenses", icon: "◈" },
    { key: "payments",  label: "Pay",      icon: "◆" },
    { key: "worklog",   label: "Worklog",  icon: "◎" },
    { key: "settings",  label: "Settings", icon: "⚙" },
  ];
  const navigate = (key) => { setPage(key); setSidebarOpen(false); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { font-family: 'DM Sans', sans-serif; }

        /* ── Dark Theme ── */
        .app-root {
          --bg-page:    #060d1a;
          --bg-sidebar: #060d1a;
          --bg-card:    rgba(255,255,255,0.03);
          --border-card: rgba(255,255,255,0.07);
          --bg-kpi:     rgba(255,255,255,0.04);
          --border-kpi: rgba(255,255,255,0.07);
          --bg-input:   rgba(255,255,255,0.06);
          --border-input: rgba(255,255,255,0.1);
          --border-subtle: rgba(255,255,255,0.05);
          --border-mid: rgba(255,255,255,0.08);
          --bg-tooltip: #1a2540;
          --bg-picker:  #111827;
          --c-heading:  #f0f4ff;
          --c-text:     #e2e8f0;
          --c-secondary:#9ca3af;
          --c-muted:    #6b7280;
          --c-subtle:   #4b5563;
          --c-dim:      #374151;
          --c-dimmer:   #2d3748;
        }
        /* ✅ Light Theme — ซ้าย/ขวา bg เดียวกัน */
        .app-root.light {
          --bg-page:    #f0f4f8;
          --bg-sidebar: #f0f4f8;
          --bg-card:    #ffffff;
          --border-card: rgba(0,0,0,0.07);
          --bg-kpi:     #ffffff;
          --border-kpi: rgba(0,0,0,0.07);
          --bg-input:   rgba(0,0,0,0.04);
          --border-input: rgba(0,0,0,0.12);
          --border-subtle: rgba(0,0,0,0.06);
          --border-mid: rgba(0,0,0,0.08);
          --bg-tooltip: #1e293b;
          --bg-picker:  #ffffff;
          --c-heading:  #0f172a;
          --c-text:     #1e293b;
          --c-secondary:#64748b;
          --c-muted:    #64748b;
          --c-subtle:   #94a3b8;
          --c-dim:      #cbd5e1;
          --c-dimmer:   #e2e8f0;
        }
        /* Light sidebar border */
        .app-root.light .sidebar { border-right-color: rgba(0,0,0,0.08) !important; }
        .app-root.light .desktop-header { border-bottom-color: rgba(0,0,0,0.06) !important; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-input); border-radius: 99px; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-loader { width: 36px; height: 36px; border-radius: 50%; border: 3px solid rgba(16,185,129,0.15); border-top-color: #10b981; animation: spin 0.8s linear infinite; }

        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 40; }
        .sidebar-overlay.open { display: block; }
        .sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 240px;
          background: var(--bg-sidebar); border-right: 1px solid var(--border-subtle);
          padding: 24px 0; display: flex; flex-direction: column; z-index: 50;
          transform: translateX(-100%); transition: transform 0.25s ease;
        }
        .sidebar.open { transform: translateX(0); }
        @media (min-width: 768px) {
          .sidebar { position: sticky; top: 0; height: 100vh; transform: translateX(0) !important; }
          .sidebar-overlay { display: none !important; }
          .mobile-header { display: none !important; }
          .bottom-nav { display: none !important; }
          .main-content { padding-bottom: 0 !important; }
        }
        .mobile-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: var(--bg-sidebar); border-bottom: 1px solid var(--border-subtle); position: sticky; top: 0; z-index: 30; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-sidebar); border-top: 1px solid var(--border-card); display: flex; z-index: 30; padding-bottom: env(safe-area-inset-bottom, 0px); }
        .bottom-nav button { flex: 1; border: none; background: transparent; padding: 10px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; transition: all 0.12s; font-family: inherit; }
        .bottom-nav button.active { color: #10b981; }
        .bottom-nav button:not(.active) { color: #4b5563; }
        .bottom-nav button span.icon { font-size: 16px; }
        .bottom-nav button span.lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.04em; }
        .ham { display: flex; flex-direction: column; gap: 4px; cursor: pointer; padding: 4px; background: none; border: none; }
        .ham span { display: block; width: 20px; height: 2px; background: #9ca3af; border-radius: 2px; }
        .desktop-header { display: none; }
        @media (min-width: 768px) {
          .desktop-header { display: flex !important; }
          .main-content { padding: 0 28px 40px !important; }
        }
      `}</style>

      <div className={`app-root${isDark ? "" : " light"}`} style={{ display: "flex", minHeight: "100vh", background: "var(--bg-page)", color: "var(--c-text)", fontFamily: "'DM Sans', sans-serif" }}>
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* ── Sidebar ── */}
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div style={{ padding: "0 20px 22px" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--c-heading)", letterSpacing: "-0.01em" }}>💰 FinanceOS</div>
            <div style={{ fontSize: 11, color: "var(--c-dim)", marginTop: 3 }}>Personal Finance Manager</div>
          </div>
          <nav style={{ flex: 1, overflowY: "auto" }}>
            {NAV_ITEMS.map(item => {
              const active = page === item.key;
              return (
                <button key={item.key} onClick={() => navigate(item.key)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 22px", border: "none", cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: active ? 600 : 400, fontFamily: "inherit", background: active ? "rgba(16,185,129,0.1)" : "transparent", color: active ? "#10b981" : "var(--c-muted)", borderRight: active ? "2px solid #10b981" : "2px solid transparent", transition: "all 0.12s" }}>
                  <span style={{ fontSize: 15, opacity: active ? 1 : 0.5 }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-kpi)", border: "1px solid var(--border-kpi)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
              <span style={{ fontSize: 12, color: "var(--c-secondary)", fontWeight: 500 }}>{isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
              <div style={{ width: 36, height: 20, borderRadius: 99, background: isDark ? "#10b981" : "#e2e8f0", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: isDark ? 19 : 3, transition: "left 0.2s" }} />
              </div>
            </button>
            <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ color: "#10b981", fontSize: 12, fontWeight: 600 }}>FinanceOS</div>
              <div style={{ color: "var(--c-muted)", marginTop: 2, fontSize: 11 }}>Connected · Google Sheets</div>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ flex: 1, overflow: "auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div className="mobile-header">
            <button className="ham" onClick={() => setSidebarOpen(o => !o)}><span /><span /><span /></button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-heading)" }}>💰 {currentNav?.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={toggleTheme} style={{ background: "var(--bg-kpi)", border: "1px solid var(--border-kpi)", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>{isDark ? "🌙" : "☀️"}</button>
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#10b981", fontWeight: 600 }}>Live</div>
            </div>
          </div>
          <div style={{ padding: "20px 28px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }} className="desktop-header">
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 700, color: "var(--c-heading)", letterSpacing: "-0.02em" }}>{currentNav?.label}</h1>
              <p style={{ fontSize: 10, color: "var(--c-dim)", marginTop: 2 }}>ข้อมูลจาก Google Sheets · Real-time</p>
            </div>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 11, color: "#10b981", fontWeight: 600 }}>Live</div>
          </div>
          <div className="main-content" style={{ padding: "0 18px 90px", flex: 1 }}>
            <PageComponent />
          </div>
        </div>

        <nav className="bottom-nav">
          {BOTTOM_NAV.map(item => (
            <button key={item.key} onClick={() => navigate(item.key)} className={page === item.key ? "active" : ""}>
              <span className="icon">{item.icon}</span>
              <span className="lbl">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}


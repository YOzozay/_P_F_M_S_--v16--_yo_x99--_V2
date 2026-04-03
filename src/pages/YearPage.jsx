import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { apiGet } from "../api/gsApi";
import { fmt, fmtShort } from "../utils/formatters";
import { MON } from "../utils/dateUtils";

import { KpiCard } from "../components/ui/KpiCard";
import { Section } from "../components/ui/Section";
import { Card } from "../components/ui/Card";
import { FormField } from "../components/form/FormField";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: 10, padding: "9px 12px", color: "var(--c-text)", fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-tooltip)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "var(--c-secondary)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontFamily: "'DM Mono', monospace" }}>{p.name}: {fmtShort(p.value)}</div>)}
    </div>
  );
};

export default function YearPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true); setErr(null);
    apiGet({ action: "yearSummary", year })
      .then(d => { if (d.error) throw new Error(d.error); setData(Array.isArray(d) ? d : []); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  // ✅ Logic กรองข้อมูลให้แสดงถึงแค่เดือนปัจจุบัน
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth เริ่มที่ 0

  const filteredData = data.filter(m => {
    const [itemYear, itemMonth] = m.payMonth.split("-").map(Number);
    // ถ้าเป็นปีปัจจุบัน ให้เอาเฉพาะเดือนที่น้อยกว่าหรือเท่ากับเดือนปัจจุบัน
    if (itemYear === currentYear) {
      return itemMonth <= currentMonth;
    }
    // ถ้าเป็นปีที่ผ่านมาแล้ว ให้โชว์ครบทุกเดือน
    if (itemYear < currentYear) {
      return true;
    }
    // ถ้าเลือกปีในอนาคต (ซึ่งปกติไม่ควรมีข้อมูล) จะไม่โชว์
    return false;
  });

  const filled = filteredData.filter(m => m.netIncome > 0 || m.totalExpenses > 0);
  const totalIncome = filteredData.reduce((s, m) => s + m.netIncome, 0);
  const totalExpenses = filteredData.reduce((s, m) => s + m.totalExpenses, 0);
  const totalBalance = filteredData.reduce((s, m) => s + m.netBalance, 0);

  return (
    <div>
      <div style={{ marginBottom: 20, maxWidth: 160 }}>
        <FormField label="ปี">
          <input type="number" value={year} onChange={e => setYear(e.target.value)} style={inputStyle} min="2020" max="2099" />
        </FormField>
      </div>
      
      {err && <ErrMsg msg={err} />}
      {loading && <Loading />}
      
      {!loading && filteredData.length > 0 && (
        <>
          <Section title={`${year} · สรุปรายปี`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <KpiCard label="รายรับสุทธิรวม" value={fmt(totalIncome)} accent="#10b981" sub={`${filled.length} เดือน (ถึงปัจจุบัน)`} />
              <KpiCard label="รายจ่ายรวม" value={fmt(totalExpenses)} accent="#f43f5e" />
              <KpiCard label="เงินออมรวม" value={fmt(totalBalance)} accent="#60a5fa" sub={`เฉลี่ย ${fmt(Math.round(totalBalance / Math.max(filled.length, 1)))}/เดือน`} />
            </div>
          </Section>

          <Section title="Income vs Expenses by Month">
            <Card style={{ padding: "20px 16px" }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredData.map(m => ({ name: MON[m.payMonth.split("-")[1]], income: m.netIncome, expense: m.totalExpenses }))} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "var(--c-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--c-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="รายรับ" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expense" name="รายจ่าย" fill="#f43f5e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
                {[["#10b981","รายรับ"],["#f43f5e","รายจ่าย"]].map(([c,l]) => (
                  <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--c-secondary)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
                  </span>
                ))}
              </div>
            </Card>
          </Section>

          <Section title="Monthly Detail">
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr 1fr", padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)", fontSize: 10, color: "var(--c-subtle)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <span>เดือน</span><span style={{ textAlign: "right" }}>รายรับ</span><span style={{ textAlign: "right" }}>รายจ่าย</span><span style={{ textAlign: "right" }}>คงเหลือ</span>
              </div>
              {filteredData.map((m, i) => {
                const empty = m.netIncome === 0 && m.totalExpenses === 0;
                return (
                  <div key={m.payMonth} style={{ display: "grid", gridTemplateColumns: "72px 1fr 1fr 1fr", padding: "12px 18px", borderBottom: i < filteredData.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center", opacity: empty ? 0.3 : 1 }}>
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
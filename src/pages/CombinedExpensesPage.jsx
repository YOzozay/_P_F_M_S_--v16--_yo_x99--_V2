import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { getPayMonth, getToday } from "../utils/dateUtils";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Btn, XBtn } from "../components/ui/Btn";
import { FormField } from "../components/form/FormField";
import { FInput } from "../components/form/FInput";
import { MonthPicker } from "../components/form/MonthPicker";
import { CustomSelect } from "../components/form/CustomSelect";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

/* =========================================
   1. EXPENSES TAB (รายจ่ายทั่วไป)
========================================= */
function ExpensesTab() {
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

  useEffect(() => { 
    apiGet({ action: "getExpenseMeta" }).then(d => { 
      setCategories(d.categories || []); 
      setPaymentMethods(d.paymentMethods || []); 
    }); 
  }, []);

  const loadExpenses = useCallback(() => {
    setLoading(true); setErr(null);
    apiGet({ action: "getExpenses", payMonth })
      .then(d => setExpenses(Array.isArray(d) ? d : []))
      .catch(() => setErr("โหลดรายจ่ายไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [payMonth]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleAdd = async () => {
    if (!form.category || !form.amount) return;
    setSubmitting(true); setErr(null);
    const tempId = `temp_${Date.now()}`;
    const item = { id: tempId, ...form, amount: Number(form.amount) };
    setExpenses(p => [item, ...p]);
    setForm({ date: getToday(), category: "", amount: "", payment_method: "", note: "" });
    try { 
      await apiPost({ action: "addExpense", date: item.date, category: item.category, amount: item.amount, payment_method: item.payment_method, note: item.note }); 
      loadExpenses(); 
    } catch { 
      setExpenses(p => p.filter(x => x.id !== tempId)); 
      setErr("บันทึกไม่สำเร็จ"); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("ลบรายจ่ายนี้?")) return;
    setExpenses(p => p.filter(x => x.id !== id));
    try { await apiPost({ action: "deleteExpense", id }); } catch { loadExpenses(); setErr("ลบไม่สำเร็จ"); }
  };

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <FormField label="Pay Month"><MonthPicker value={payMonth} onChange={setPayMonth} /></FormField>
      </div>
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
          <div style={{ marginTop: 14 }}>
            <Btn onClick={handleAdd} color="#10b981" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ เพิ่มรายจ่าย"}</Btn>
          </div>
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

/* =========================================
   2. FIXED TAB (รายจ่ายคงที่)
========================================= */
function FixedTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", start_date: "", end_date: "" });
  
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  
  const load = useCallback(() => { 
    setLoading(true); 
    apiGet({ action: "getFixedList" })
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false)); 
  }, []);
  
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.start_date) return;
    setSubmitting(true);
    try { 
      await apiPost({ action: "addFixedExpense", ...form }); 
      load(); 
      setForm({ name: "", amount: "", start_date: "", end_date: "" }); 
    } catch { setErr("บันทึกไม่สำเร็จ"); } 
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id) => { 
    setItems(p => p.map(x => x.id === id ? { ...x, active: !x.active } : x)); 
    try { await apiPost({ action: "toggleFixedExpense", id }); } catch { load(); } 
  };

  const handleDelete = async (id) => { 
    if (!confirm("ลบรายการนี้?")) return; 
    setItems(p => p.filter(x => x.id !== id)); 
    try { await apiPost({ action: "deleteFixedExpense", id }); } catch { load(); } 
  };

  const totalActive = items.filter(i => i.active).reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div>
      {err && <ErrMsg msg={err} />}
      <Section title="Monthly Summary">
        <KpiCard label="Total Active / Month" value={fmt(totalActive)} accent="#f59e0b" sub={`${items.filter(i => i.active).length} รายการ active`} />
      </Section>
      
      <Section title="Add Fixed Expense">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="ชื่อรายจ่าย" value={form.name} onChange={v => f("name", v)} placeholder="Internet, Rent…" required />
            <FInput label="จำนวน / เดือน (฿)" type="number" value={form.amount} onChange={v => f("amount", v)} placeholder="0" required />
            <FInput label="เริ่มต้น" type="date" value={form.start_date} onChange={v => f("start_date", v)} required />
            <FInput label="สิ้นสุด (ว่าง = ตลอดไป)" type="date" value={form.end_date} onChange={v => f("end_date", v)} />
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={handleAdd} color="#f59e0b" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ เพิ่มรายจ่ายประจำ"}</Btn>
          </div>
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

/* =========================================
   3. MAIN EXPORT (รวมหน้ารายจ่าย)
========================================= */
export default function CombinedExpensesPage() {
  const [tab, setTab] = useState("variable");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Tabs Header ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, background: "var(--bg-card)", padding: "6px", borderRadius: 12, border: "1px solid var(--border-card)", width: "fit-content" }}>
        <button onClick={() => setTab("variable")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === "variable" ? 600 : 400, background: tab === "variable" ? "rgba(16,185,129,0.15)" : "transparent", color: tab === "variable" ? "#10b981" : "var(--c-muted)", transition: "all 0.2s" }}>
          รายจ่ายทั่วไป (Expenses)
        </button>
        <button onClick={() => setTab("fixed")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === "fixed" ? 600 : 400, background: tab === "fixed" ? "rgba(245,158,11,0.15)" : "transparent", color: tab === "fixed" ? "#f59e0b" : "var(--c-muted)", transition: "all 0.2s" }}>
          รายจ่ายคงที่ (Fixed)
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "variable" ? <ExpensesTab /> : <FixedTab />}
      </div>
    </div>
  );
}
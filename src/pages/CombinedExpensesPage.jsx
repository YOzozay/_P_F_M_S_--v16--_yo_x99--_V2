import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { getPayMonth, getToday } from "../utils/dateUtils";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Btn, XBtn } from "../components/ui/Btn";
import { FormField } from "../components/form/FormField";
import { FInput } from "../components/form/FInput";
import { MonthPicker } from "../components/form/MonthPicker";
import { CustomSelect } from "../components/form/CustomSelect";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

/* =========================================
   1. EXPENSES TAB (รายจ่ายทั่วไป + รูดบัตร)
========================================= */
function ExpensesTab() {
  const [payMonth, setPayMonth] = useState(getPayMonth());
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [creditCards, setCreditCards] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  
  const [form, setForm] = useState({
    date: getToday(),
    category: "",
    amount: "",
    payment_method: "", 
    note: "",
    installment_months: "0", 
  });

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  
  const catColor = {
    Food: "#10b981", Transport: "#3b82f6", Shopping: "#a78bfa",
    Utilities: "#f59e0b", Entertainment: "#f43f5e", Health: "#34d399", Other: "var(--c-muted)",
  };

  useEffect(() => {
    apiGet({ action: "getExpenseMeta" }).then((d) => {
      setCategories(d.categories || []);
      setPaymentMethods(d.paymentMethods || []);
      setCreditCards(d.creditCards || []); 
    });
  }, []);

  const loadExpenses = useCallback(() => {
    setLoading(true); setErr(null);
    apiGet({ action: "getExpenses", payMonth })
      .then((d) => setExpenses(Array.isArray(d) ? d : []))
      .catch(() => setErr("โหลดรายจ่ายไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [payMonth]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  // ✅ เช็คสถานะการเลือกบัตรและการผ่อนชำระ
  const isCreditCardSelected = creditCards.some(c => c.id === form.payment_method);
  const isInstallment = isCreditCardSelected && Number(form.installment_months) > 0;
  
  // คำนวณยอดผ่อนต่อเดือนแบบ Real-time
  const perMonthAmount = isInstallment && Number(form.amount) > 0 
    ? (Number(form.amount) / Number(form.installment_months)) 
    : 0;

  const handleAdd = async () => {
    if (!form.amount) return;
    setSubmitting(true); setErr(null);
    
    try {
      if (isCreditCardSelected) {
        if (!form.note) { setErr("กรุณากรอกรายการ (หมายเหตุ)"); setSubmitting(false); return; }
        await apiPost({
          action: "createCreditTransaction",
          card_id: form.payment_method,
          description: form.note,
          amount: Number(form.amount),
          transaction_date: form.date,
          installment_months: Number(form.installment_months) || 0
        });
      } else {
        if (!form.category) { setErr("กรุณาเลือกหมวดหมู่"); setSubmitting(false); return; }
        await apiPost({
          action: "addExpense",
          date: form.date,
          category: form.category,
          amount: Number(form.amount),
          payment_method: form.payment_method,
          note: form.note,
        });
      }
      
      loadExpenses();
      setForm({ date: getToday(), category: "", amount: "", payment_method: "", note: "", installment_months: "0" });
    } catch {
      setErr("บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("ลบรายจ่ายนี้?")) return;
    setExpenses((p) => p.filter((x) => x.id !== id));
    try { await apiPost({ action: "deleteExpense", id }); } 
    catch { loadExpenses(); setErr("ลบไม่สำเร็จ"); }
  };

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const paymentOptions = [
    ...paymentMethods.map(p => ({ value: p, label: p })),
    ...(creditCards.length > 0 ? [{ value: "", label: "--- บัตรเครดิต ---", disabled: true }] : []),
    ...creditCards.map(c => ({ value: c.id, label: `💳 ${c.name}` }))
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <FormField label="Pay Month">
          <MonthPicker value={payMonth} onChange={setPayMonth} />
        </FormField>
      </div>
      {err && <ErrMsg msg={err} />}

      <Section title="Add Expense / Transaction">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="วันที่" type="date" value={form.date} onChange={(v) => f("date", v)} required />
            
            {/* ✅ เปลี่ยนชื่อ Label ให้ชัดเจน ถ้าระบุว่าผ่อน */}
            <FInput 
              label={isInstallment ? "ราคาสินค้ารวม (฿)" : "จำนวน (฿)"} 
              type="number" 
              value={form.amount} 
              onChange={(v) => f("amount", v)} 
              placeholder="0" 
              required 
            />
            
            <FormField label="วิธีชำระ" required>
              <CustomSelect value={form.payment_method} onChange={(v) => f("payment_method", v)} options={paymentOptions} placeholder="เลือกวิธีชำระ" />
            </FormField>

            {!isCreditCardSelected && (
              <FormField label="หมวดหมู่" required>
                <CustomSelect value={form.category} onChange={(v) => f("category", v)} options={categories.map(c => ({value: c, label: c}))} placeholder="เลือกหมวด" />
              </FormField>
            )}

            <div style={{ gridColumn: isCreditCardSelected ? "span 1" : "span 2" }}>
              <FInput label={isCreditCardSelected ? "รายการ (จำเป็น)" : "หมายเหตุ (Optional)"} value={form.note} onChange={(v) => f("note", v)} placeholder={isCreditCardSelected ? "เช่น ค่าน้ำมัน, โทรศัพท์" : "Optional"} required={isCreditCardSelected} />
            </div>

            {/* ✅ ช่องแบ่งผ่อน พร้อมกล่องโชว์ยอดคำนวณ */}
            {isCreditCardSelected && (
              <div style={{ gridColumn: "span 2", display: "flex", gap: "12px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <FInput 
                    label="แบ่งผ่อน (เดือน) *ใส่ 0 ถ้ารูดเต็ม*" 
                    type="number" 
                    value={form.installment_months} 
                    onChange={(v) => f("installment_months", v)} 
                    placeholder="0" 
                  />
                </div>
                {/* กล่องสรุปยอดผ่อนต่อเดือน โผล่มาเมื่อกรอกจำนวนเดือน */}
                {isInstallment && (
                  <div style={{ flex: 1, padding: "10px 14px", background: "rgba(59,130,246,0.1)", borderRadius: "8px", border: "1px solid rgba(59,130,246,0.3)" }}>
                    <div style={{ fontSize: 11, color: "var(--c-secondary)", fontWeight: 600 }}>ตกยอดผ่อนชำระ</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#3b82f6", fontFamily: "'DM Mono', monospace" }}>
                      {fmt(perMonthAmount.toFixed(2))} ฿ / งวด
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={handleAdd} color={isCreditCardSelected ? "#3b82f6" : "#10b981"} disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : (isCreditCardSelected ? "+ บันทึกรูดบัตร" : "+ เพิ่มรายจ่าย")}
            </Btn>
          </div>
        </Card>
      </Section>

      <Section title={`รายการเดือนนี้ · รวม ${fmt(total)}`}>
        {loading ? <Loading /> : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {expenses.length === 0 ? (
              <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ไม่มีรายการในช่วงนี้</div>
            ) : (
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
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "var(--color-expense)" }}>{fmt(total)}</span>
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
  const [form, setForm] = useState({ name: "", amount: "", start_date: "", end_date: "", });

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    setLoading(true);
    apiGet({ action: "getFixedList" }).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => setErr("โหลดไม่สำเร็จ")).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.start_date) return;
    setSubmitting(true);
    try {
      await apiPost({ action: "addFixedExpense", ...form });
      load(); setForm({ name: "", amount: "", start_date: "", end_date: "" });
    } catch { setErr("บันทึกไม่สำเร็จ"); } finally { setSubmitting(false); }
  };

  const handleToggle = async (id) => {
    setItems((p) => p.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
    try { await apiPost({ action: "toggleFixedExpense", id }); } catch { load(); }
  };

  const handleDelete = async (id) => {
    if (!confirm("ลบรายการนี้?")) return;
    setItems((p) => p.filter((x) => x.id !== id));
    try { await apiPost({ action: "deleteFixedExpense", id }); } catch { load(); }
  };

  const totalActive = items.filter((i) => i.active).reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div>
      {err && <ErrMsg msg={err} />}
      <Section title="Monthly Summary">
        <KpiCard label="Total Active / Month" value={fmt(totalActive)} accent="#f59e0b" sub={`${items.filter((i) => i.active).length} รายการ active`} />
      </Section>

      <Section title="Add Fixed Expense">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="ชื่อรายจ่าย" value={form.name} onChange={(v) => f("name", v)} placeholder="Internet, Rent…" required />
            <FInput label="จำนวน / เดือน (฿)" type="number" value={form.amount} onChange={(v) => f("amount", v)} placeholder="0" required />
            <FInput label="เริ่มต้น" type="date" value={form.start_date} onChange={(v) => f("start_date", v)} required />
            <FInput label="สิ้นสุด (ว่าง = ตลอดไป)" type="date" value={form.end_date} onChange={(v) => f("end_date", v)} />
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={handleAdd} color="#f59e0b" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ เพิ่มรายจ่ายประจำ"}</Btn>
          </div>
        </Card>
      </Section>

      <Section title="Fixed Expenses List">
        {loading ? <Loading /> : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {items.length === 0 ? (
              <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีรายการ</div>
            ) : (
              items.map((item, i) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", padding: "13px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center", gap: 12, opacity: item.active ? 1 : 0.45 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)" }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: "var(--c-subtle)", marginTop: 2 }}>ตั้งแต่ {item.start_date} {item.end_date ? ` ถึง ${item.end_date}` : " — ตลอดไป"}</div>
                  </div>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: item.active ? "#f59e0b" : "var(--c-subtle)", fontSize: 13 }}>{fmt(item.amount)}</span>
                  <button onClick={() => handleToggle(item.id)} style={{ background: item.active ? "rgba(16,185,129,0.1)" : "var(--border-subtle)", border: `1px solid ${item.active ? "rgba(16,185,129,0.3)" : "var(--border-input)"}`, borderRadius: 6, padding: "4px 10px", color: item.active ? "#10b981" : "var(--c-muted)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{item.active ? "Active" : "Inactive"}</button>
                  <XBtn onClick={() => handleDelete(item.id)} />
                </div>
              ))
            )}
            {items.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--border-card)" }}>
                <span style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600 }}>รวม Active / เดือน</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#f59e0b" }}>{fmt(totalActive)}</span>
              </div>
            )}
          </Card>
        )}
      </Section>
    </div>
  );
}

/* =========================================
   3. INSTALLMENTS TAB (รายการผ่อน)
========================================= */
function InstallmentsTab() {
  const [rawList, setRawList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(() => { 
    setLoading(true); 
    apiGet({ action: "getInstallments" })
      .then(d => setRawList(Array.isArray(d) ? d : []))
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false)); 
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = Object.values(rawList.reduce((acc, inst) => { 
    const txId = inst.transaction_id; 
    if (!acc[txId]) acc[txId] = { transaction_id: txId, description: inst.description, card_name: inst.card_name, months: inst.months, total_amount: inst.total_amount, installments: [] }; 
    acc[txId].installments.push(inst); 
    return acc; 
  }, {}));

  const handleCancel = async (txId) => { 
    if (!confirm("ยกเลิก transaction นี้?")) return; 
    try { await apiPost({ action: "cancelCreditTransaction", transaction_id: txId }); load(); } 
    catch (e) { setErr(e.message || "ยกเลิกไม่สำเร็จ"); } 
  };

  const handlePayNext = async (group) => {
    const next = group.installments.find(i => i.status === "unpaid");
    if (!next) return;
    if (!confirm(`จ่ายงวดที่ ${next.installment_no} — ${fmt(next.amount)}\nDue: ${next.due_date}`)) return;
    try { await apiPost({ action: "payCreditInstallment", installment_id: next.id }); load(); } 
    catch (e) { setErr(e.message || "ชำระไม่สำเร็จ"); }
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

/* =========================================
   4. MAIN EXPORT (รวมหน้า 3 Tabs)
========================================= */
export default function CombinedExpensesPage() {
  const [tab, setTab] = useState("variable");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Tabs Header ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, background: "var(--bg-card)", padding: "6px", borderRadius: 12, border: "1px solid var(--border-card)", width: "fit-content", flexWrap: "wrap" }}>
        <button onClick={() => setTab("variable")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === "variable" ? 600 : 400, background: tab === "variable" ? "rgba(16,185,129,0.15)" : "transparent", color: tab === "variable" ? "#10b981" : "var(--c-muted)", transition: "all 0.2s" }}>
          รายจ่ายทั่วไป & รูดบัตร (Expenses)
        </button>
        <button onClick={() => setTab("fixed")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === "fixed" ? 600 : 400, background: tab === "fixed" ? "rgba(245,158,11,0.15)" : "transparent", color: tab === "fixed" ? "#f59e0b" : "var(--c-muted)", transition: "all 0.2s" }}>
          บิลประจำ (Fixed)
        </button>
        <button onClick={() => setTab("installments")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === "installments" ? 600 : 400, background: tab === "installments" ? "rgba(59,130,246,0.15)" : "transparent", color: tab === "installments" ? "#3b82f6" : "var(--c-muted)", transition: "all 0.2s" }}>
          รายการผ่อน & หนี้บัตร (Installments)
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "variable" && <ExpensesTab />}
        {tab === "fixed" && <FixedTab />}
        {tab === "installments" && <InstallmentsTab />}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { getToday } from "../utils/dateUtils";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { Btn } from "../components/ui/Btn";
import { FormField } from "../components/form/FormField";
import { FInput } from "../components/form/FInput";
import { CustomSelect } from "../components/form/CustomSelect";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

/* =========================================
   1. CREDIT CARDS TAB (บัตรเครดิต)
========================================= */
function CreditCardsTab() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [statements, setStatements] = useState({});
  const [err, setErr] = useState(null);
  
  const [cardForm, setCardForm] = useState({ name: "", credit_limit: "", closing_day: "", due_day: "" });
  const [txForm, setTxForm] = useState({ card_id: "", description: "", amount: "", transaction_date: getToday(), installment_months: "0" });
  
  const fc = (k, v) => setCardForm(p => ({ ...p, [k]: v }));
  const ft = (k, v) => setTxForm(p => ({ ...p, [k]: v }));
  
  const load = useCallback(() => { 
    setLoading(true); 
    apiGet({ action: "getCreditSummary" })
      .then(d => {
        const validCards = Array.isArray(d) ? d.filter(c => c.name && String(c.name).trim() !== "") : [];
        setCards(validCards);
      })
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false)); 
  }, []);
  
  useEffect(() => { load(); }, [load]);
  
  const toggleStatement = async (cardId) => {
    if (selectedCard === cardId) { setSelectedCard(null); return; }
    setSelectedCard(cardId);
    if (!statements[cardId]) { 
      const now = new Date(); 
      const stmt = await apiGet({ action: "getCreditStatement", card_id: cardId, year: now.getFullYear(), month: now.getMonth() + 1 }); 
      setStatements(p => ({ ...p, [cardId]: stmt })); 
    }
  };
  
  const handleCreateCard = async () => { 
    if (!cardForm.name || !cardForm.credit_limit) return; 
    try { 
      await apiPost({ action: "createCreditCard", ...cardForm }); 
      load(); 
      setCardForm({ name: "", credit_limit: "", closing_day: "", due_day: "" }); 
    } catch (e) { setErr(e.message || "สร้างบัตรไม่สำเร็จ"); } 
  };
  
  const handleCreateTx = async () => { 
    if (!txForm.card_id || !txForm.description || !txForm.amount) return; 
    try { 
      await apiPost({ action: "createCreditTransaction", ...txForm, installment_months: Number(txForm.installment_months) || 0 }); 
      load(); 
      setTxForm({ card_id: "", description: "", amount: "", transaction_date: getToday(), installment_months: "0" }); 
    } catch (e) { setErr(e.message || "บันทึก transaction ไม่สำเร็จ"); } 
  };

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
            <FormField label="บัตร" required>
              <CustomSelect value={txForm.card_id} onChange={v => ft("card_id", v)} options={cards.map(c => ({ value: c.card_id, label: c.name }))} placeholder="เลือกบัตร" />
            </FormField>
            <FInput label="วันที่" type="date" value={txForm.transaction_date} onChange={v => ft("transaction_date", v)} required />
            <FInput label="รายการ" value={txForm.description} onChange={v => ft("description", v)} placeholder="รายการ" required />
            <FInput label="จำนวน (฿)" type="number" value={txForm.amount} onChange={v => ft("amount", v)} placeholder="0" required />
            <div style={{ gridColumn: "span 2" }}>
              <FInput label="แบ่งผ่อน (0 = จ่ายเต็ม)" type="number" value={txForm.installment_months} onChange={v => ft("installment_months", v)} placeholder="0" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}><Btn onClick={handleCreateTx} color="#3b82f6">+ บันทึก Transaction</Btn></div>
        </Card>
      </Section>
    </div>
  );
}

/* =========================================
   2. INSTALLMENTS TAB (รายการผ่อน)
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
   3. MAIN EXPORT (รวมหน้าบัตรเครดิต & ผ่อน)
========================================= */
export default function CombinedCreditPage() {
  const [tab, setTab] = useState("cards");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Tabs Header ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, background: "var(--bg-card)", padding: "6px", borderRadius: 12, border: "1px solid var(--border-card)", width: "fit-content" }}>
        <button onClick={() => setTab("cards")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === "cards" ? 600 : 400, background: tab === "cards" ? "rgba(96,165,250,0.15)" : "transparent", color: tab === "cards" ? "#60a5fa" : "var(--c-muted)", transition: "all 0.2s" }}>
          บัตรเครดิต (Cards)
        </button>
        <button onClick={() => setTab("installments")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === "installments" ? 600 : 400, background: tab === "installments" ? "rgba(167,139,250,0.15)" : "transparent", color: tab === "installments" ? "#a78bfa" : "var(--c-muted)", transition: "all 0.2s" }}>
          รายการผ่อน (Installments)
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "cards" ? <CreditCardsTab /> : <InstallmentsTab />}
      </div>
    </div>
  );
}
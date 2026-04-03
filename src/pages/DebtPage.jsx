import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { KpiCard } from "../components/ui/KpiCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { Btn } from "../components/ui/Btn";
import { FInput } from "../components/form/FInput";

import { PayModal } from "../components/shared/PayModal";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

export default function DebtPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", due_date: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr] = useState(null);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    apiGet({ action: "getDebts" })
      .then(d => setDebts(Array.isArray(d) ? d : []))
      .catch(() => setErr("โหลดหนี้สินไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.name || !form.amount) return;
    setSubmitting(true); setErr(null);
    try {
      await apiPost({ action: "addDebt", ...form });
      setForm({ name: "", amount: "", due_date: "", note: "" });
      load();
    } catch { setErr("บันทึกไม่สำเร็จ"); }
    finally { setSubmitting(false); }
  };

  const confirmPay = async (amount) => {
    if (!payModal) return;
    const debt = payModal;
    if (!amount || amount <= 0) { setPayErr("จำนวนไม่ถูกต้อง"); return; }
    setPayLoading(true); setPayErr(null);
    try {
      const res = await apiPost({ action: "payDebt", id: debt.id, amount });
      if (res.error) { setPayErr(res.error); return; }
      setPayModal(null);
      load();
    } catch { setPayErr("ชำระไม่สำเร็จ"); }
    finally { setPayLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("ลบหนี้สินก้อนนี้?")) return;
    try { await apiPost({ action: "deleteDebt", id }); load(); }
    catch { setErr("ลบไม่สำเร็จ"); }
  };

  const activeDebts = debts.filter(d => d.status !== "closed");
  const totalDebt = activeDebts.reduce((s, d) => s + (Number(d.remaining_amount) || 0), 0);

  return (
    <div>
      {err && <ErrMsg msg={err} />}
      {payModal && (
        <PayModal loan={payModal} onClose={() => setPayModal(null)} onConfirm={confirmPay} loading={payLoading} err={payErr} />
      )}
      
      <Section title="ภาพรวมหนี้สิน (ไม่รวมงวดรถ/บ้าน)">
        <KpiCard label="ยอดหนี้คงเหลือรวม" value={fmt(totalDebt)} accent="#f43f5e" sub={`${activeDebts.length} รายการ`} />
      </Section>

      <Section title="เพิ่มหนี้สินก้อนใหม่">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="ชื่อ/เจ้าหนี้ *" value={form.name} onChange={v => f("name", v)} placeholder="เช่น ยืมเพื่อน, กยศ." required />
            <FInput label="ยอดหนี้ (฿) *" type="number" value={form.amount} onChange={v => f("amount", v)} placeholder="0" required />
            <FInput label="วันครบกำหนด" type="date" value={form.due_date} onChange={v => f("due_date", v)} />
            <FInput label="หมายเหตุ" value={form.note} onChange={v => f("note", v)} placeholder="Optional" />
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={handleAdd} color="#f43f5e" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ เพิ่มหนี้สิน"}</Btn>
          </div>
        </Card>
      </Section>

      <Section title="รายการหนี้สิน">
        {loading ? <Loading /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {debts.length === 0 ? <Card style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ไม่มีรายการหนี้สิน</Card> : 
              debts.map(d => {
                const totalAmt = Number(d.amount) || 0;
                const remaining = Number(d.remaining_amount) || 0;
                const paid = totalAmt - remaining;
                const pct = totalAmt > 0 ? (paid / totalAmt) * 100 : 0;
                const closed = d.status === "closed";
                
                return (
                  <Card key={d.id} style={{ padding: "20px 22px", opacity: closed ? 0.6 : 1, borderColor: closed ? "rgba(16,185,129,0.3)" : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>{d.name}</span>
                          {closed && <Badge text="ชำระครบ" color="#10b981" />}
                        </div>
                        {d.due_date && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>ครบกำหนด {d.due_date}</div>}
                        {d.note && <div style={{ fontSize: 11, color: "var(--c-subtle)", marginTop: 2 }}>{d.note}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "var(--c-muted)", marginBottom: 3 }}>ยอดคงเหลือ</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 18, color: closed ? "var(--c-subtle)" : "#f87171" }}>{fmt(remaining)}</div>
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={closed ? "#10b981" : pct > 70 ? "#10b981" : pct > 40 ? "#f59e0b" : "#f43f5e"} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11 }}>
                      <span style={{ color: "var(--c-subtle)" }}>ชำระแล้ว {pct.toFixed(1)}% · {fmt(paid)}</span>
                      <span style={{ color: "var(--c-muted)" }}>รวม {fmt(totalAmt)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                      <Btn onClick={() => handleDelete(d.id)} color="#f43f5e" small>ลบ</Btn>
                      {!closed && <Btn onClick={() => { setPayErr(null); setPayModal({ ...d, monthly_due: 0 }); }} color="#f43f5e" small>💳 ชำระคืน</Btn>}
                    </div>
                  </Card>
                );
              })
            }
          </div>
        )}
      </Section>
    </div>
  );
}
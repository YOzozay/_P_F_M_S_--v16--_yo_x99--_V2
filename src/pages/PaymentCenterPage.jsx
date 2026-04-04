import React, { useState, useEffect, useCallback } from "react";
import { apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { KpiCard } from "../components/ui/KpiCard";
import { Btn } from "../components/ui/Btn";

import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

export default function PaymentCenterPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [paidCount, setPaidCount] = useState(0);
  const [err, setErr] = useState(null);
  const today = new Date();

  const load = useCallback(() => { 
    setLoading(true); setErr(null); 
    apiPost({ action: "getDuePayments" })
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false)); 
  }, []);

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
    } catch (e) { setErr(e.message || "ชำระไม่สำเร็จ"); } 
    finally { setProcessingId(null); }
  };

  const typeColor = { debt:"#f43f5e",installment:"#3b82f6",fixed:"#f59e0b",credit:"#a78bfa",car_loan:"#3b82f6",home_loan:"#a78bfa" };
  const typeLabel = { debt:"Debt",installment:"ผ่อน",fixed:"Fixed",credit:"Credit",car_loan:"รถ",home_loan:"บ้าน" };
  const totalDue = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div>
      <Section title="Due This Month">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <KpiCard label="รายการทั้งหมด" value={`${items.length} รายการ`} accent="#60a5fa" />
          <KpiCard label="ยอดรวมที่ต้องจ่าย" value={fmt(totalDue)} accent="var(--color-expense)" />
          <KpiCard label="ชำระแล้วเดือนนี้" value={`${paidCount} รายการ`} accent="var(--color-income)" />
        </div>
      </Section>
      <Section title="Payment Queue">
        {loading ? <Loading /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {err && <ErrMsg msg={err} />}
            {items.length === 0 && <Card style={{ padding: "32px", textAlign: "center" }}><div style={{ fontSize: 22, marginBottom: 8 }}>✓</div><div style={{ color: "var(--color-income)", fontWeight: 600, fontSize: 14 }}>ชำระครบทุกรายการแล้ว!</div></Card>}
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
                    <Btn onClick={() => handlePay(item)} color="var(--color-income)" small disabled={processingId === key}>{processingId === key ? "กำลังชำระ..." : "ชำระ"}</Btn>
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
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { getPayMonth, MON } from "../utils/dateUtils";
import { calcLoanInstallment } from "../utils/loanUtils";

import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { Section } from "../components/ui/Section";
import { Btn, XBtn } from "../components/ui/Btn";

import { FormField } from "../components/form/FormField";
import { MonthPicker } from "../components/form/MonthPicker";

import { PayModal } from "../components/shared/PayModal";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

export default function DashboardPage() {
  const [payMonth, setPayMonth]     = useState(getPayMonth());
  const [summary, setSummary]       = useState(null);
  const [upcoming, setUpcoming]     = useState([]);
  const [loans, setLoans]           = useState({ car: [], home: [] });
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState(null);
  
  const [loanPayModal, setLoanPayModal] = useState(null);
  const [loanPayLoading, setLoanPayLoading] = useState(false);
  const [loanPayErr, setLoanPayErr] = useState(null);
  
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [payingUpcoming, setPayingUpcoming] = useState(null);
  
  // ✅ ใช้ State เก็บ ID ของกลุ่มที่ถูกเลือก เพื่อนำไปเปิด Popup รายการย่อย
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const today = new Date();

  const loadDashboard = useCallback(() => {
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

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ✅ ฟังก์ชันปุ่มกดจ่ายของฝั่ง Upcoming
  const handlePayUpcoming = async (item) => {
    if (!confirm(`ยืนยันว่าชำระ "${item.description || item.card_name}" งวดวันที่ ${item.due_date} ยอด ${fmt(item.amount)} เรียบร้อยแล้ว?`)) return;
    setPayingUpcoming(item.id);
    try {
      await apiPost({ action: "payCreditInstallment", installment_id: item.id });
      const [newSummary, newUpcoming] = await Promise.all([
        apiGet({ action: "summary", payMonth }),
        apiGet({ action: "getUpcomingInstallments" })
      ]);
      if (!newSummary.error) setSummary(newSummary);
      setUpcoming(Array.isArray(newUpcoming) ? newUpcoming : []);
    } catch (e) {
      alert("ชำระไม่สำเร็จ: " + (e.message || "ลองไปตรวจสอบในหน้า Payment Center ดูอีกครั้งนะครับ"));
    } finally {
      setPayingUpcoming(null);
    }
  };

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

  const groupedUpcoming = upcoming.reduce((acc, item) => {
    const key = item.transaction_id || `${item.card_name}_${item.description}`;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        card_name: item.card_name,
        description: item.description,
        items: [],
        total_amount_left: 0
      };
    }
    acc[key].items.push(item);
    acc[key].total_amount_left += Number(item.amount) || 0;
    return acc;
  }, {});
  
  const groupedList = Object.values(groupedUpcoming);
  
  // ✅ ดึงข้อมูลของกลุ่มที่ผู้ใช้กดดูรายการย่อย
  const activeGroup = selectedGroupId ? groupedList.find(g => g.id === selectedGroupId) : null;

  return (
    <div>
      {/* Modal ชำระงวดรถ/บ้าน */}
      {loanPayModal && (
        <PayModal loan={loanPayModal} onClose={() => setLoanPayModal(null)} onConfirm={confirmLoanPay} loading={loanPayLoading} err={loanPayErr} />
      )}

      {/* ── ✅ Modal ป๊อปอัป "ดูรายการย่อย" ของ Upcoming ── */}
      {activeGroup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9010, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setSelectedGroupId(null); }}>
          <div style={{ background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 18, padding: "20px 24px", width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)" }}>{activeGroup.description || activeGroup.card_name}</div>
                <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 4 }}>
                  {activeGroup.card_name} · รอจ่ายอีก {activeGroup.items.length} งวด
                </div>
              </div>
              <XBtn onClick={() => setSelectedGroupId(null)} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeGroup.items.map((item) => {
                const itemDiff = item.due_date ? Math.ceil((new Date(item.due_date) - today) / 86400000) : null;
                const isPaying = payingUpcoming === item.id;
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--bg-kpi)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>Due {item.due_date}</div>
                      {itemDiff !== null && <div style={{ fontSize: 10, color: itemDiff <= 7 ? "#f87171" : "var(--c-subtle)", marginTop: 4, fontWeight: 600 }}>{itemDiff > 0 ? `อีก ${itemDiff} วัน` : "วันนี้!"}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>{fmt(item.amount)}</span>
                      {/* ✅ ปุ่มกดจ่าย สามารถทำงานได้ทันทีเมื่อกด */}
                      <Btn small onClick={() => handlePayUpcoming(item)} color="#f59e0b" disabled={isPaying}>
                        {isPaying ? "..." : "รอชำระ"}
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", fontSize: 12 }}>
              <span style={{ color: "var(--c-muted)" }}>ยอดคงเหลือรวม</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "var(--c-heading)" }}>{fmt(activeGroup.total_amount_left)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Modal ดูแผนการผ่อนทั้งหมด ── */}
      {showAllUpcoming && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setShowAllUpcoming(false); }}>
          <div style={{ background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 18, padding: "20px", width: "100%", maxWidth: 460, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>📅 แผนการผ่อนทั้งหมด</div>
              <XBtn onClick={() => setShowAllUpcoming(false)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {groupedList.map(group => (
                <Card key={`popup-${group.id}`} style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>{group.description || group.card_name}</div>
                      <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2 }}>{group.card_name} · รอจ่ายอีก {group.items.length} งวด</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "var(--c-heading)" }}>{fmt(group.total_amount_left)}</div>
                      </div>
                      <Btn small onClick={() => setSelectedGroupId(group.id)} color="#60a5fa">
                        ดูรายการย่อย
                      </Btn>
                    </div>
                  </div>
                </Card>
              ))}
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

            {allActiveLoans.length > 0 && (
              <Section title="งวดรถ & งวดบ้าน">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allActiveLoans.map(loan => {
                    const totalAmt = Number(loan.total_amount) || 0;
                    const rem      = Number(loan.remaining_amount) || 0;
                    const paid     = totalAmt - rem;
                    const pct      = totalAmt > 0 ? (paid / totalAmt) * 100 : 0;
                    const inst     = calcLoanInstallment(loan);
                    return (
                      <Card key={loan.id} style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14 }}>{loan._icon}</span>
                              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>{loan.name}</span>
                              <Badge text={loan._type === "car_loan" ? "รถ" : "บ้าน"} color={loan._color} />
                              {inst && <Badge text={`จ่ายแล้ว ${inst.paid}/${inst.total} งวด`} color={loan._color} />}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--c-subtle)" }}>
                              {loan.lender}
                              {inst && <span style={{ color: loan._color, marginLeft: 6, fontWeight: 600 }}>· เหลือ {inst.remaining} งวด</span>}
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
                            💳 ชำระงวดที่ {inst?.next} ({fmt(loan.monthly_due)})
                          </Btn>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section title="Upcoming Payments">
              {groupedList.length === 0 ? (
                <Card style={{ padding: "20px 18px" }}>
                  <span style={{ fontSize: 12, color: "var(--c-subtle)" }}>ไม่มีรายการที่ใกล้ครบกำหนด</span>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  
                  {groupedList.slice(0, 3).map(group => {
                    const nextItem = group.items[0];
                    const diff = nextItem.due_date ? Math.ceil((new Date(nextItem.due_date) - today) / 86400000) : null;
                    const urgent = diff !== null && diff <= 7;
                    
                    return (
                      <Card key={group.id} style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10, borderColor: urgent ? "rgba(244,63,94,0.3)" : undefined }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: urgent ? "#f87171" : "var(--c-text)" }}>{group.description || group.card_name}</div>
                            <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2 }}>
                              {group.card_name} · รอจ่ายอีก {group.items.length} งวด
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "var(--c-heading)" }}>{fmt(group.total_amount_left)}</div>
                              <div style={{ fontSize: 10, color: "var(--c-subtle)", marginTop: 2 }}>ยอดรวมที่เหลือ</div>
                            </div>
                            <Btn small onClick={() => setSelectedGroupId(group.id)} color="#60a5fa">
                              ดูรายการย่อย
                            </Btn>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  
                  {groupedList.length > 3 && (
                    <button onClick={() => setShowAllUpcoming(true)} style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 10, padding: "10px", color: "#60a5fa", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%", marginTop: 4, transition: "background 0.2s" }}>
                      ดูแผนการผ่อนอื่นๆ อีก {groupedList.length - 3} รายการ
                    </button>
                  )}
                </div>
              )}
            </Section>
            
          </>
        );
      })()}
    </div>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";
import { getPayMonth, MON } from "../utils/dateUtils";
import { calcLoanInstallment } from "../utils/loanUtils";

import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { Btn, XBtn } from "../components/ui/Btn";
import { MonthPicker } from "../components/form/MonthPicker";
import { PayModal } from "../components/shared/PayModal";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";
import { uiTokens } from "../styles/tokens";

/* ──────────────────────────────────────────────────────────────────────────
   1. CUSTOM CONFIRM MODAL (สำหรับบัตรเครดิต และ บิลประจำ)
────────────────────────────────────────────────────────────────────────── */
function ConfirmActionModal({ title, subtitle, amount, onConfirm, onClose, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-picker)", borderRadius: 18, padding: "24px", width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)", marginBottom: 4 }}>💳 ยืนยันการชำระ</div>
          <div style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "var(--c-muted)", fontWeight: 600, textTransform: "uppercase" }}>ยอดที่ต้องชำระ (฿)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--c-heading)", fontFamily: "'DM Mono'" }}>{fmt(amount)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn onClick={onClose} color="#ed5c5c">ยกเลิก</Btn>
          <Btn onClick={onConfirm} color="#10b981" disabled={loading}>{loading ? "กำลังชำระ..." : "ยืนยันชำระ"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   2. MAIN DASHBOARD PAGE
────────────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [payMonth, setPayMonth]     = useState(getPayMonth());
  const [summary, setSummary]       = useState(null);
  const [upcoming, setUpcoming]     = useState([]);
  const [loans, setLoans]           = useState({ car: [], home: [] });
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState(null);
  const [showBalance, setShowBalance] = useState(false);

  // ── Track ว่างวดไหนจ่ายแล้วในเดือนนี้ (key = `${payMonth}__${id}`)
  const [paidLoanKeys,   setPaidLoanKeys]   = useState(new Set());
  const [paidCreditKeys, setPaidCreditKeys] = useState(new Set());

  const [loanPayModal, setLoanPayModal] = useState(null);
  const [creditPayConfirm, setCreditPayConfirm] = useState(null);
  const [fixedPayConfirm, setFixedPayConfirm] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const mask = (val) => (showBalance ? val : "****");

  // helper: key ที่ใช้ระบุ "จ่ายแล้วรอบเดือนนี้"
  const loanPaidKey   = (id) => `${payMonth}__${id}`;
  const isLoanPaid    = (id) => paidLoanKeys.has(loanPaidKey(id));
  const isCreditPaid  = (id) => paidCreditKeys.has(`${payMonth}__${id}`);

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
      setLoans({ car: car || [], home: home || [] });
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [payMonth]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const confirmLoanPay = async (payload) => {
    if (!loanPayModal) return;
    setActionLoading(true);
    try {
      const data = typeof payload === "object"
        ? { action: "payLoan", loan_id: loanPayModal.id, loan_type: loanPayModal._type, ...payload }
        : { action: "payLoan", loan_id: loanPayModal.id, loan_type: loanPayModal._type, amount: payload };
      await apiPost(data);

      // ── Mark ว่างวดนี้จ่ายแล้วสำหรับเดือน payMonth
      setPaidLoanKeys(prev => new Set([...prev, loanPaidKey(loanPayModal.id)]));

      setLoanPayModal(null);
      loadDashboard();
    } catch { alert("ชำระไม่สำเร็จ"); } finally { setActionLoading(false); }
  };

  const handleConfirmCreditPay = async () => {
    if (!creditPayConfirm) return;
    setActionLoading(true);
    try {
      await apiPost({ action: "payCreditInstallment", installment_id: creditPayConfirm.id });

      // ── Mark ว่า group นี้จ่ายแล้วรอบเดือน payMonth
      if (creditPayConfirm._groupId) {
        setPaidCreditKeys(prev => new Set([...prev, `${payMonth}__${creditPayConfirm._groupId}`]));
      }

      setCreditPayConfirm(null); loadDashboard();
    } catch { alert("ชำระไม่สำเร็จ"); } finally { setActionLoading(false); }
  };

  const handleConfirmFixedPay = async () => {
    if (!fixedPayConfirm) return;
    setActionLoading(true);
    try {
      await apiPost({ action: "payFixedExpense", id: fixedPayConfirm.id, name: fixedPayConfirm.name, amount: fixedPayConfirm.amount });
      setFixedPayConfirm(null); loadDashboard();
    } catch { alert("ชำระไม่สำเร็จ"); } finally { setActionLoading(false); }
  };

  if (loading) return <Loading />;
  if (err) return <ErrMsg msg={err} />;

  const s = summary;
  // const cycleStart = new Date(s.period.startDate);
  // const cycleEnd   = new Date(s.period.endDate);
// แก้แล้ว — ใช้ calendar month ของ payMonth แทน cycle window
   const [pmYear, pmMonth] = payMonth.split("-").map(Number); // เช่น 2026, 4
   
   const groupedUpcoming = upcoming.reduce((acc, item) => {
     const key = item.transaction_id || `${item.card_name}_${item.description}`;
     if (!acc[key]) acc[key] = { id: key, card_name: item.card_name, description: item.description, items: [], totalInCycle: 0, currentMonthItem: null };
     acc[key].items.push(item);
   const due = new Date(item.due_date);
   if (due >= cycleStart && due <= cycleEnd) {   // ← due 25 เม.ย. ไม่ผ่าน condition นี้
     acc[key].totalInCycle += Number(item.amount);  // ← เลยไม่ถูกบวก → totalInCycle = 0
     acc[key].currentMonthItem = item;
   }
     return acc;
   }, {});

  const listToShowOnDashboard = Object.values(groupedUpcoming).filter(g => g.totalInCycle > 0);
  const activeGroup = selectedGroupId ? groupedUpcoming[selectedGroupId] : null;

  const activeLoans = [
    ...loans.car.map(l => ({ ...l, _type: "car_loan", _color: "#3b82f6", _label: "รถ" })),
    ...loans.home.map(l => ({ ...l, _type: "home_loan", _color: "#a78bfa", _label: "บ้าน" }))
  ].filter(l => l.status !== "closed");

  const totalVariable   = s.expenses.variable.total || 0;
  const totalFixed      = s.expenses.fixed.total || 0;

  // ── คำนวณเฉพาะงวดที่ยังไม่ได้จ่ายในเดือนนี้
  const totalLoanDues   = activeLoans
    .filter(l => !isLoanPaid(l.id))
    .reduce((acc, curr) => acc + (Number(curr.monthly_due) || 0), 0);

  // ── คำนวณเฉพาะ group ที่ยังไม่ได้จ่ายในเดือนนี้
  const totalCreditDues = listToShowOnDashboard
    .filter(g => !isCreditPaid(g.id))
    .reduce((acc, curr) => acc + curr.totalInCycle, 0);

  const totalProjectedExpenses = totalVariable + totalFixed + totalLoanDues + totalCreditDues;
  const estimatedBalance       = s.netIncome - totalProjectedExpenses;

  // burnPct ยังคำนวณไว้ แต่ไม่แสดง UI (ไม่กระทบฟังก์ชันอื่น)
  const burnPct = s.netIncome > 0 ? (totalProjectedExpenses / s.netIncome) * 100 : 0; // eslint-disable-line no-unused-vars

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}>
      {/* Modals */}
      {loanPayModal && <PayModal loan={loanPayModal} onClose={() => setLoanPayModal(null)} onConfirm={confirmLoanPay} loading={actionLoading} />}
      {creditPayConfirm && <ConfirmActionModal title={creditPayConfirm.description} subtitle={creditPayConfirm.card_name} amount={creditPayConfirm.amount} onClose={() => setCreditPayConfirm(null)} onConfirm={handleConfirmCreditPay} loading={actionLoading} />}
      {fixedPayConfirm && <ConfirmActionModal title={fixedPayConfirm.name} subtitle="บิลประจำรายเดือน" amount={fixedPayConfirm.amount} onClose={() => setFixedPayConfirm(null)} onConfirm={handleConfirmFixedPay} loading={actionLoading} />}

      {/* Popup รายละเอียดงวดบัตร */}
      {activeGroup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9010, display: "flex", alignItems: "center", justifyContent: "center", padding: 15 }} onClick={e => e.target === e.currentTarget && setSelectedGroupId(null)}>
          <div style={{ background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 18, padding: "20px", width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)" }}>{activeGroup.description}</div>
                <div style={{ fontSize: 12, color: "var(--c-secondary)", fontWeight: 600, marginTop: 4 }}>{activeGroup.card_name}</div>
              </div>
              <XBtn onClick={() => setSelectedGroupId(null)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeGroup.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-kpi)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Due {item.due_date}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "'DM Mono'", fontSize: 14, fontWeight: 700 }}>{fmt(item.amount)}</span>
                    <Btn small onClick={() => setCreditPayConfirm(item)} color="#f59e0b">รอชำระ</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)", padding: "12px 20px", borderRadius: 16, border: "1px solid var(--border-card)", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 auto" }}>
          <MonthPicker value={payMonth} onChange={setPayMonth} />
          <div style={{ width: 1, height: 24, background: "var(--border-card)" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--c-secondary)", fontWeight: 600 }}>Estimate Balance</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: estimatedBalance < 0 ? "var(--color-expense)" : "#60a5fa", fontFamily: uiTokens.fontFamilyMono }}>{mask(fmt(estimatedBalance))}</div>
          </div>
        </div>
        <button onClick={() => setShowBalance(!showBalance)} style={{ border: "none", background: showBalance ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", padding: "10px 16px", borderRadius: 10, cursor: "pointer", color: showBalance ? "#10b981" : "var(--c-secondary)", fontSize: 13, fontWeight: 700 }}>{showBalance ? "👁️ แสดง" : "🙈 ซ่อน"}</button>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))", gap: 16 }}>

        {/* === COLUMN 1: FINANCIAL FLOW === */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 14, color: "var(--c-secondary)", marginBottom: 20, fontWeight: 700 }}>📊 สรุปเดือน {MON[payMonth.split("-")[1]]} ({s.period.startDate} - {s.period.endDate})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 15, color: "var(--c-secondary)", fontWeight: 700 }}>รายได้ (Gross)</span>
                  <span style={{ fontSize: 18, fontFamily: "'DM Mono'", fontWeight: 700 }}>{mask(fmt(s.income.grossIncome))}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: 12, color: "var(--c-secondary)", fontWeight: 600 }}>
                  <span>เงินเดือน: {mask(fmt(s.income.monthlySalary))}</span> | <span>OT: {mask(fmt(s.income.otPay))}</span> | <span>ข้าว+น้ำมัน: {mask(fmt(s.income.mealNormal + s.income.mealOt + s.income.fuel))}</span> | <span>เบี้ยขยัน: {mask(fmt(s.income.diligenceAllowance || 0))}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 12, borderLeft: "4px solid #ef4444" }}>
                <span style={{ fontSize: 14, color: "var(--c-secondary)", fontWeight: 600 }}>หักลบ (ภาษี/ประกันสังคม/กยศ)</span>
                <span style={{ fontSize: 15, color: "#f87171", fontWeight: 700 }}>- {mask(fmt(s.deductions.totalDeduction))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16,185,129,0.08)", padding: "14px", borderRadius: 12, border: "1px solid rgba(16,185,129,0.1)" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-income)" }}>รายได้สุทธิ</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "var(--color-income)" }}>{mask(fmt(s.netIncome))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 12, borderLeft: "3px solid #f59e0b" }}>
                <span style={{ fontSize: 14, color: "var(--c-secondary)", fontWeight: 600 }}>รวมภาระคาดการณ์เดือนนี้</span>
                <span style={{ fontSize: 15, color: "#f59e0b", fontWeight: 700 }}>- {mask(fmt(totalProjectedExpenses))}</span>
              </div>

              {/* ── คงเหลือ / ต้องหาเพิ่ม ── */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                paddingLeft: 12,
                borderLeft: `3px solid ${estimatedBalance < 0 ? "#ef4444" : "#60a5fa"}`,
              }}>
                <span style={{ fontSize: 14, color: "var(--c-secondary)", fontWeight: 600 }}>
                  {estimatedBalance < 0 ? "⚠️ ต้องหาเพิ่ม" : "✅ คงเหลือ"}
                </span>
                <span style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: estimatedBalance < 0 ? "#ef4444" : "#60a5fa",
                  fontFamily: "'DM Mono'",
                }}>
                  {mask(fmt(Math.abs(estimatedBalance)))}
                </span>
              </div>
              {/* ── /คงเหลือ / ต้องหาเพิ่ม ── */}

            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>🧾 บิลประจำ (Fixed Bills)</div>
            {s.expenses.fixed.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", fontSize: 15 }}>
                <span style={{ color: "var(--c-text)", fontWeight: 600 }}>{item.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 700 }}>{fmt(item.amount)}</span>
                  <Btn small onClick={() => setFixedPayConfirm(item)} color="#34d399">จ่าย</Btn>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* === COLUMN 2: OBLIGATIONS === */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Card style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>🚗🏠 ค่างวดรถ & บ้าน</div>
            <div style={{ padding: "0 20px" }}>
              {activeLoans.map(loan => {
                const inst = calcLoanInstallment(loan);
                const pct  = ((Number(loan.total_amount) - Number(loan.remaining_amount)) / Number(loan.total_amount)) * 100;
                const paid = isLoanPaid(loan.id);
                return (
                  <div key={loan.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{loan.name} <Badge text={loan._label} color={loan._color} /></div>
                      <div style={{ fontWeight: 800, color: paid ? "var(--c-muted)" : "#f87171", fontSize: 17, textDecoration: paid ? "line-through" : "none" }}>
                        {fmt(loan.monthly_due)}
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={loan._color} height={8} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 600 }}>งวดที่ {inst?.paid}/{inst?.total}</span>
                      {paid ? (
                        /* ── สถานะ "จ่ายแล้ว" เดือนนี้ ── */
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: "#10b981",
                          background: "rgba(16,185,129,0.12)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          borderRadius: 8, padding: "5px 12px",
                        }}>✅ จ่ายแล้ว</span>
                      ) : (
                        <Btn onClick={() => setLoanPayModal({ ...loan, _type: loan._type })} color={loan._color} small>💳 จ่าย</Btn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>💳 บัตรเครดิต (รอบนี้)</div>
            {listToShowOnDashboard.map((group, i) => {
              const creditPaid = isCreditPaid(group.id);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: i < listToShowOnDashboard.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.description}</div>
                    <div style={{ fontSize: 12, color: "var(--c-secondary)", fontWeight: 600 }}>{group.card_name}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontSize: 17, fontWeight: 800, marginBottom: 6,
                      color: creditPaid ? "var(--c-muted)" : "#f59e0b",
                      textDecoration: creditPaid ? "line-through" : "none",
                    }}>{fmt(group.totalInCycle)}</div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
                      <button onClick={() => setSelectedGroupId(group.id)} style={{ border: "none", background: "none", color: "#60a5fa", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>รายละเอียด</button>
                      {creditPaid ? (
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: "#10b981",
                          background: "rgba(16,185,129,0.12)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          borderRadius: 8, padding: "5px 12px",
                        }}>✅ จ่ายแล้ว</span>
                      ) : (
                        <Btn
                          onClick={() => setCreditPayConfirm({ ...group.currentMonthItem, _groupId: group.id })}
                          color="#f59e0b" small
                        >💳 จ่าย</Btn>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}

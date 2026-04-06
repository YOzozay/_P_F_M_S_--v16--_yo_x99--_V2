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

// Component Confirm Modal สำหรับหน้า Dashboard
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
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--c-heading)", fontFamily: uiTokens.fontFamilyMono }}>{fmt(amount)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn onClick={onClose} color="#ed5c5c">ยกเลิก</Btn>
          <Btn onClick={onConfirm} color="#10b981" disabled={loading}>{loading ? "กำลังชำระ..." : "ยืนยันชำระ"}</Btn>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [payMonth, setPayMonth] = useState(getPayMonth());
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loans, setLoans] = useState({ car: [], home: [] });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showBalance, setShowBalance] = useState(false);

  const [loanPayModal, setLoanPayModal] = useState(null);
  const [creditPayConfirm, setCreditPayConfirm] = useState(null);
  const [fixedPayConfirm, setFixedPayConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const mask = (val) => (showBalance ? val : "****");

  const loadDashboard = useCallback(() => {
    setLoading(true); setErr(null);
    Promise.all([
      apiGet({ action: "summary", payMonth }),
      apiGet({ action: "getUpcomingInstallments" }),
      apiGet({ action: "getCarLoans" }),
      apiGet({ action: "getHomeLoans" }),
      apiGet({ action: "getExpenses", payMonth }),
    ]).then(([s, u, car, home, expensesData]) => {
      if (s.error) throw new Error(s.error);
      setSummary(s);
      setUpcoming(Array.isArray(u) ? u : []);
      setLoans({ car: car || [], home: home || [] });

      const expArr = Array.isArray(expensesData) ? expensesData : [];
      setMonthExpenses(expArr);

      // กรองซ่อนหมวดหมู่เหล่านี้จากลิสต์ "รายการล่าสุด" 
      const normalEx = expArr.filter((e) => !["car_payment", "home_payment", "credit_payment", "debt_payment"].includes(e.category));
      setRecentExpenses(normalEx.slice(0, 5));
    }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [payMonth]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ฟังก์ชันกดจ่ายรถ/บ้าน
  const confirmLoanPay = async (payload) => {
    if (!loanPayModal) return;
    setActionLoading(true);
    try {
      const data = typeof payload === "object"
        ? { action: "payLoan", loan_id: loanPayModal.id, loan_type: loanPayModal._type, ...payload }
        : { action: "payLoan", loan_id: loanPayModal.id, loan_type: loanPayModal._type, amount: payload };
      await apiPost(data);
      setLoanPayModal(null);
      loadDashboard();
    } catch { alert("ชำระไม่สำเร็จ"); } 
    finally { setActionLoading(false); }
  };

  // ฟังก์ชันกดจ่ายบัตร/ผ่อนของ
  const handleConfirmCreditPay = async () => {
    if (!creditPayConfirm) return;
    setActionLoading(true);
    try {
      await apiPost({ action: "payCreditInstallment", installment_id: creditPayConfirm.id });
      setCreditPayConfirm(null);
      loadDashboard();
    } catch { alert("ชำระไม่สำเร็จ"); } 
    finally { setActionLoading(false); }
  };

  // ฟังก์ชันกดจ่ายบิลประจำ
  const handleConfirmFixedPay = async () => {
    if (!fixedPayConfirm) return;
    setActionLoading(true);
    try {
      await apiPost({ action: "payFixedExpense", id: fixedPayConfirm.id, name: fixedPayConfirm.name, amount: fixedPayConfirm.amount });
      setFixedPayConfirm(null);
      loadDashboard();
    } catch { alert("ชำระไม่สำเร็จ"); } 
    finally { setActionLoading(false); }
  };

  if (loading) return <Loading />;
  if (err) return <ErrMsg msg={err} />;

  const s = summary;
  const cycleEnd = new Date(s.period.endDate);

  // 🎯 LOGIC: บัตรเครดิต (แปลงแบบดิบให้เป็น Group ตาม Transaction ID)
  const groupedCredit = upcoming.reduce((acc, item) => {
    const key = item.transaction_id || item.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const creditItems = Object.values(groupedCredit).map(group => {
    // เรียงงวดจากน้อยไปมาก เพื่อหางวดถัดไปที่ต้องจ่าย
    group.sort((a, b) => Number(a.installment_no) - Number(b.installment_no));
    const nextDue = group[0]; // งวดค้างจ่ายที่ใกล้ที่สุด
    const dueDate = new Date(nextDue.due_date);
    
    // ถ้างวดที่ต้องจ่าย ดันเลยวันตัดรอบของเดือนนี้ไปแล้ว แปลว่าไม่ต้องจ่ายรอบนี้
    const isDueThisCycle = dueDate <= cycleEnd;

    return {
      ...nextDue,
      isDueThisCycle
    };
  });

  // 🎯 LOGIC: คำนวณภาระค่าใช้จ่าย
  const activeLoans = [
    ...loans.car.map((l) => ({ ...l, _type: "car_loan", _color: "#3b82f6", _label: "รถ" })),
    ...loans.home.map((l) => ({ ...l, _type: "home_loan", _color: "#a78bfa", _label: "บ้าน" })),
  ].filter((l) => l.status !== "closed");

  // ค่างวดรถที่ "ยังไม่จ่าย" ในรอบบิลนี้ (เช็คจาก source_id)
  const totalLoanDues = activeLoans.reduce((acc, loan) => {
    const isPaid = monthExpenses.some(ex => ex.source_id === String(loan.id));
    return acc + (isPaid ? 0 : (Number(loan.monthly_due) || 0));
  }, 0);

  // ค่าบัตรที่ต้องจ่ายในรอบบิลนี้
  const totalCreditDues = creditItems
    .filter(c => c.isDueThisCycle)
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalVariable = s.expenses?.variable?.total || 0;
  const totalFixed = s.expenses?.fixed?.total || 0;
  
  const totalProjectedExpenses = totalVariable + totalFixed + totalLoanDues + totalCreditDues;
  const estimatedBalance = s.netIncome - totalProjectedExpenses;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}>
      {/* Modals */}
      {loanPayModal && <PayModal loan={loanPayModal} onClose={() => setLoanPayModal(null)} onConfirm={confirmLoanPay} loading={actionLoading} />}
      {creditPayConfirm && <ConfirmActionModal title={creditPayConfirm.description} subtitle={creditPayConfirm.card_name} amount={creditPayConfirm.amount} onClose={() => setCreditPayConfirm(null)} onConfirm={handleConfirmCreditPay} loading={actionLoading} />}
      {fixedPayConfirm && <ConfirmActionModal title={fixedPayConfirm.name} subtitle="บิลประจำรายเดือน" amount={fixedPayConfirm.amount} onClose={() => setFixedPayConfirm(null)} onConfirm={handleConfirmFixedPay} loading={actionLoading} />}

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)", padding: "12px 20px", borderRadius: 16, border: "1px solid var(--border-card)", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 auto" }}>
          <MonthPicker value={payMonth} onChange={setPayMonth} />
          <div style={{ width: 1, height: 24, background: "var(--border-card)" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--c-secondary)", fontWeight: 600 }}>Estimate Balance</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: estimatedBalance < 0 ? "var(--color-expense)" : "#60a5fa", fontFamily: uiTokens.fontFamilyMono }}>
              {mask(fmt(Math.abs(estimatedBalance)))}
            </div>
          </div>
        </div>
        <button onClick={() => setShowBalance(!showBalance)} style={{ border: "none", background: showBalance ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", padding: "10px 16px", borderRadius: 10, cursor: "pointer", color: showBalance ? "#10b981" : "var(--c-secondary)", fontSize: 13, fontWeight: 700 }}>
          {showBalance ? "👁️ แสดง" : "🙈 ซ่อน"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))", gap: 16 }}>
        
        {/* COLUMN 1: สรุปเดือน & รายจ่ายล่าสุด */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 14, color: "var(--c-secondary)", marginBottom: 20, fontWeight: 700 }}>📊 สรุปเดือน {MON[payMonth.split("-")[1]]} ({s.period.startDate} - {s.period.endDate})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 15, color: "var(--c-secondary)", fontWeight: 700 }}>รายได้ (Gross)</span>
                  <span style={{ fontSize: 18, fontFamily: uiTokens.fontFamilyMono, fontWeight: 700 }}>{mask(fmt(s.income.grossIncome))}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: 12, color: "var(--c-secondary)", fontWeight: 600 }}>
                  <span>เงินเดือน: {mask(fmt(s.income.monthlySalary))}</span> | <span>OT: {mask(fmt(s.income.otPay))}</span> | <span>ข้าว+น้ำมัน: {mask(fmt(s.income.mealNormal + s.income.mealOt + s.income.fuel))}</span>
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
              <div style={{ marginTop: 14, paddingTop: 16, borderTop: "1px solid var(--border-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: estimatedBalance >= 0 ? "var(--c-text)" : "#ef4444" }}>
                    {estimatedBalance >= 0 ? "✨ ยอดเงินคงเหลือคาดการณ์" : "🚨 ยอดที่ต้องหาเพิ่ม"}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: estimatedBalance >= 0 ? "#10b981" : "#ef4444", fontFamily: uiTokens.fontFamilyMono }}>
                    {estimatedBalance >= 0 ? mask(fmt(estimatedBalance)) : mask(fmt(Math.abs(estimatedBalance)))}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>💸 รายการใช้จ่ายล่าสุด</div>
            {recentExpenses.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--c-subtle)", fontSize: 13 }}>ยังไม่มีรายการใช้จ่ายเดือนนี้</div>
            ) : (
              recentExpenses.map((ex, i) => (
                <div key={ex.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: i < recentExpenses.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{ex.category}</div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.date} {ex.note ? `· ${ex.note}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}>-{fmt(ex.amount)}</div>
                </div>
              ))
            )}
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>🧾 บิลประจำ (Fixed Bills)</div>
            {s.expenses.fixed.items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", fontSize: 15 }}>
                <span style={{ color: "var(--c-text)", fontWeight: 600 }}>{item.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 700 }}>{fmt(item.amount)}</span>
                  <Btn small onClick={() => setFixedPayConfirm(item)} color="#34d399">💳 จ่าย</Btn>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* COLUMN 2: งวดรถ บ้าน และ เครดิต */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          
          <Card style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>🚗🏠 ค่างวดรถ & บ้าน</div>
            <div style={{ padding: "0 20px" }}>
              {activeLoans.map((loan) => {
                const inst = calcLoanInstallment(loan);
                const pct = ((Number(loan.total_amount) - Number(loan.remaining_amount)) / Number(loan.total_amount)) * 100;
                
                // เช็คว่าจ่ายในรอบบิลนี้ไปหรือยัง จาก source_id
                const isPaidThisMonth = monthExpenses.some(ex => ex.source_id === String(loan.id));

                return (
                  <div key={loan.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{loan.name} <Badge text={loan._label} color={loan._color} /></div>
                      <div style={{ fontWeight: 800, color: isPaidThisMonth ? "var(--c-muted)" : "#f87171", fontSize: 17, textDecoration: isPaidThisMonth ? "line-through" : "none" }}>
                        {fmt(loan.monthly_due)}
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={loan._color} height={8} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 600 }}>งวดที่ {inst?.paid}/{inst?.total}</span>
                      {isPaidThisMonth ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "5px 12px" }}>✅ จ่ายแล้วรอบนี้</span>
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
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>💳 รายการผ่อนชำระ & บัตรเครดิต</div>
            <div style={{ padding: "0 20px" }}>
              {creditItems.map((credit) => {
                const pct = ((Number(credit.installment_no) - 1) / Number(credit.months)) * 100;
                
                return (
                  <div key={credit.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{credit.description} <Badge text={credit.card_name} color="#f59e0b" /></div>
                      <div style={{ fontWeight: 800, color: !credit.isDueThisCycle ? "var(--c-muted)" : "#f59e0b", fontSize: 17, textDecoration: !credit.isDueThisCycle ? "line-through" : "none" }}>
                        {fmt(credit.amount)}
                      </div>
                    </div>
                    
                    <ProgressBar pct={pct} color="#f59e0b" height={8} />
                    
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 600 }}>
                        งวดที่ {credit.installment_no}/{credit.months} <span style={{ fontSize: 11, marginLeft: 4 }}>(Due: {credit.due_date})</span>
                      </span>
                      
                      {credit.isDueThisCycle ? (
                        <Btn onClick={() => setCreditPayConfirm(credit)} color="#f59e0b" small>💳 จ่าย</Btn>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "5px 12px" }}>✅ จ่ายแล้วรอบนี้</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {creditItems.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--c-subtle)", fontSize: 13 }}>ไม่มีรายการค้างชำระ</div>}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

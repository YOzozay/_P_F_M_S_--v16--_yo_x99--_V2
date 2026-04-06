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
import { ConfirmModal } from "../components/shared/ConfirmModal";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

export default function DashboardPage() {
  const [payMonth, setPayMonth] = useState(getPayMonth());
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [loans, setLoans] = useState({ car: [], home: [] });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showBalance, setShowBalance] = useState(false);

  const [loanPayData, setLoanPayData] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const mask = (val) => (showBalance ? val : "••••");

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setErr(null);

    Promise.all([
      apiGet({ action: "summary", payMonth }),
      apiGet({ action: "getUpcomingInstallments" }),
      apiGet({ action: "getInstallments" }),
      apiGet({ action: "getCarLoans" }),
      apiGet({ action: "getHomeLoans" }),
      apiGet({ action: "getExpenses", payMonth }),
    ])
      .then(([s, u, inst, car, home, expensesData]) => {
        if (s.error) throw new Error(s.error);

        setSummary(s);
        setUpcoming(Array.isArray(u) ? u : []);
        setInstallments(Array.isArray(inst) ? inst : []);
        setLoans({ car: car || [], home: home || [] });

        const expArr = Array.isArray(expensesData) ? expensesData : [];
        setMonthExpenses(expArr);

        const normalEx = expArr.filter((e) => !["car_payment", "home_payment"].includes(e.category));
        setRecentExpenses(normalEx.slice(0, 5));
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [payMonth]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleFinalConfirm = async () => {
    if (!confirmData) return;
    setActionLoading(true);
    try {
      if (confirmData.type === "credit") {
        await apiPost({ action: "payCreditInstallment", installment_id: confirmData.id });
      } else if (confirmData.type === "creditInstallment") {
        await apiPost({ action: "payCreditInstallment", installment_id: confirmData.id });
      } else if (confirmData.type === "fixed") {
        await apiPost({ action: "payFixedExpense", id: confirmData.id, name: confirmData.title, amount: confirmData.amount });
      }
      setConfirmData(null);
      loadDashboard();
    } catch {
      alert("ชำระไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoanConfirm = async (payload) => {
    if (!loanPayData) return;
    setActionLoading(true);
    try {
      const data =
        typeof payload === "object"
          ? { action: "payLoan", loan_id: loanPayData.id, loan_type: loanPayData._type, ...payload }
          : { action: "payLoan", loan_id: loanPayData.id, loan_type: loanPayData._type, amount: payload };
      await apiPost(data);
      setLoanPayData(null);
      loadDashboard();
    } catch {
      alert("ชำระไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  const loanPaid = (loan) =>
    monthExpenses.some(
      (ex) =>
        (ex.category === "car_payment" || ex.category === "home_payment") &&
        ex.note &&
        ex.note.includes(loan.name)
    );

  // ครบในรอบนี้ (ใช้ข้อมูลเดิมจาก upcoming เพื่อคำนวณยอดคาดการณ์ตามรอบ 21-20)
  const s = summary;
  if (loading) return <Loading />;
  if (err) return <ErrMsg msg={err} />;

  const cycleStart = new Date(s.period.startDate);
  const cycleEnd = new Date(s.period.endDate);

  const groupedUpcoming = upcoming.reduce((acc, item) => {
    const key = item.transaction_id || `${item.card_name}_${item.description}`;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        card_name: item.card_name,
        description: item.description,
        items: [],
        totalInCycle: 0,
        currentMonthItem: null,
      };
    }

    acc[key].items.push(item);

    const due = new Date(item.due_date);
    if (due >= cycleStart && due <= cycleEnd) {
      acc[key].totalInCycle += Number(item.amount);
      acc[key].currentMonthItem = item;
    }

    return acc;
  }, {});

  const listToShowOnDashboard = Object.values(groupedUpcoming).filter((g) => g.totalInCycle > 0);

  // รายการผ่อนบัตรเครดิต: แสดงเหมือนรถ/บ้าน โดยใช้ getInstallments
  const creditInstallmentGroups = Object.values(
    installments.reduce((acc, inst) => {
      const txId = inst.transaction_id || inst.id || `${inst.card_name}_${inst.description}`;
      if (!acc[txId]) {
        acc[txId] = {
          id: txId,
          transaction_id: txId,
          description: inst.description,
          card_name: inst.card_name,
          months: Number(inst.months) || 0,
          total_amount: Number(inst.total_amount) || 0,
          installments: [],
        };
      }
      acc[txId].installments.push(inst);
      return acc;
    }, {})
  )
    .map((group) => {
      const sorted = [...group.installments].sort((a, b) => (Number(a.installment_no) || 0) - (Number(b.installment_no) || 0));
      const nextUnpaid = sorted.find((i) => i.status === "unpaid");
      const paidCount = sorted.filter((i) => i.status === "paid").length;
      const paidAmount = sorted.filter((i) => i.status === "paid").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const unpaidAmount = sorted.filter((i) => i.status === "unpaid").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const totalMonths = group.months || sorted.length || 0;
      const pct = totalMonths > 0 ? (paidCount / totalMonths) * 100 : 0;

      return {
        ...group,
        installments: sorted,
        nextUnpaid,
        paidCount,
        paidAmount,
        unpaidAmount,
        pct,
        allPaid: totalMonths > 0 ? paidCount >= totalMonths : false,
      };
    })
    .filter((group) => group.nextUnpaid);

  const activeLoans = [
    ...loans.car.map((l) => ({ ...l, _type: "car_loan", _color: "#3b82f6", _label: "รถ" })),
    ...loans.home.map((l) => ({ ...l, _type: "home_loan", _color: "#a78bfa", _label: "บ้าน" })),
  ].filter((l) => l.status !== "closed");

  const totalVariable = s.expenses?.variable?.total || 0;
  const totalFixed = s.expenses?.fixed?.total || 0;
  const totalLoanDues = activeLoans.reduce((acc, curr) => acc + (loanPaid(curr) ? 0 : (Number(curr.monthly_due) || 0)), 0);
  const totalCreditDues = listToShowOnDashboard.reduce((acc, curr) => acc + curr.totalInCycle, 0);
  const totalProjectedExpenses = totalVariable + totalFixed + totalLoanDues + totalCreditDues;
  const estimatedBalance = s.netIncome - totalProjectedExpenses;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}>
      {loanPayData && (
        <PayModal
          loan={loanPayData}
          onClose={() => setLoanPayData(null)}
          onConfirm={handleLoanConfirm}
          loading={actionLoading}
        />
      )}

      {confirmData && (
        <ConfirmModal
          title={confirmData.title}
          subtitle={confirmData.subtitle}
          amount={confirmData.amount}
          onConfirm={handleFinalConfirm}
          onClose={() => setConfirmData(null)}
          loading={actionLoading}
        />
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-card)",
          padding: "12px 20px",
          borderRadius: 16,
          border: "1px solid var(--border-card)",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 auto" }}>
          <MonthPicker value={payMonth} onChange={setPayMonth} />
          <div style={{ width: 1, height: 24, background: "var(--border-card)" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--c-secondary)", fontWeight: 600 }}>Estimate Balance</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: estimatedBalance < 0 ? "var(--color-expense)" : "#60a5fa",
                fontFamily: "'DM Mono'",
              }}
            >
              {mask(fmt(Math.abs(estimatedBalance)))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowBalance(!showBalance)}
          style={{
            border: "none",
            background: showBalance ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
            padding: "10px 16px",
            borderRadius: 10,
            cursor: "pointer",
            color: showBalance ? "#10b981" : "var(--c-secondary)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {showBalance ? "👁️ แสดง" : "🙈 ซ่อน"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 14, color: "var(--c-secondary)", marginBottom: 20, fontWeight: 700 }}>
              📊 สรุปเดือน {MON[payMonth.split("-")[1]]} ({s.period.startDate} - {s.period.endDate})
            </div>

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
                <span style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>รายได้สุทธิ</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{mask(fmt(s.netIncome))}</span>
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
                  <span style={{ fontSize: 20, fontWeight: 800, color: estimatedBalance >= 0 ? "#10b981" : "#ef4444", fontFamily: "'DM Mono'" }}>
                    {estimatedBalance >= 0 ? mask(fmt(estimatedBalance)) : mask(fmt(Math.abs(estimatedBalance)))}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>
              💸 รายการใช้จ่ายล่าสุด
            </div>
            {recentExpenses.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--c-subtle)", fontSize: 13 }}>ยังไม่มีรายการใช้จ่ายเดือนนี้</div>
            ) : (
              recentExpenses.map((ex, i) => (
                <div
                  key={ex.id || i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 20px",
                    borderBottom: i < recentExpenses.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{ex.category}</div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ex.date} {ex.note ? `· ${ex.note}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#ef4444" }}>-{fmt(ex.amount)}</div>
                </div>
              ))
            )}
          </Card>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>
              🧾 บิลประจำ (Fixed Bills)
            </div>
            {s.expenses.fixed.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 15,
                }}
              >
                <span style={{ color: "var(--c-text)", fontWeight: 600 }}>{item.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 700 }}>{fmt(item.amount)}</span>
                  <Btn small onClick={() => setConfirmData({ id: item.id, title: item.name, subtitle: "บิลประจำรายเดือน", amount: item.amount, type: "fixed" })} color="#34d399">
                    💳 จ่าย
                  </Btn>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Card style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>
              🚗🏠 ค่างวดรถ & บ้าน
            </div>
            <div style={{ padding: "0 20px" }}>
              {activeLoans.map((loan) => {
                const inst = calcLoanInstallment(loan);
                const pct = ((Number(loan.total_amount) - Number(loan.remaining_amount)) / Number(loan.total_amount)) * 100;
                const paid = loanPaid(loan);

                return (
                  <div key={loan.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {loan.name} <Badge text={loan._label} color={loan._color} />
                      </div>
                      <div style={{ fontWeight: 800, color: paid ? "var(--c-muted)" : "#f87171", fontSize: 17, textDecoration: paid ? "line-through" : "none" }}>
                        {fmt(loan.monthly_due)}
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={loan._color} height={8} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 600 }}>งวดที่ {inst?.paid}/{inst?.total}</span>

                      {paid ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "5px 12px" }}>
                          ✅ จ่ายแล้ว
                        </span>
                      ) : (
                        <Btn onClick={() => setLoanPayData({ ...loan, _type: loan._type })} color={loan._color} small>
                          💳 จ่าย
                        </Btn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "var(--c-secondary)", borderBottom: "1px solid var(--border-card)" }}>
              💳 บัตรเครดิต (กดจ่าย)
            </div>

            {creditInstallmentGroups.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--c-subtle)", fontSize: 13 }}>
                ยังไม่มีรายการเครดิตที่ต้องชำระ
              </div>
            ) : (
              <div style={{ padding: "0 20px" }}>
                {creditInstallmentGroups.map((group, i) => (
                  <div
                    key={group.id}
                    style={{
                      padding: "18px 0",
                      borderBottom: i < creditInstallmentGroups.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ minWidth: 0, paddingRight: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {group.description}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--c-secondary)", fontWeight: 600 }}>{group.card_name}</div>
                      </div>
                      <div style={{ fontWeight: 800, color: "#f59e0b", fontSize: 17 }}>
                        {fmt(group.nextUnpaid.amount)}
                      </div>
                    </div>

                    <ProgressBar pct={group.pct} color="#f59e0b" height={8} />

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 600 }}>
                        ชำระแล้ว {group.paidCount}/{group.months || group.installments.length}
                      </span>

                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          onClick={() =>
                            setConfirmData({
                              id: group.nextUnpaid.id,
                              title: group.description,
                              subtitle: group.card_name,
                              amount: group.nextUnpaid.amount,
                              type: "creditInstallment",
                            })
                          }
                          style={{
                            border: "none",
                            background: "none",
                            color: "#60a5fa",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          รายละเอียด
                        </button>

                        <Btn
                          onClick={() =>
                            setConfirmData({
                              id: group.nextUnpaid.id,
                              title: group.description,
                              subtitle: group.card_name,
                              amount: group.nextUnpaid.amount,
                              type: "creditInstallment",
                            })
                          }
                          color="#f59e0b"
                          small
                        >
                          💳 จ่าย
                        </Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

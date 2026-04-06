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

/* ───────── Confirm Modal ───────── */
function ConfirmActionModal({ title, subtitle, amount, onConfirm, onClose, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-picker)", borderRadius: 18, padding: 24, width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>💳 ยืนยันการชำระ</div>
          <div style={{ fontSize: 13 }}>{title}</div>
          <div style={{ fontSize: 11 }}>{subtitle}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10 }}>ยอดที่ต้องชำระ</div>
          <div style={{ fontSize: 24 }}>{fmt(amount)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn onClick={onClose} color="#ed5c5c">ยกเลิก</Btn>
          <Btn onClick={onConfirm} color="#10b981" disabled={loading}>
            {loading ? "กำลังชำระ..." : "ยืนยัน"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────── */

export default function DashboardPage() {
  const [payMonth, setPayMonth] = useState(getPayMonth());
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loans, setLoans] = useState({ car: [], home: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showBalance, setShowBalance] = useState(false);

  const [paidLoanKeys, setPaidLoanKeys] = useState(new Set());
  const [paidCreditKeys, setPaidCreditKeys] = useState(new Set());

  const [loanPayModal, setLoanPayModal] = useState(null);
  const [creditPayConfirm, setCreditPayConfirm] = useState(null);
  const [fixedPayConfirm, setFixedPayConfirm] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const mask = (val) => (showBalance ? val : "****");

  const loanPaidKey = (id) => `${payMonth}__${id}`;
  const isLoanPaid = (id) => paidLoanKeys.has(loanPaidKey(id));
  const isCreditPaid = (id) => paidCreditKeys.has(`${payMonth}__${id}`);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setErr(null);
    Promise.all([
      apiGet({ action: "summary", payMonth }),
      apiGet({ action: "getUpcomingInstallments" }),
      apiGet({ action: "getCarLoans" }),
      apiGet({ action: "getHomeLoans" }),
    ])
      .then(([s, u, car, home]) => {
        if (s.error) throw new Error(s.error);
        setSummary(s);
        setUpcoming(Array.isArray(u) ? u : []);
        setLoans({ car: car || [], home: home || [] });
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [payMonth]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const confirmLoanPay = async (payload) => {
    if (!loanPayModal) return;
    setActionLoading(true);
    try {
      const data =
        typeof payload === "object"
          ? { action: "payLoan", loan_id: loanPayModal.id, loan_type: loanPayModal._type, ...payload }
          : { action: "payLoan", loan_id: loanPayModal.id, loan_type: loanPayModal._type, amount: payload };

      await apiPost(data);
      setPaidLoanKeys((prev) => new Set([...prev, loanPaidKey(loanPayModal.id)]));
      setLoanPayModal(null);
      loadDashboard();
    } catch {
      alert("ชำระไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCreditPay = async () => {
    if (!creditPayConfirm) return;
    setActionLoading(true);
    try {
      await apiPost({ action: "payCreditInstallment", installment_id: creditPayConfirm.id });

      if (creditPayConfirm._groupId) {
        setPaidCreditKeys((prev) => new Set([...prev, `${payMonth}__${creditPayConfirm._groupId}`]));
      }

      setCreditPayConfirm(null);
      loadDashboard();
    } catch {
      alert("ชำระไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmFixedPay = async () => {
    if (!fixedPayConfirm) return;
    setActionLoading(true);
    try {
      await apiPost({
        action: "payFixedExpense",
        id: fixedPayConfirm.id,
        name: fixedPayConfirm.name,
        amount: fixedPayConfirm.amount,
      });
      setFixedPayConfirm(null);
      loadDashboard();
    } catch {
      alert("ชำระไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (err) return <ErrMsg msg={err} />;

  const s = summary;

  // ✅ FIX BUG (สำคัญ)
  const cycleStart = new Date(s.period.startDate);
  const cycleEnd = new Date(s.period.endDate);

  const groupedUpcoming = upcoming.reduce((acc, item) => {
    const key = item.transaction_id || `${item.card_name}_${item.description}`;
    if (!acc[key])
      acc[key] = {
        id: key,
        card_name: item.card_name,
        description: item.description,
        items: [],
        totalInCycle: 0,
        currentMonthItem: null,
      };

    acc[key].items.push(item);

    const due = new Date(item.due_date);
    if (due >= cycleStart && due <= cycleEnd) {
      acc[key].totalInCycle += Number(item.amount);
      acc[key].currentMonthItem = item;
    }

    return acc;
  }, {});

  const listToShowOnDashboard = Object.values(groupedUpcoming).filter((g) => g.totalInCycle > 0);
  const activeGroup = selectedGroupId ? groupedUpcoming[selectedGroupId] : null;

  const activeLoans = [
    ...loans.car.map((l) => ({ ...l, _type: "car_loan", _color: "#3b82f6", _label: "รถ" })),
    ...loans.home.map((l) => ({ ...l, _type: "home_loan", _color: "#a78bfa", _label: "บ้าน" })),
  ].filter((l) => l.status !== "closed");

  const totalVariable = s.expenses.variable.total || 0;
  const totalFixed = s.expenses.fixed.total || 0;

  const totalLoanDues = activeLoans
    .filter((l) => !isLoanPaid(l.id))
    .reduce((acc, curr) => acc + (Number(curr.monthly_due) || 0), 0);

  const totalCreditDues = listToShowOnDashboard
    .filter((g) => !isCreditPaid(g.id))
    .reduce((acc, curr) => acc + curr.totalInCycle, 0);

  const totalProjectedExpenses = totalVariable + totalFixed + totalLoanDues + totalCreditDues;
  const estimatedBalance = s.netIncome - totalProjectedExpenses;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <MonthPicker value={payMonth} onChange={setPayMonth} />
        <div>
          Estimate Balance: {mask(fmt(estimatedBalance))}
        </div>
      </div>

      {/* CREDIT */}
      <Card>
        <div style={{ padding: 16, fontWeight: 700 }}>💳 บัตรเครดิต</div>
        {listToShowOnDashboard.map((group, i) => (
          <div key={i} style={{ padding: 12, borderTop: "1px solid #eee" }}>
            {group.description} — {fmt(group.totalInCycle)}
          </div>
        ))}
      </Card>
    </div>
  );
}

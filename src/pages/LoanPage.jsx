import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi"; 
import { fmt } from "../utils/formatters";
import { calcLoanInstallment } from "../utils/loanUtils";

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

// ✅ ฟังก์ชันจัดฟอร์แมตวันที่ (รองรับทั้ง INDOCHINA TIME และ DATE OBJECT)
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString; 
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return dateString; }
};

/* ──────────────────────────────────────────────────────────────────────────
   1. CUSTOM MODALS (Success, Error, Delete, Rate)
────────────────────────────────────────────────────────────────────────── */

function StatusModal({ msg, type = "success", onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-picker)", borderRadius: 18, padding: "24px", width: "100%", maxWidth: 350, textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{type === "success" ? "✅" : "❌"}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)", marginBottom: 16 }}>{msg}</div>
        <Btn onClick={onClose} color={type === "success" ? "#10b981" : "#ef4444"}>ตกลง</Btn>
      </div>
    </div>
  );
}

function DeleteModal({ title, onConfirm, onClose, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-picker)", borderRadius: 18, padding: "24px", width: "100%", maxWidth: 380, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)", marginBottom: 10 }}>🗑️ ยืนยันการลบ?</div>
        <div style={{ fontSize: 13, color: "var(--c-secondary)", marginBottom: 20 }}>คุณต้องการลบสัญญา "{title}" ใช่หรือไม่?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn onClick={onClose} color="#6b7280">ยกเลิก</Btn>
          <Btn onClick={onConfirm} color="#ef4444" disabled={loading}>{loading ? "กำลังลบ..." : "ลบข้อมูล"}</Btn>
        </div>
      </div>
    </div>
  );
}

function RateModal({ loan, onClose, onConfirm, loading }) {
  const [rate, setRate] = useState(String(loan.interest_rate || 0));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-picker)", borderRadius: 18, padding: "24px", width: "100%", maxWidth: 380, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)", marginBottom: 4 }}>⚙️ ตั้งค่าดอกเบี้ย</div>
          <div style={{ fontSize: 13, color: "var(--c-secondary)" }}>{loan.name}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>อัตราดอกเบี้ยปัจจุบัน (% ต่อปี)</label>
          <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)", borderRadius: 10, padding: "12px", color: "var(--c-text)", fontSize: 20, fontWeight: 700, outline: "none" }} autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn onClick={onClose} color="#6b7280">ยกเลิก</Btn>
          <Btn onClick={() => onConfirm(rate)} color="#a78bfa" disabled={loading}>{loading ? "กำลังบันทึก..." : "อัปเดตเรต"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   2. MAIN LOAN PAGE
────────────────────────────────────────────────────────────────────────── */
export default function LoanPage() {
  const [carLoans, setCarLoans]   = useState([]);
  const [homeLoans, setHomeLoans] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState(null);
  const [tab, setTab]             = useState("car");
  
  // Modals States
  const [payModal, setPayModal]   = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const [statusMsg, setStatusMsg] = useState(null); 

  const [actionLoading, setActionLoading] = useState(false);

  const emptyForm = { name: "", lender: "", total_amount: "", monthly_due: "", due_day: "20", paid_installments: "", start_date: "", end_date: "", remaining_amount: "" };
  const [carForm, setCarForm]   = useState(emptyForm);
  const [homeForm, setHomeForm] = useState(emptyForm);

  const fc = (k, v) => setCarForm(p => ({ ...p, [k]: v }));
  const fh = (k, v) => setHomeForm(p => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiGet({ action: "getCarLoans" }), apiGet({ action: "getHomeLoans" })])
      .then(([car, home]) => { setCarLoans(Array.isArray(car) ? car : []); setHomeLoans(Array.isArray(home) ? home : []); })
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (loanType) => {
    const form = loanType === "car_loan" ? carForm : homeForm;
    if (!form.name || !form.total_amount || !form.monthly_due) return;
    setLoading(true); 
    try {
      await apiPost({ action: "addLoan", loan_type: loanType, ...form });
      if (loanType === "car_loan") setCarForm(emptyForm); else setHomeForm(emptyForm);
      load();
      setStatusMsg({ msg: "เพิ่มสัญญาสำเร็จ", type: "success" });
    } catch { setErr("บันทึกไม่สำเร็จ"); setLoading(false); }
  };

  const confirmPay = async (payload) => {
    if (!payModal) return;
    setActionLoading(true);
    try {
      const data = typeof payload === "object" 
        ? { action: "payLoan", loan_id: payModal.id, loan_type: payModal._type, ...payload } 
        : { action: "payLoan", loan_id: payModal.id, loan_type: payModal._type, amount: payload };
      const res = await apiPost(data);
      if (res.error) throw new Error(res.error);
      setPayModal(null); load();
      setStatusMsg({ msg: "ชำระงวดสำเร็จ", type: "success" });
    } catch (e) { setStatusMsg({ msg: e.message, type: "error" }); }
    finally { setActionLoading(false); }
  };

  const confirmUpdateRate = async (newRate) => {
    if (!rateModal) return;
    setActionLoading(true);
    try {
      const res = await apiPost({ action: "updateLoanRate", loan_id: rateModal.id, interest_rate: Number(newRate) });
      if (res.error) throw new Error(res.error);
      setRateModal(null); load();
      setStatusMsg({ msg: "อัปเดตดอกเบี้ยสำเร็จ", type: "success" });
    } catch (e) { setStatusMsg({ msg: e.message, type: "error" }); }
    finally { setActionLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      await apiPost({ action: "deleteLoan", id: deleteId });
      setDeleteId(null); load();
      setStatusMsg({ msg: "ลบข้อมูลสำเร็จ", type: "success" });
    } catch { setStatusMsg({ msg: "ลบไม่สำเร็จ", type: "error" }); }
    finally { setActionLoading(false); }
  };

  const renderLoanCard = (loan, loanType, color) => {
    const totalAmt = Number(loan.total_amount) || 0;
    const remaining = Number(loan.remaining_amount) || 0;
    const paid = totalAmt - remaining;
    const pct = totalAmt > 0 ? (paid / totalAmt) * 100 : 0;
    const inst = calcLoanInstallment(loan);

    return (
      <Card key={loan.id} style={{ padding: "20px 22px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>{loan.name}</span>
              <Badge text={loanType === "car_loan" ? "รถ" : "บ้าน"} color={color} />
              {inst && <Badge text={`จ่ายแล้ว ${inst.paid}/${inst.total} งวด`} color={color} />}
            </div>
            <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{loan.lender} · {inst?.remaining} งวดที่เหลือ</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "var(--c-muted)", marginBottom: 2 }}>คงเหลือ</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 18, color: "#f87171" }}>{fmt(remaining)}</div>
          </div>
        </div>
        
        <ProgressBar pct={pct} color={color} />

        {/* ✅ คืนค่าข้อมูลวันที่ (ในกรอบสีแดงเดิม) กลับมาแสดงผลตรงนี้ */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11 }}>
          <div style={{ color: "var(--c-subtle)" }}>
            ชำระแล้ว {pct.toFixed(1)}% ({fmt(paid)}) · รวม {fmt(totalAmt)}
          </div>
          <div style={{ color: "var(--c-dim)", fontSize: 10 }}>
            {loan.start_date && `เริ่ม ${formatDate(loan.start_date)}`} {loan.end_date && ` · สิ้นสุด ${formatDate(loan.end_date)}`}
          </div>
        </div>
        
        {/* กลุ่มปุ่มฝั่งขวา */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 16 }}>
          <Btn onClick={() => setDeleteId(loan.id)} color="#ef4444" small>🗑️ ลบ</Btn>
          {loanType === "home_loan" && (
            <Btn onClick={() => setRateModal(loan)} color="#a78bfa" small>⚙️ ดอกเบี้ย ({loan.interest_rate}%)</Btn>
          )}
          {!loan.status.includes("closed") && (
            <Btn onClick={() => { setPayModal({ ...loan, _type: loanType }); }} color={color} small>
              💳 ชำระ ({fmt(loan.monthly_due)})
            </Btn>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {err && <ErrMsg msg={err} />}
      
      {payModal && <PayModal loan={payModal} onClose={() => setPayModal(null)} onConfirm={confirmPay} loading={actionLoading} />}
      {rateModal && <RateModal loan={rateModal} onClose={() => setRateModal(null)} onConfirm={confirmUpdateRate} loading={actionLoading} />}
      {deleteId && <DeleteModal title={(carLoans.concat(homeLoans)).find(l=>l.id===deleteId)?.name} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} loading={actionLoading} />}
      {statusMsg && <StatusModal msg={statusMsg.msg} type={statusMsg.type} onClose={() => setStatusMsg(null)} />}

      <Section title="ภาพรวมหนี้สิน">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <KpiCard label="งวดรถคงเหลือ" value={fmt(carLoans.reduce((s,l)=>s+Number(l.remaining_amount),0))} accent="#3b82f6" />
          <KpiCard label="งวดบ้านคงเหลือ" value={fmt(homeLoans.reduce((s,l)=>s+Number(l.remaining_amount),0))} accent="#a78bfa" />
          <KpiCard label="รวมภาระทั้งหมด" value={fmt(carLoans.concat(homeLoans).reduce((s,l)=>s+Number(l.remaining_amount),0))} accent="#f43f5e" />
        </div>
      </Section>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTab("car")} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: tab === "car" ? "rgba(59,130,246,0.15)" : "var(--bg-card)", color: tab === "car" ? "#3b82f6" : "var(--c-muted)", fontWeight: 700, cursor: "pointer" }}>🚗 งวดรถ</button>
        <button onClick={() => setTab("home")} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: tab === "home" ? "rgba(167,139,250,0.15)" : "var(--bg-card)", color: tab === "home" ? "#a78bfa" : "var(--c-muted)", fontWeight: 700, cursor: "pointer" }}>🏠 งวดบ้าน</button>
      </div>

      {loading ? <Loading /> : (
        <>
          {(tab === "car" ? carLoans : homeLoans).map(l => renderLoanCard(l, tab === "car" ? "car_loan" : "home_loan", tab === "car" ? "#3b82f6" : "#a78bfa"))}
          
          <Section title={`เพิ่มสัญญา${tab === "car" ? "งวดรถ" : "งวดบ้าน"}`}>
            <Card style={{ padding: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FInput label="ชื่อสัญญา" value={tab === "car" ? carForm.name : homeForm.name} onChange={v => tab === "car" ? fc("name",v) : fh("name",v)} />
                <FInput label="สถาบันการเงิน" value={tab === "car" ? carForm.lender : homeForm.lender} onChange={v => tab === "car" ? fc("lender",v) : fh("lender",v)} />
                <FInput label="ยอดกู้ทั้งหมด" type="number" value={tab === "car" ? carForm.total_amount : homeForm.total_amount} onChange={v => tab === "car" ? fc("total_amount",v) : fh("total_amount",v)} />
                <FInput label="คงเหลือปัจจุบัน" type="number" value={tab === "car" ? carForm.remaining_amount : homeForm.remaining_amount} onChange={v => tab === "car" ? fc("remaining_amount",v) : fh("remaining_amount",v)} />
                <FInput label="ค่างวด" type="number" value={tab === "car" ? carForm.monthly_due : homeForm.monthly_due} onChange={v => tab === "car" ? fc("monthly_due",v) : fh("monthly_due",v)} />
                <FInput label="จ่ายมาแล้ว (งวด)" type="number" value={tab === "car" ? carForm.paid_installments : homeForm.paid_installments} onChange={v => tab === "car" ? fc("paid_installments",v) : fh("paid_installments",v)} />
                <FInput label="เริ่มสัญญา" type="date" value={tab === "car" ? carForm.start_date : homeForm.start_date} onChange={v => tab === "car" ? fc("start_date",v) : fh("start_date",v)} />
                <FInput label="สิ้นสุดสัญญา" type="date" value={tab === "car" ? carForm.end_date : homeForm.end_date} onChange={v => tab === "car" ? fc("end_date",v) : fh("end_date",v)} />
              </div>
              <div style={{ marginTop: 20 }}>
                <Btn onClick={() => handleAdd(tab === "car" ? "car_loan" : "home_loan")} color={tab === "car" ? "#3b82f6" : "#a78bfa"}>+ เพิ่มข้อมูลสัญญา</Btn>
              </div>
              <div style={{ height: 250 }} />
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}
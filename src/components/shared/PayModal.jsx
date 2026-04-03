import React, { useState, useEffect } from 'react';
import { Btn } from '../ui/Btn';
import { ErrMsg } from './ErrMsg';
import { fmt } from '../../utils/formatters';

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: 10, padding: "9px 12px", color: "var(--c-text)", fontSize: 16, fontWeight: 700, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

export function PayModal({ loan, onClose, onConfirm, loading, err }) {
  // ตรวจสอบว่าเป็นงวดบ้านหรือไม่
  const isHome = loan._type === "home_loan" || loan.loan_type === "home_loan" || loan.id?.includes("home");
  
  // ประเมินดอกเบี้ย (เงินต้นคงเหลือ * ดอกเบี้ย% / 12 เดือน)
  const rate = Number(loan.interest_rate) || 0;
  const estimatedInterest = isHome && rate > 0 
    ? Math.round((Number(loan.remaining_amount) * (rate / 100)) / 12) 
    : 0;

  const [amt, setAmt] = useState(String(loan.monthly_due));
  const [interest, setInterest] = useState(String(estimatedInterest));

  // คำนวณเงินต้นอัตโนมัติ (ยอดรวม - ดอกเบี้ย)
  const principal = Math.max(0, Number(amt) - Number(interest));

  const handleConfirm = () => {
    if (isHome) {
      // ส่งเป็น Object สำหรับงวดบ้าน เพื่อแยกต้นแยกดอก
      onConfirm({
        amount: Number(amt),
        principal: principal,
        interest: Number(interest)
      });
    } else {
      // งวดรถส่งยอดธรรมดา
      onConfirm(Number(amt));
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--bg-picker)", border: "1px solid var(--border-card)", borderRadius: 18, padding: "24px 24px 20px", width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)", marginBottom: 4 }}>💳 ชำระงวด</div>
          <div style={{ fontSize: 13, color: "var(--c-secondary)" }}>{loan.name}</div>
          <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
            ค่างวด {fmt(loan.monthly_due)} · คงเหลือ {fmt(loan.remaining_amount)}
          </div>
        </div>

        <div style={{ marginBottom: isHome ? 14 : 20 }}>
          <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>จำนวนที่ต้องการจ่ายรวม (฿)</label>
          <input type="number" value={amt} onChange={e => setAmt(e.target.value)} style={inputStyle} autoFocus />
        </div>

        {/* ✅ แสดงฟิลด์แยกต้น-ดอก เฉพาะงวดบ้าน */}
        {isHome && (
          <div style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 12, padding: "12px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 10, fontWeight: 600 }}>ดอกเบี้ยประเมิน: {rate}% ต่อปี (แก้ตามสลิปจริงได้)</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 4 }}>ดอกเบี้ย (฿)</label>
                <input type="number" value={interest} onChange={e => setInterest(e.target.value)} style={{ ...inputStyle, fontSize: 14, padding: "6px 10px", color: "#f43f5e" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 4 }}>หักเงินต้น (฿)</label>
                <input type="text" value={fmt(principal)} disabled style={{ ...inputStyle, fontSize: 14, padding: "6px 10px", color: "#10b981", opacity: 0.8 }} />
              </div>
            </div>
          </div>
        )}

        {err && <ErrMsg msg={err} />}
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn onClick={onClose} color="var(--c-muted)">ยกเลิก</Btn>
          <Btn onClick={handleConfirm} color={isHome ? "#a78bfa" : "#10b981"} disabled={loading}>
            {loading ? "กำลังชำระ..." : "ยืนยันชำระ"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
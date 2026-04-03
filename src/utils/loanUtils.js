/**
 * ฟังก์ชันคำนวณข้อมูลการผ่อนชำระ (Loan Installments)
 * เวอร์ชันนี้จะดึงค่าจาก total_installments และ paid_installments 
 * ที่ได้รับมาจาก Google Sheets (Backend) โดยตรง เพื่อความแม่นยำสูงสุด
 */
export const calcLoanInstallment = (loan) => {
  if (!loan) return null;

  // 1. ดึงค่าจาก Object ที่ API ส่งมา
  // หมายเหตุ: ชื่อ Key ต้องตรงกับที่ระบุไว้ในฟังก์ชัน getLoans ใน Code.gs
  const totalInst = Number(loan.total_installments) || 0;
  const paidInst  = Number(loan.paid_installments)  || 0;
  const remMonths = Number(loan.remaining_months)   || 0;

  // 2. ป้องกันกรณีข้อมูลผิดพลาด หรือยังไม่มีการระบุงวด
  if (totalInst === 0) return null;

  return {
    paid:      paidInst,       // จำนวนงวดที่ชำระแล้ว (เช่น 27)
    total:     totalInst,      // จำนวนงวดทั้งหมด (เช่น 84)
    remaining: remMonths,     // จำนวนงวดที่เหลือ (เช่น 57)
    
    // คำนวณงวดถัดไปที่กำลังจะจ่าย (ถ้าจ่ายครบแล้วจะหยุดที่งวดสุดท้าย)
    next:      Math.min(paidInst + 1, totalInst) 
  };
};
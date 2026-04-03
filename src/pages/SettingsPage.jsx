import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { Btn } from "../components/ui/Btn";
import { FormField } from "../components/form/FormField";
import { FInput } from "../components/form/FInput";

import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

// สไตล์สำหรับ Input ในหน้า Settings
const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: 10, padding: "9px 12px", color: "var(--c-text)", fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

export default function SettingsPage() {
  const [config, setConfig] = useState({});
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);
  
  const [salaryForm, setSalaryForm] = useState({ effective_date: "", salary: "" });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiGet({ action: "getConfig" }), apiGet({ action: "getSalaryHistory" })])
      .then(([cfg, hist]) => {
        setConfig(cfg || {});
        setSalaryHistory(Array.isArray(hist) ? hist : []);
      })
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await apiPost({ action: "updateConfig", ...config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setErr("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSalary = async () => {
    if (!salaryForm.effective_date || !salaryForm.salary) return;
    setSaving(true);
    try {
      await apiPost({ action: "addSalaryHistory", ...salaryForm });
      setSalaryForm({ effective_date: "", salary: "" });
      load();
    } catch {
      setErr("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const CONFIG_LABELS = {
    salary_divisor_days: "วันทำงาน/เดือน (หาร)",
    work_hours_per_day: "ชั่วโมง/วัน",
    ot_multiplier_1: "OT Holiday ×",
    ot_multiplier_1_5: "OT 1.5x ×",
    ot_multiplier_3: "OT 3x ×",
    ot_meal_threshold_hours: "OT ได้ค่าอาหาร (ชม.ขั้นต่ำ)",
    meal_normal_per_day: "ค่าอาหาร Normal/วัน",
    meal_ot_per_day: "ค่าอาหาร OT/วัน",
    fuel_per_day: "ค่าน้ำมัน/วัน",
    social_security_max_base: "ฐานประกันสังคม (สูงสุด)",
    social_security_rate: "อัตราประกันสังคม",
    student_loan_fixed: "กยศ. หักคงที่/เดือน"
  };

  return (
    <div>
      {err && <ErrMsg msg={err} />}
      {loading ? <Loading /> : (
        <>
          <Section title="Payroll Config">
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {Object.entries(CONFIG_LABELS).map(([key, label]) => (
                  <FormField key={key} label={label}>
                    <input
                      type="number"
                      value={config[key] ?? ""}
                      onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))}
                      style={inputStyle}
                      step="0.01"
                    />
                  </FormField>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <Btn onClick={handleSaveConfig} color={saved ? "#10b981" : "#60a5fa"} disabled={saving}>
                  {saved ? "✓ บันทึกแล้ว" : saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </Btn>
              </div>
            </Card>
          </Section>

          <Section title="Add Salary History">
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FInput label="Effective Date" type="date" value={salaryForm.effective_date} onChange={v => setSalaryForm(p => ({ ...p, effective_date: v }))} required />
                <FInput label="เงินเดือน (฿)" type="number" value={salaryForm.salary} onChange={v => setSalaryForm(p => ({ ...p, salary: v }))} required />
              </div>
              <div style={{ marginTop: 14 }}>
                <Btn onClick={handleAddSalary} color="#60a5fa" disabled={saving}>
                  + บันทึกเงินเดือนใหม่
                </Btn>
              </div>
            </Card>
          </Section>

          <Section title="Salary History">
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {salaryHistory.length === 0
                ? <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีข้อมูล</div>
                : salaryHistory.map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 20px", borderBottom: i < salaryHistory.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <span style={{ fontSize: 13, color: "var(--c-secondary)" }}>{h.effective_date}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#10b981", fontSize: 14 }}>{fmt(h.salary)}</span>
                  </div>
                ))
              }
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}
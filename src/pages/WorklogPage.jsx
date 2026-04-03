import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { getPayMonth, getToday } from "../utils/dateUtils";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Btn, XBtn } from "../components/ui/Btn";

import { FormField } from "../components/form/FormField";
import { FInput } from "../components/form/FInput";
import { MonthPicker } from "../components/form/MonthPicker";

import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

export default function WorklogPage() {
  const [payMonth, setPayMonth] = useState(getPayMonth());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  
  const [form, setForm] = useState({ date: getToday(), holiday_hours: "", ot_evening_1_5x: "", ot_evening_3x: "", note: "" });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const lastOT = useRef({ ot_evening_1_5x: "2.5", ot_evening_3x: "0" });

  const load = useCallback(() => { 
    setLoading(true); 
    apiGet({ action: "getWorklogs", payMonth })
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false)); 
  }, [payMonth]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.date) return;
    setSubmitting(true); setErr(null);
    if (form.ot_evening_1_5x || form.ot_evening_3x) lastOT.current = { ot_evening_1_5x: form.ot_evening_1_5x, ot_evening_3x: form.ot_evening_3x };
    const tempId = `temp_${Date.now()}`;
    const item = { id: tempId, date: form.date, holiday_hours: Number(form.holiday_hours) || 0, ot15: Number(form.ot_evening_1_5x) || 0, ot3: Number(form.ot_evening_3x) || 0, note: form.note };
    setLogs(p => [item, ...p]);
    setForm({ date: getToday(), holiday_hours: "", ot_evening_1_5x: "", ot_evening_3x: "", note: "" });
    try { 
      await apiPost({ action: "addWorklog", date: item.date, holiday_hours: item.holiday_hours, ot_evening_1_5x: item.ot15, ot_evening_3x: item.ot3, note: item.note }); 
      load(); 
    } catch { 
      setLogs(p => p.filter(x => x.id !== tempId)); setErr("บันทึกไม่สำเร็จ"); 
    } finally { setSubmitting(false); }
  };

  const handleQuickLog = async () => {
    const ot15 = Number(lastOT.current.ot_evening_1_5x) || 0;
    const ot3  = Number(lastOT.current.ot_evening_3x) || 0;
    if (!ot15 && !ot3) { setErr("ยังไม่มีค่า OT ที่จำไว้ — กรอกครั้งแรกก่อนครับ"); return; }
    setSubmitting(true); setErr(null);
    const tempId = `temp_${Date.now()}`;
    const item = { id: tempId, date: getToday(), holiday_hours: 0, ot15, ot3, note: "Quick log" };
    setLogs(p => [item, ...p]);
    try { 
      await apiPost({ action: "addWorklog", date: item.date, holiday_hours: 0, ot_evening_1_5x: ot15, ot_evening_3x: ot3, note: "Quick log" }); 
      load(); 
    } catch { 
      setLogs(p => p.filter(x => x.id !== tempId)); setErr("บันทึกไม่สำเร็จ"); 
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => { 
    if (!confirm("ลบรายการ worklog นี้?")) return; 
    setLogs(p => p.filter(l => l.id !== id)); 
    try { await apiPost({ action: "deleteWorklog", id }); } catch { load(); setErr("ลบไม่สำเร็จ"); } 
  };

  const totalOT15 = logs.reduce((s, l) => s + (Number(l.ot15) || 0), 0);
  const totalOT3  = logs.reduce((s, l) => s + (Number(l.ot3) || 0), 0);
  const totalHoliday = logs.reduce((s, l) => s + (Number(l.holiday_hours) || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}><FormField label="Pay Month"><MonthPicker value={payMonth} onChange={setPayMonth} /></FormField></div>
      {err && <ErrMsg msg={err} />}
      
      <Section title="OT Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <KpiCard label="OT 1.5x (ชม.)" value={`${totalOT15}h`} accent="#a78bfa" />
          <KpiCard label="OT 3x (ชม.)" value={`${totalOT3}h`} accent="#f59e0b" />
          <KpiCard label="Holiday (ชม.)" value={`${totalHoliday}h`} accent="#10b981" />
        </div>
      </Section>
      
      <Section title="Log OT">
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FInput label="วันที่" type="date" value={form.date} onChange={v => f("date", v)} required />
            <FInput label="Holiday Hours" type="number" value={form.holiday_hours} onChange={v => f("holiday_hours", v)} placeholder="0" />
            <FInput label="OT Evening 1.5x (ชม.)" type="number" value={form.ot_evening_1_5x} onChange={v => f("ot_evening_1_5x", v)} placeholder="0" />
            <FInput label="OT Evening 3x (ชม.)" type="number" value={form.ot_evening_3x} onChange={v => f("ot_evening_3x", v)} placeholder="0" />
            <div style={{ gridColumn: "span 2" }}><FInput label="หมายเหตุ" value={form.note} onChange={v => f("note", v)} placeholder="Optional note" /></div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Btn onClick={handleAdd} color="#a78bfa" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "+ บันทึก OT"}</Btn>
            <Btn onClick={handleQuickLog} color="#f59e0b" disabled={submitting}>⚡ Quick Log วันนี้</Btn>
          </div>
        </Card>
      </Section>
      
      <Section title="Work Log History">
        {loading ? <Loading /> : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {logs.length === 0 && <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--c-subtle)" }}>ยังไม่มีรายการในช่วงนี้</div>}
            {logs.map((l, i) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderBottom: i < logs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>{l.date}</div>
                  <div style={{ fontSize: 10, color: "var(--c-subtle)", marginTop: 2 }}>{l.note || "—"}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {Number(l.holiday_hours) > 0 && <Badge text={`Holiday ${l.holiday_hours}h`} color="#10b981" />}
                  {Number(l.ot15) > 0 && <Badge text={`OT1.5 ${l.ot15}h`} color="#a78bfa" />}
                  {Number(l.ot3) > 0 && <Badge text={`OT3 ${l.ot3}h`} color="#f59e0b" />}
                  <XBtn onClick={() => handleDelete(l.id)} />
                </div>
              </div>
            ))}
          </Card>
        )}
      </Section>
    </div>
  );
}
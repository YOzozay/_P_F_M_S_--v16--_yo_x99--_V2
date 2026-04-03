import React from 'react';
import { FormField } from './FormField';
import { DatePicker } from './DatePicker'; // เดี๋ยวเราสร้างไฟล์นี้ในสเต็ปถัดไป

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: 10, padding: "9px 12px", color: "var(--c-text)", fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

export function FInput({ label, type = "text", value, onChange, placeholder, required }) {
  return (
    <FormField label={label} required={required}>
      {type === "date"
        ? <DatePicker value={value} onChange={onChange} placeholder={placeholder} />
        : <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={inputStyle} />
      }
    </FormField>
  );
}
import React from 'react';
import { FormField } from './FormField';
import { DatePicker } from './DatePicker'; // เดี๋ยวเราสร้างไฟล์นี้ในสเต็ปถัดไป
import { uiTokens } from '../../styles/tokens';

const inputStyle = {
  width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
  borderRadius: uiTokens.radius.md, padding: `${uiTokens.spacing.sm} ${uiTokens.spacing.md}`, color: "var(--c-text)", fontSize: uiTokens.fontSize.md, outline: "none",
  boxSizing: "border-box", fontFamily: uiTokens.fontFamilyBase,
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
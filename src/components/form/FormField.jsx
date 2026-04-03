import React from 'react';

export function FormField({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: "var(--c-muted)", marginBottom: 5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#f43f5e" }}> *</span>}
      </label>
      {children}
    </div>
  );
}
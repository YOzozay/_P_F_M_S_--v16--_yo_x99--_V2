import React from 'react';

export function ErrMsg({ msg }) {
  return (
    <div style={{ padding: "12px 16px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, color: "#f87171", fontSize: 12, marginBottom: 16 }}>
      {msg}
    </div>
  );
}
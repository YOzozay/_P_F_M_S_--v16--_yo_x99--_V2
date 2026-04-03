import React from 'react';

export function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", gap: 14 }}>
      <div className="spin-loader" />
      <span style={{ color: "var(--c-subtle)", fontSize: 12, letterSpacing: "0.06em" }}>กำลังโหลด...</span>
    </div>
  );
}
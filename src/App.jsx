import React, { useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import YearPage from "./pages/YearPage";
import CombinedExpensesPage from "./pages/CombinedExpensesPage"; // ✅ รวมหน้า Expenses + Fixed
import LoanPage from "./pages/LoanPage";
import CombinedCreditPage from "./pages/CombinedCreditPage"; // ✅ รวมหน้า Credit Cards + Installments
import PaymentCenterPage from "./pages/PaymentCenterPage";
import WorklogPage from "./pages/WorklogPage";
import SettingsPage from "./pages/SettingsPage";

/* ─────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────── */
const NAV_ITEMS = [
  { key: "dashboard",    label: "Dashboard",             icon: "⬡" },
  { key: "year",         label: "Year Overview",         icon: "◱" },
  { key: "expenses",     label: "Expenses & Fixed",      icon: "◈" },
  { key: "loans",        label: "งวดรถ & บ้าน",           icon: "◑" },
  { key: "credit",       label: "Credit & Installments", icon: "▣" },
  { key: "payments",     label: "Payment Center",        icon: "◆" },
  { key: "worklog",      label: "Worklog",               icon: "◎" },
  { key: "settings",     label: "Settings",              icon: "⚙" },
];

const PAGE_MAP = {
  dashboard: DashboardPage,
  year: YearPage,
  expenses: CombinedExpensesPage,
  loans: LoanPage,
  credit: CombinedCreditPage,
  payments: PaymentCenterPage,
  worklog: WorklogPage,
  settings: SettingsPage,
};

/* ─────────────────────────────────────────
   APP SHELL
───────────────────────────────────────── */
export default function App() {
  const [page, setPage]               = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme]             = useState(() => localStorage.getItem("finance-theme") || "dark");
  
  const toggleTheme = () => setTheme(t => { 
    const n = t === "dark" ? "light" : "dark"; 
    localStorage.setItem("finance-theme", n); 
    return n; 
  });
  
  const isDark = theme === "dark";
  const PageComponent = PAGE_MAP[page] || DashboardPage;
  const currentNav = NAV_ITEMS.find(n => n.key === page);
  
  const BOTTOM_NAV = [
    { key: "dashboard", label: "Home",     icon: "⬡" },
    { key: "expenses",  label: "Expenses", icon: "◈" },
    { key: "payments",  label: "Pay",      icon: "◆" },
    { key: "worklog",   label: "Worklog",  icon: "◎" },
    { key: "settings",  label: "Settings", icon: "⚙" },
  ];
  
  const navigate = (key) => { setPage(key); setSidebarOpen(false); };

  return (
    <>
      <style>{`
        /* ✅ นำเข้าฟอนต์ Prompt (สำหรับข้อความทั่วไป) และ DM Mono (สำหรับตัวเลข) */
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&family=Prompt:wght@300;400;500;600;700&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; }
        
        /* ✅ บังคับให้แอปใช้ฟอนต์ Prompt เป็นหลัก */
        body { font-family: 'Prompt', sans-serif; }

        /* ── Dark Theme (Original) ── */
        .app-root {
          --bg-page:    #060d1a;
          --bg-sidebar: #060d1a;
          --bg-card:    rgba(255,255,255,0.03);
          --border-card: rgba(255,255,255,0.07);
          --bg-kpi:     rgba(255,255,255,0.04);
          --border-kpi: rgba(255,255,255,0.07);
          --bg-input:   rgba(255,255,255,0.06);
          --border-input: rgba(255,255,255,0.1);
          --border-subtle: rgba(255,255,255,0.05);
          --border-mid: rgba(255,255,255,0.08);
          --bg-tooltip: #1a2540;
          --bg-picker:  #111827;
          --c-heading:  #f0f4ff;
          --c-text:     #e2e8f0;
          --c-secondary:#9ca3af;
          --c-muted:    #6b7280;
          --c-subtle:   #4b5563;
          --c-dim:      #374151;
          --c-dimmer:   #2d3748;
        }
        
        /* ── Light Theme (Original) ── */
        .app-root.light {
          --bg-page:    #f0f4f8;
          --bg-sidebar: #f0f4f8;
          --bg-card:    #ffffff;
          --border-card: rgba(0,0,0,0.07);
          --bg-kpi:     #ffffff;
          --border-kpi: rgba(0,0,0,0.07);
          --bg-input:   rgba(0,0,0,0.04);
          --border-input: rgba(0,0,0,0.12);
          --border-subtle: rgba(0,0,0,0.06);
          --border-mid: rgba(0,0,0,0.08);
          --bg-tooltip: #1e293b;
          --bg-picker:  #ffffff;
          --c-heading:  #0f172a;
          --c-text:     #1e293b;
          --c-secondary:#64748b;
          --c-muted:    #64748b;
          --c-subtle:   #94a3b8;
          --c-dim:      #cbd5e1;
          --c-dimmer:   #e2e8f0;
        }
        .app-root.light .sidebar { border-right-color: rgba(0,0,0,0.08) !important; }
        .app-root.light .desktop-header { border-bottom-color: rgba(0,0,0,0.06) !important; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-input); border-radius: 99px; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }

        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 80; }
        .sidebar-overlay.open { display: block; }
        .sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 250px;
          background: var(--bg-sidebar); border-right: 1px solid var(--border-subtle);
          padding: 24px 0; display: flex; flex-direction: column; z-index: 90;
          transform: translateX(-100%); transition: transform 0.25s ease;
        }
        .sidebar.open { transform: translateX(0); }
        
        /* Sticky Header สำหรับ Mobile */
        .mobile-header { 
          display: flex; align-items: center; justify-content: space-between; 
          padding: 14px 18px; background: var(--bg-sidebar); 
          border-bottom: 1px solid var(--border-subtle); 
          position: sticky; top: 0; z-index: 50; 
        }

        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-sidebar); border-top: 1px solid var(--border-card); display: flex; z-index: 50; padding-bottom: env(safe-area-inset-bottom, 0px); }
        .bottom-nav button { flex: 1; border: none; background: transparent; padding: 10px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; transition: all 0.12s; font-family: inherit; }
        .bottom-nav button.active { color: #10b981; }
        .bottom-nav button:not(.active) { color: #4b5563; }
        
        .bottom-nav button span.icon { font-size: 20px; } 
        .bottom-nav button span.lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
        
        .ham { display: flex; flex-direction: column; gap: 4px; cursor: pointer; padding: 4px; background: none; border: none; }
        .ham span { display: block; width: 22px; height: 2px; background: #9ca3af; border-radius: 2px; }
        
        .desktop-header { display: none; }
        @media (min-width: 768px) {
          .sidebar { position: sticky; top: 0; height: 100vh; transform: translateX(0) !important; }
          .sidebar-overlay { display: none !important; }
          .mobile-header { display: none !important; }
          .bottom-nav { display: none !important; }
          .desktop-header { display: flex !important; }
          .main-content { padding: 0 28px 40px !important; }
        }
      `}</style>

      <div className={`app-root${isDark ? "" : " light"}`} style={{ display: "flex", height: "100%", width: "100%", background: "var(--bg-page)", color: "var(--c-text)", fontFamily: "'Prompt', sans-serif" }}>
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* ── Sidebar ── */}
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div style={{ padding: "0 20px 22px" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-heading)", letterSpacing: "-0.01em" }}>💰 FinanceOS</div>
            <div style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 500, marginTop: 3 }}>Personal Finance Manager</div>
          </div>
          <nav style={{ flex: 1, overflowY: "auto" }}>
            {NAV_ITEMS.map(item => {
              const active = page === item.key;
              return (
                <button key={item.key} onClick={() => navigate(item.key)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 22px", border: "none", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: active ? 600 : 400, fontFamily: "inherit", background: active ? "rgba(16,185,129,0.1)" : "transparent", color: active ? "#10b981" : "var(--c-muted)", borderRight: active ? "3px solid #10b981" : "3px solid transparent", transition: "all 0.12s" }}>
                  <span style={{ fontSize: 18, opacity: active ? 1 : 0.5 }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-kpi)", border: "1px solid var(--border-kpi)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
              <span style={{ fontSize: 14, color: "var(--c-secondary)", fontWeight: 500 }}>{isDark ? "🌙 Dark Mode" : "☀️ Light Mode"}</span>
              <div style={{ width: 38, height: 22, borderRadius: 99, background: isDark ? "#10b981" : "#e2e8f0", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: isDark ? 19 : 3, transition: "left 0.2s" }} />
              </div>
            </button>
            <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>FinanceOS</div>
              <div style={{ color: "var(--c-muted)", marginTop: 2, fontSize: 11 }}>Connected · Google Sheets</div>
            </div>
          </div>
        </div>

        {/* ── Main Content Container ── */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
          
          <div className="mobile-header">
            <button className="ham" onClick={() => setSidebarOpen(o => !o)}><span /><span /><span /></button>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-heading)" }}>💰 {currentNav?.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={toggleTheme} style={{ background: "var(--bg-kpi)", border: "1px solid var(--border-kpi)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>{isDark ? "🌙" : "☀️"}</button>
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#10b981", fontWeight: 600 }}>Live</div>
            </div>
          </div>

          <div style={{ padding: "20px 28px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }} className="desktop-header">
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--c-heading)", letterSpacing: "-0.02em" }}>{currentNav?.label}</h1>
              <p style={{ fontSize: 13, color: "var(--c-secondary)", fontWeight: 500, marginTop: 4 }}>ข้อมูลจาก Google Sheets · Real-time</p>
            </div>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#10b981", fontWeight: 600 }}>Live</div>
          </div>

          <div className="main-content" style={{ padding: "0 18px 90px", flex: 1 }}>
            <PageComponent />
          </div>
        </div>

        {/* ── Bottom Nav (Mobile) ── */}
        <nav className="bottom-nav">
          {BOTTOM_NAV.map(item => (
            <button key={item.key} onClick={() => navigate(item.key)} className={page === item.key ? "active" : ""}>
              <span className="icon">{item.icon}</span>
              <span className="lbl">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "../api/gsApi";
import { fmt } from "../utils/formatters";

import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Btn } from "../components/ui/Btn";
import { FInput } from "../components/form/FInput";
import { Loading } from "../components/shared/Loading";
import { ErrMsg } from "../components/shared/ErrMsg";

/* =========================================
   CREDIT CARDS PAGE (จัดการหน้าบัตรเครดิต)
========================================= */
export default function CombinedCreditPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [statements, setStatements] = useState({});
  const [err, setErr] = useState(null);

  const [cardForm, setCardForm] = useState({
    name: "",
    credit_limit: "",
    closing_day: "",
    due_day: "",
  });

  const fc = (k, v) => setCardForm((p) => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    setLoading(true);
    apiGet({ action: "getCreditSummary" })
      .then((d) => {
        const validCards = Array.isArray(d)
          ? d.filter((c) => c.name && String(c.name).trim() !== "")
          : [];
        setCards(validCards);
      })
      .catch(() => setErr("โหลดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatement = async (cardId) => {
    if (selectedCard === cardId) {
      setSelectedCard(null);
      return;
    }
    setSelectedCard(cardId);
    if (!statements[cardId]) {
      const now = new Date();
      const stmt = await apiGet({
        action: "getCreditStatement",
        card_id: cardId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
      setStatements((p) => ({ ...p, [cardId]: stmt }));
    }
  };

  const handleCreateCard = async () => {
    if (!cardForm.name || !cardForm.credit_limit) return;
    try {
      await apiPost({ action: "createCreditCard", ...cardForm });
      load();
      setCardForm({ name: "", credit_limit: "", closing_day: "", due_day: "" });
    } catch (e) {
      setErr(e.message || "สร้างบัตรไม่สำเร็จ");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 24,
      }}
    >
      {err && <ErrMsg msg={err} />}

      <Section title="Credit Cards Overview">
        {loading ? (
          <Loading />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cards.map((c) => {
              const util = Number(c.utilization_percent) || 0;
              const color =
                util > 75 ? "#f43f5e" : util > 50 ? "#f59e0b" : "#10b981";
              const active = selectedCard === c.card_id;
              const stmt = statements[c.card_id];

              return (
                <Card
                  key={c.card_id}
                  style={{
                    padding: "18px 22px",
                    borderColor: active ? "rgba(96,165,250,0.35)" : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "var(--c-text)",
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--c-subtle)",
                          marginTop: 2,
                        }}
                      >
                        Limit {fmt(c.credit_limit)} · Available{" "}
                        {fmt(c.available_credit)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontWeight: 700,
                          fontSize: 16,
                          color,
                        }}
                      >
                        {util.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 10, color: "var(--c-subtle)" }}>
                        {fmt(c.outstanding)} ใช้ไปแล้ว
                      </div>
                    </div>
                  </div>
                  <ProgressBar pct={util} color={color} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <span style={{ fontSize: 10, color: "var(--c-subtle)" }}>
                      Next due: {c.next_due_date || "—"} ·{" "}
                      {fmt(c.next_due_amount)}
                    </span>
                    <Btn
                      onClick={() => toggleStatement(c.card_id)}
                      color="#60a5fa"
                      small
                    >
                      {active ? "ซ่อน Statement" : "ดู Statement"}
                    </Btn>
                  </div>

                  {active && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "14px 16px",
                        background: "rgba(96,165,250,0.05)",
                        border: "1px solid rgba(96,165,250,0.15)",
                        borderRadius: 10,
                      }}
                    >
                      {!stmt ? (
                        <div style={{ fontSize: 12, color: "var(--c-subtle)" }}>
                          กำลังโหลด...
                        </div>
                      ) : stmt.error ? (
                        <div style={{ fontSize: 12, color: "#f87171" }}>
                          {stmt.error}
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#60a5fa",
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              marginBottom: 10,
                            }}
                          >
                            Statement Summary
                          </div>
                          {[
                            [
                              "รอบบัญชี",
                              `${stmt.statement_period_start} → ${stmt.statement_period_end}`,
                            ],
                            ["วันครบกำหนด", stmt.due_date],
                            ["ยอดที่ต้องชำระ", fmt(stmt.statement_total)],
                          ].map(([k, v]) => (
                            <div
                              key={k}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 12,
                                marginBottom: 6,
                              }}
                            >
                              <span style={{ color: "var(--c-muted)" }}>
                                {k}
                              </span>
                              <span
                                style={{
                                  fontFamily:
                                    k === "ยอดที่ต้องชำระ"
                                      ? "'DM Mono', monospace"
                                      : "inherit",
                                  fontWeight:
                                    k === "ยอดที่ต้องชำระ" ? 700 : 400,
                                  color:
                                    k === "ยอดที่ต้องชำระ"
                                      ? "#60a5fa"
                                      : "var(--c-text)",
                                }}
                              >
                                {v}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            {cards.length === 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--c-subtle)",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                ยังไม่มีข้อมูลบัตรเครดิต
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Add Credit Card">
        <Card style={{ padding: "20px 22px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <FInput
              label="ชื่อบัตร"
              value={cardForm.name}
              onChange={(v) => fc("name", v)}
              placeholder="KBank Platinum"
              required
            />
            <FInput
              label="วงเงิน (฿)"
              type="number"
              value={cardForm.credit_limit}
              onChange={(v) => fc("credit_limit", v)}
              required
            />
            <FInput
              label="Closing Day"
              type="number"
              value={cardForm.closing_day}
              onChange={(v) => fc("closing_day", v)}
              placeholder="25"
              required
            />
            <FInput
              label="Due Day"
              type="number"
              value={cardForm.due_day}
              onChange={(v) => fc("due_day", v)}
              placeholder="15"
              required
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={handleCreateCard} color="#3b82f6">
              + เพิ่มบัตร
            </Btn>
          </div>
        </Card>
      </Section>
    </div>
  );
}

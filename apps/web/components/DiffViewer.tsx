import React, { useState } from "react";

interface DiffViewerProps {
  filePath?: string;
  patch?: string;
  highlightLineStart?: number;
  highlightLineEnd?: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  filePath = "payments/refund.py",
  patch,
  highlightLineStart = 118,
  highlightLineEnd = 124,
}) => {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  // Sample code representation for center pane
  const lines = [
    { num: 115, type: "context", code: "    if not charge_id:" },
    { num: 116, type: "context", code: "        raise ValueError('charge_id required')" },
    { num: 117, type: "context", code: "" },
    { num: 118, type: "delete",  code: "-   def refund_payment(charge_id: str) -> Refund:" },
    { num: 118, type: "add",     code: "+   def refund_payment(charge_id: str, *, idempotency_key: str) -> Refund:" },
    { num: 119, type: "context", code: "        # Construct refund request with tracking key" },
    { num: 120, type: "delete",  code: "-       key = uuid.uuid4().hex" },
    { num: 120, type: "add",     code: "+       key = idempotency_key" },
    { num: 121, type: "context", code: "        record = PaymentGateway.create_refund(charge_id, key=key)" },
    { num: 122, type: "context", code: "        return record" },
    { num: 123, type: "context", code: "" },
    { num: 124, type: "context", code: "    def process_webhook(event):" },
  ];

  return (
    <div className="q-card" style={{ height: "100%", display: "flex", flexDirection: "column", padding: 0 }}>
      {/* File Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--q-2) var(--q-4)",
          borderBottom: "1px solid var(--q-border)",
          backgroundColor: "var(--q-surface-sunken)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)" }}>
          <span style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>{filePath}</span>
          <span
            className="q-badge"
            style={{ backgroundColor: "var(--q-surface)", border: "1px solid var(--q-border)", color: "var(--q-text-muted)" }}
          >
            anchored lines {highlightLineStart}-{highlightLineEnd}
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--q-1)" }}>
          <button
            type="button"
            className="q-btn"
            style={{
              padding: "2px 8px",
              fontSize: "var(--q-fs-xs)",
              backgroundColor: viewMode === "unified" ? "var(--q-surface-sunken)" : "var(--q-surface)",
            }}
            onClick={() => setViewMode("unified")}
          >
            Unified
          </button>
          <button
            type="button"
            className="q-btn"
            style={{
              padding: "2px 8px",
              fontSize: "var(--q-fs-xs)",
              backgroundColor: viewMode === "split" ? "var(--q-surface-sunken)" : "var(--q-surface)",
            }}
            onClick={() => setViewMode("split")}
          >
            Split
          </button>
        </div>
      </div>

      {/* Code diff container */}
      <div style={{ flex: 1, overflowY: "auto", fontFamily: "var(--q-font-mono)", fontSize: "var(--q-fs-xs)" }}>
        {lines.map((line, idx) => {
          const isHighlighted = line.num >= highlightLineStart && line.num <= highlightLineEnd;
          let bgColor = "transparent";
          if (line.type === "add") bgColor = "var(--q-ok)15";
          else if (line.type === "delete") bgColor = "var(--q-critical)15";
          else if (isHighlighted) bgColor = "var(--q-accent-soft)";

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                lineHeight: "var(--q-lh-code)",
                backgroundColor: bgColor,
                borderLeft: isHighlighted ? "3px solid var(--q-accent)" : "3px solid transparent",
              }}
            >
              <span
                style={{
                  width: "50px",
                  userSelect: "none",
                  textAlign: "right",
                  paddingRight: "var(--q-3)",
                  color: "var(--q-text-faint)",
                  borderRight: "1px solid var(--q-border)",
                }}
              >
                {line.num}
              </span>
              <span style={{ paddingLeft: "var(--q-3)", whiteSpace: "pre", flex: 1 }}>{line.code}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

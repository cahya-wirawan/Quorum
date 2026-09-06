import React, { useState } from "react";

interface PolicyDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmationKeyword: string; // e.g., "ENABLE BLOCKING" or org name
  onConfirm: () => void;
  onCancel: () => void;
}

export const PolicyDialog: React.FC<PolicyDialogProps> = ({
  isOpen,
  title,
  description,
  confirmationKeyword,
  onConfirm,
  onCancel,
}) => {
  const [inputVal, setInputVal] = useState("");

  if (!isOpen) return null;

  const isMatched = inputVal.trim() === confirmationKeyword;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onCancel}
    >
      <div
        className="q-card"
        style={{ width: "450px", maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-semibold)", color: "var(--q-critical)" }}>
          {title}
        </h3>
        <p style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text)", marginTop: "var(--q-2)" }}>
          {description}
        </p>

        <div style={{ marginTop: "var(--q-4)" }}>
          <label style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", display: "block", marginBottom: "var(--q-1)" }}>
            Type <strong style={{ color: "var(--q-text)" }}>{confirmationKeyword}</strong> to confirm:
          </label>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            style={{
              width: "100%",
              padding: "var(--q-2)",
              borderRadius: "var(--q-radius-sm)",
              border: "1px solid var(--q-border)",
              backgroundColor: "var(--q-surface)",
              color: "var(--q-text)",
            }}
            placeholder={confirmationKeyword}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--q-2)", marginTop: "var(--q-5)" }}>
          <button type="button" className="q-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="q-btn q-btn-danger"
            disabled={!isMatched}
            style={{ opacity: isMatched ? 1 : 0.4, cursor: isMatched ? "pointer" : "not-allowed" }}
            onClick={() => {
              if (isMatched) onConfirm();
            }}
          >
            Confirm Escalation
          </button>
        </div>
      </div>
    </div>
  );
};

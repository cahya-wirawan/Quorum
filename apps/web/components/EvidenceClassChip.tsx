import React from "react";

export type EvidenceClass =
  | "static_tool"
  | "test_failure"
  | "symbol_resolution"
  | "spec_violation"
  | "reproduction"
  | "heuristic";

interface EvidenceClassChipProps {
  cls: EvidenceClass;
}

export const EvidenceClassChip: React.FC<EvidenceClassChipProps> = ({ cls }) => {
  const meta = {
    static_tool:       { label: "STATIC TOOL",       icon: "⚙️" },
    test_failure:      { label: "TEST FAILURE",      icon: "🧪" },
    symbol_resolution: { label: "SYMBOL RESOLUTION", icon: "🔍" },
    spec_violation:    { label: "SPEC VIOLATION",    icon: "📜" },
    reproduction:      { label: "REPRODUCTION",      icon: "⚡" },
    heuristic:         { label: "HEURISTIC ONLY",    icon: "💡" },
  }[cls] || { label: cls, icon: "•" };

  const isHeuristic = cls === "heuristic";

  return (
    <span
      className="q-badge"
      role="status"
      aria-label={`Evidence class: ${meta.label}`}
      style={{
        backgroundColor: isHeuristic ? "var(--q-surface-sunken)" : "var(--q-accent-soft)",
        color: isHeuristic ? "var(--q-text-muted)" : "var(--q-accent)",
        border: `1px solid ${isHeuristic ? "var(--q-border)" : "var(--q-accent)33"}`,
      }}
      title={isHeuristic ? "Heuristic-only findings are never posted to PRs" : `Evidence class: ${meta.label}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
};

import React from "react";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

interface SeverityChipProps {
  severity: Severity;
  className?: string;
}

export const SeverityChip: React.FC<SeverityChipProps> = ({ severity, className = "" }) => {
  const config = {
    critical: { label: "CRITICAL", bg: "var(--q-critical-bg)", color: "var(--q-critical)", icon: "⛔" },
    high:     { label: "HIGH",     bg: "var(--q-high-bg)",     color: "var(--q-high)",     icon: "▲" },
    medium:   { label: "MEDIUM",   bg: "var(--q-medium-bg)",   color: "var(--q-medium)",   icon: "◆" },
    low:      { label: "LOW",      bg: "var(--q-low-bg)",      color: "var(--q-low)",      icon: "▼" },
    info:     { label: "INFO",     bg: "var(--q-info-bg)",     color: "var(--q-info)",     icon: "ℹ" },
  }[severity] || { label: severity.toUpperCase(), bg: "var(--q-surface-sunken)", color: "var(--q-text)", icon: "•" };

  return (
    <span
      className={`q-badge ${className}`}
      style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.color}33` }}
      aria-label={`Severity: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

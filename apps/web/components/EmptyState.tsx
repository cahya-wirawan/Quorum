import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  checkedScope?: {
    lanes: string[];
    filesReviewed: number;
    filesSkimmed: number;
    analyzersPassed: string[];
  };
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  checkedScope,
  actionText,
  onAction,
}) => {
  return (
    <div
      className="q-card"
      style={{
        textAlign: "center",
        padding: "var(--q-7) var(--q-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: "32px", marginBottom: "var(--q-2)" }}>🛡️</div>
      <h3 style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-semibold)" }}>{title}</h3>
      {description && (
        <p style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)", maxWidth: "450px", marginTop: "var(--q-2)" }}>
          {description}
        </p>
      )}

      {checkedScope && (
        <div
          style={{
            marginTop: "var(--q-4)",
            textAlign: "left",
            backgroundColor: "var(--q-surface-sunken)",
            padding: "var(--q-3) var(--q-4)",
            borderRadius: "var(--q-radius)",
            fontSize: "var(--q-fs-xs)",
            color: "var(--q-text-muted)",
          }}
        >
          <div style={{ fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-1)" }}>Legible Silence — What was checked:</div>
          <div>Lanes: {checkedScope.lanes.join(", ")}</div>
          <div>Deeply reviewed: {checkedScope.filesReviewed} files · Skimmed: {checkedScope.filesSkimmed} files</div>
          <div>Ground truth analyzers: {checkedScope.analyzersPassed.join(", ")} (all passed)</div>
        </div>
      )}

      {actionText && onAction && (
        <button
          type="button"
          className="q-btn q-btn-primary"
          style={{ marginTop: "var(--q-4)" }}
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

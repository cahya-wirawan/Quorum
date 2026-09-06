import React from "react";

interface BannerProps {
  type?: "warn" | "danger" | "info";
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const Banner: React.FC<BannerProps> = ({
  type = "warn",
  message,
  actionText,
  onAction,
}) => {
  const styles = {
    warn:   { bg: "var(--q-medium-bg)", color: "var(--q-medium)", border: "var(--q-medium)" },
    danger: { bg: "var(--q-critical-bg)", color: "var(--q-critical)", border: "var(--q-critical)" },
    info:   { bg: "var(--q-accent-soft)", color: "var(--q-accent)", border: "var(--q-accent)" },
  }[type];

  return (
    <div
      role="alert"
      style={{
        padding: "var(--q-2) var(--q-4)",
        backgroundColor: styles.bg,
        color: styles.color,
        borderBottom: `1px solid ${styles.border}44`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "var(--q-fs-sm)",
      }}
    >
      <span>{message}</span>
      {actionText && onAction && (
        <button
          type="button"
          className="q-btn"
          style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

import React from "react";

interface ConfidenceMeterProps {
  score: number; // 0.0 to 1.0
  calibrated?: boolean;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ score, calibrated = true }) => {
  // Map 0..1 into 5 segments
  const segments = [0.2, 0.4, 0.6, 0.8, 1.0];
  const rounded = Math.round(score * 100);

  let label = "Low";
  if (score >= 0.85) label = "Definite";
  else if (score >= 0.75) label = "Probable";
  else if (score >= 0.6) label = "Likely";
  else if (score >= 0.4) label = "Uncertain";

  return (
    <div
      style={{ display: "inline-flex", alignItems: "center", gap: "var(--q-2)" }}
      title={calibrated ? `Calibrated confidence: ${rounded}% (${label})` : `Raw model confidence: ${rounded}%`}
    >
      <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
        {segments.map((seg, i) => (
          <span
            key={i}
            style={{
              width: "5px",
              height: "12px",
              borderRadius: "1px",
              backgroundColor: score >= seg - 0.1 ? "var(--q-accent)" : "var(--q-border)",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", fontFamily: "var(--q-font-mono)", fontWeight: "var(--q-fw-medium)" }}>
        {label}
      </span>
    </div>
  );
};

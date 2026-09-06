import React from "react";
import { RunSummary } from "../lib/mockData";

interface VerdictBannerProps {
  run: RunSummary;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({ run }) => {
  const isClean = run.verdict === "clean";
  const hasDegraded = run.lanes_degraded && run.lanes_degraded.length > 0;

  return (
    <div
      className="q-card"
      style={{
        borderLeft: isClean ? "4px solid var(--q-ok)" : "4px solid var(--q-warn)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "var(--q-3)",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)" }}>
          <span
            className="q-badge"
            style={{
              backgroundColor: isClean ? "var(--q-ok)20" : "var(--q-warn)20",
              color: isClean ? "var(--q-ok)" : "var(--q-warn)",
            }}
          >
            {run.verdict.toUpperCase()}
          </span>
          <h2 style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-semibold)" }}>
            {isClean
              ? "All lanes completed with zero actionable defects"
              : `${run.posted_count} issue${run.posted_count === 1 ? "" : "s"} worth attention · ${run.held_count} held`}
          </h2>
        </div>
        <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", marginTop: "var(--q-1)" }}>
          Lanes: {run.lanes_run.join(", ")} · pipeline {run.pipeline_version} · run key {run.head_sha}
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--q-4)", alignItems: "center", fontSize: "var(--q-fs-sm)" }}>
        <div>
          <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)" }}>DURATION</div>
          <div style={{ fontWeight: "var(--q-fw-medium)" }}>{run.duration_seconds}s</div>
        </div>
        <div>
          <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)" }}>CREDITS</div>
          <div style={{ fontWeight: "var(--q-fw-medium)" }}>{(run.cost_estimate_usd * 10).toFixed(1)}</div>
        </div>
        <div>
          <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)" }}>EST. COST</div>
          <div style={{ fontWeight: "var(--q-fw-medium)" }}>${run.cost_estimate_usd.toFixed(2)}</div>
        </div>
      </div>

      {hasDegraded && (
        <div
          style={{
            width: "100%",
            backgroundColor: "var(--q-warn)15",
            color: "var(--q-warn)",
            padding: "var(--q-2) var(--q-3)",
            borderRadius: "var(--q-radius-sm)",
            fontSize: "var(--q-fs-xs)",
          }}
        >
          Warning: Degraded lanes: {run.lanes_degraded.join(", ")}. Findings may be incomplete for these domains.
        </div>
      )}
    </div>
  );
};

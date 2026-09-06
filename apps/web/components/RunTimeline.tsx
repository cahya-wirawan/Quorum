import React from "react";
import { TraceNode } from "../lib/mockData";

interface RunTimelineProps {
  nodes: TraceNode[];
}

export const RunTimeline: React.FC<RunTimelineProps> = ({ nodes }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-2)" }}>
      {nodes.map((node) => {
        const isEscalated = !!node.escalation_trigger;
        const tierColor = {
          tier_1_cheap: "var(--q-text-muted)",
          tier_2_mid: "var(--q-accent)",
          tier_3_strong: "var(--q-high)",
        }[node.tier] || "var(--q-text)";

        return (
          <div
            key={node.id}
            className="q-card"
            style={{
              padding: "var(--q-3)",
              borderLeft: isEscalated ? "4px solid var(--q-high)" : "4px solid var(--q-ok)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--q-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)" }}>
                <span style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>{node.node_name}</span>
                <span
                  className="q-badge"
                  style={{
                    backgroundColor: "var(--q-surface-sunken)",
                    color: tierColor,
                    border: `1px solid ${tierColor}44`,
                  }}
                >
                  {node.tier.replace(/_/g, " ").toUpperCase()}
                </span>
                <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)", fontFamily: "var(--q-font-mono)" }}>
                  {node.model} ({node.prompt_version})
                </span>
              </div>

              <div style={{ display: "flex", gap: "var(--q-3)", fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                <span>{node.duration_ms}ms</span>
                <span>{node.tokens_in + node.tokens_out} tokens</span>
                <span>${node.cost_usd.toFixed(4)}</span>
              </div>
            </div>

            {isEscalated && (
              <div
                style={{
                  marginTop: "var(--q-2)",
                  padding: "var(--q-2)",
                  backgroundColor: "var(--q-high-bg)",
                  borderRadius: "var(--q-radius-sm)",
                  color: "var(--q-high)",
                  fontSize: "var(--q-fs-xs)",
                }}
              >
                <strong>Escalated from {node.escalated_from}:</strong> {node.escalation_trigger}
              </div>
            )}

            {node.route_reason && !isEscalated && (
              <div style={{ marginTop: "var(--q-1)", fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", fontStyle: "italic" }}>
                Route reason: {node.route_reason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

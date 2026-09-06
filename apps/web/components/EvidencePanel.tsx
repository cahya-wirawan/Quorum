import React from "react";
import { Finding } from "../lib/mockData";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { EvidenceClassChip } from "./EvidenceClassChip";
import { SeverityChip } from "./SeverityChip";

interface EvidencePanelProps {
  finding?: Finding | null;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ finding }) => {
  if (!finding) {
    return (
      <div className="q-card" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)" }}>Select a finding to inspect evidence</p>
      </div>
    );
  }

  return (
    <div className="q-card" style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
      {/* Finding Overview */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", marginBottom: "var(--q-2)" }}>
          <SeverityChip severity={finding.severity} />
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>{finding.lane}</span>
        </div>
        <h4 style={{ fontSize: "var(--q-fs-lg)", fontWeight: "var(--q-fw-semibold)" }}>{finding.title}</h4>
        <p style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text)", marginTop: "var(--q-1)" }}>{finding.claim}</p>
        <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", marginTop: "var(--q-2)" }}>{finding.rationale}</p>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--q-border)" }} />

      {/* Adversarial Verification Box */}
      <div
        style={{
          padding: "var(--q-3)",
          borderRadius: "var(--q-radius)",
          backgroundColor: "var(--q-surface-sunken)",
          border: "1px solid var(--q-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-2)" }}>
          <span style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Adversarial Verifier
          </span>
          <span
            className="q-badge"
            style={{
              backgroundColor: finding.verification?.verdict === "confirmed" ? "var(--q-ok)20" : "var(--q-critical)20",
              color: finding.verification?.verdict === "confirmed" ? "var(--q-ok)" : "var(--q-critical)",
            }}
          >
            {finding.verification?.verdict.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", fontStyle: "italic" }}>
          &ldquo;{finding.verification?.refutation_attempt || "No refutation recorded."}&rdquo;
        </p>
        <div style={{ display: "flex", gap: "var(--q-3)", marginTop: "var(--q-2)", fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)" }}>
          <span>Tools called: {finding.verification?.tool_calls_count || 0}</span>
          <span>Latency: {finding.verification?.duration_ms || 0}ms</span>
        </div>
      </div>

      {/* Evidence Items */}
      <div>
        <h5 style={{ fontSize: "var(--q-fs-sm)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-2)" }}>
          Ground Truth Evidence ({finding.evidence.length})
        </h5>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
          {finding.evidence.map((ev, i) => (
            <div
              key={i}
              style={{
                padding: "var(--q-3)",
                border: "1px solid var(--q-border)",
                borderRadius: "var(--q-radius-sm)",
                backgroundColor: "var(--q-surface)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-1)" }}>
                <EvidenceClassChip cls={ev.cls} />
                <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)" }}>{ev.source}</span>
              </div>
              {ev.file_path && (
                <div style={{ fontSize: "var(--q-fs-xs)", fontFamily: "var(--q-font-mono)", color: "var(--q-text-muted)", marginTop: "var(--q-1)" }}>
                  {ev.file_path}:{ev.start_line}-{ev.end_line}
                </div>
              )}
              {ev.excerpt && (
                <pre
                  className="q-code"
                  style={{
                    display: "block",
                    marginTop: "var(--q-2)",
                    padding: "var(--q-2)",
                    fontSize: "11px",
                    overflowX: "auto",
                  }}
                >
                  {ev.excerpt}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Calibration */}
      <div style={{ marginTop: "auto", paddingTop: "var(--q-3)", borderTop: "1px solid var(--q-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Calibrated Confidence</span>
          <ConfidenceMeter score={finding.calibrated_confidence} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--q-1)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Rank Score</span>
          <span className="q-code" style={{ fontSize: "var(--q-fs-xs)" }}>{finding.rank_score.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

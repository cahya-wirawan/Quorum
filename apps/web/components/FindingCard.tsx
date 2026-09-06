import React, { useState } from "react";
import { Finding } from "../lib/mockData";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { EvidenceClassChip } from "./EvidenceClassChip";
import { SeverityChip } from "./SeverityChip";

interface FindingCardProps {
  finding: Finding;
  isSelected?: boolean;
  onSelect?: () => void;
  onDismiss?: (findingId: string, reason: string, comment?: string) => void;
  onPostHeld?: (findingId: string) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  isSelected = false,
  onSelect,
  onDismiss,
  onPostHeld,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissReason, setDismissReason] = useState("not-a-bug");
  const [dismissComment, setDismissComment] = useState("");

  return (
    <div
      className="q-card"
      style={{
        marginBottom: "var(--q-3)",
        cursor: onSelect ? "pointer" : "default",
        borderLeft: isSelected ? "4px solid var(--q-accent)" : undefined,
        backgroundColor: isSelected ? "var(--q-surface-sunken)" : "var(--q-surface)",
      }}
      onClick={onSelect}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--q-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", flexWrap: "wrap" }}>
          <SeverityChip severity={finding.severity} />
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", fontFamily: "var(--q-font-mono)" }}>
            {finding.lane} · {finding.category}
          </span>
          <ConfidenceMeter score={finding.calibrated_confidence} />
        </div>
        <span
          className="q-badge"
          style={{
            backgroundColor:
              finding.status === "posted" ? "var(--q-accent-soft)" : "var(--q-surface-sunken)",
            color: finding.status === "posted" ? "var(--q-accent)" : "var(--q-text-muted)",
          }}
        >
          {finding.status.toUpperCase()}
        </span>
      </div>

      <h3 style={{ fontSize: "var(--q-fs-lg)", fontWeight: "var(--q-fw-semibold)", marginTop: "var(--q-2)" }}>
        {finding.title}
      </h3>

      <p style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text)", marginTop: "var(--q-1)" }}>
        {finding.claim}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--q-3)", marginTop: "var(--q-3)" }}>
        <span className="q-code">
          {finding.file_path}:{finding.start_line}
          {finding.end_line && finding.end_line !== finding.start_line ? `-${finding.end_line}` : ""}
        </span>
        <div style={{ display: "flex", gap: "var(--q-1)", flexWrap: "wrap" }}>
          {finding.evidence.map((ev, i) => (
            <EvidenceClassChip key={i} cls={ev.cls} />
          ))}
        </div>
      </div>

      {finding.suggested_patch && (
        <div style={{ marginTop: "var(--q-3)" }}>
          <button
            type="button"
            className="q-btn"
            style={{ padding: "2px 8px", fontSize: "var(--q-fs-xs)" }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? "Hide suggested fix" : "View suggested fix"}
          </button>
          {isExpanded && (
            <pre
              className="q-code"
              style={{
                display: "block",
                marginTop: "var(--q-2)",
                padding: "var(--q-2)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {finding.suggested_patch}
            </pre>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "var(--q-2)",
          marginTop: "var(--q-3)",
          borderTop: "1px solid var(--q-border)",
          paddingTop: "var(--q-2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {finding.status === "held" && onPostHeld && (
          <button
            type="button"
            className="q-btn q-btn-primary"
            style={{ fontSize: "var(--q-fs-xs)", padding: "4px 10px" }}
            onClick={() => onPostHeld(finding.id)}
          >
            Post to PR
          </button>
        )}
        {finding.status !== "suppressed" && onDismiss && (
          <button
            type="button"
            className="q-btn"
            style={{ fontSize: "var(--q-fs-xs)", padding: "4px 10px" }}
            onClick={() => setShowDismissModal(true)}
          >
            Dismiss...
          </button>
        )}
      </div>

      {/* Dismiss Reason Modal */}
      {showDismissModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDismissModal(false)}
        >
          <div
            className="q-card"
            style={{ width: "400px", maxWidth: "90vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ fontSize: "var(--q-fs-lg)", fontWeight: "var(--q-fw-semibold)" }}>Dismiss finding</h4>
            <p style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)", marginTop: "var(--q-1)" }}>
              Reason feeds per-repo confidence calibration and suppressions.
            </p>
            <div style={{ marginTop: "var(--q-3)" }}>
              <select
                style={{
                  width: "100%",
                  padding: "var(--q-2)",
                  borderRadius: "var(--q-radius-sm)",
                  border: "1px solid var(--q-border)",
                  backgroundColor: "var(--q-surface)",
                  color: "var(--q-text)",
                }}
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
              >
                <option value="not-a-bug">Not a bug / false positive</option>
                <option value="not-our-convention">Not our team convention</option>
                <option value="wont-fix">Intentional design / won&apos;t fix</option>
                <option value="already-handled">Already handled in callers/guards</option>
              </select>
            </div>
            <div style={{ marginTop: "var(--q-3)" }}>
              <label style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", display: "block", marginBottom: "4px" }}>
                Optional explanation / context:
              </label>
              <textarea
                rows={2}
                placeholder="Why is this finding being dismissed?"
                value={dismissComment}
                onChange={(e) => setDismissComment(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--q-2)",
                  borderRadius: "var(--q-radius-sm)",
                  border: "1px solid var(--q-border)",
                  backgroundColor: "var(--q-surface)",
                  color: "var(--q-text)",
                  fontFamily: "inherit",
                  fontSize: "var(--q-fs-xs)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--q-2)", marginTop: "var(--q-4)" }}>
              <button type="button" className="q-btn" onClick={() => setShowDismissModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="q-btn q-btn-danger"
                onClick={() => {
                  onDismiss?.(finding.id, dismissReason, dismissComment);
                  setShowDismissModal(false);
                }}
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

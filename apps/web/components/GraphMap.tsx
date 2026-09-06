import React, { useState } from "react";

export const GraphMap: React.FC = () => {
  const [showTextOutline, setShowTextOutline] = useState(false);

  const stages = [
    { name: "ingest", desc: "Fetch PR diff, commits, and webhook payload" },
    { name: "triage", desc: "Gate check: full review vs skip (lockfile/vendored)" },
    { name: "deterministic", desc: "Run linters, type checkers, SAST ground truth" },
    { name: "retrieval", desc: "Retrieve AST symbol definitions and test references" },
    { name: "lanes fan-out", desc: "Execute correctness, security, api_contract, tests in parallel" },
    { name: "dedupe_merge", desc: "Deduplicate findings across lanes into candidate hypotheses" },
    { name: "verify fan-out", desc: "Adversarial verifier attempts to refute each candidate" },
    { name: "calibrate & rank", desc: "Apply budget cap (8) and severity x confidence score" },
    { name: "policy gate", desc: "Check run conclusion & auto-fix approval gate" },
    { name: "publish", desc: "Batch single-review post to Git host" },
    { name: "learn", desc: "Record feedback and update confidence calibration" },
  ];

  return (
    <div className="q-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-3)" }}>
        <h4 style={{ fontSize: "var(--q-fs-sm)", fontWeight: "var(--q-fw-semibold)" }}>LangGraph Pipeline Topology</h4>
        <button
          type="button"
          className="q-btn"
          style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
          onClick={() => setShowTextOutline(!showTextOutline)}
        >
          {showTextOutline ? "Show visual graph" : "Show text outline (a11y)"}
        </button>
      </div>

      {showTextOutline ? (
        <ol style={{ paddingLeft: "var(--q-4)", fontSize: "var(--q-fs-xs)", lineHeight: "var(--q-lh-base)" }}>
          {stages.map((s, idx) => (
            <li key={idx} style={{ marginBottom: "var(--q-1)" }}>
              <strong>{s.name}:</strong> {s.desc}
            </li>
          ))}
        </ol>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--q-2)" }}>
          {stages.map((s, idx) => (
            <React.Fragment key={idx}>
              <div
                style={{
                  padding: "var(--q-2) var(--q-3)",
                  borderRadius: "var(--q-radius-sm)",
                  border: "1px solid var(--q-border)",
                  backgroundColor: "var(--q-surface-sunken)",
                  fontSize: "var(--q-fs-xs)",
                  fontWeight: "var(--q-fw-medium)",
                }}
                title={s.desc}
              >
                {s.name}
              </div>
              {idx < stages.length - 1 && <span style={{ color: "var(--q-text-faint)" }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "../../../../lib/api";
import { Finding, RunSummary } from "../../../../lib/mockData";
import { VerdictBanner } from "../../../../components/VerdictBanner";
import { FindingCard } from "../../../../components/FindingCard";
import { DiffViewer } from "../../../../components/DiffViewer";
import { EvidencePanel } from "../../../../components/EvidencePanel";
import { EmptyState } from "../../../../components/EmptyState";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const runId = resolvedParams.id;

  const [run, setRun] = useState<RunSummary | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posted" | "held" | "suppressed" | "refuted">("posted");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getRun(runId).then((r) => {
      if (r) setRun(r);
    });
    api.getFindings(runId).then((f) => {
      setFindings(f);
      if (f.length > 0) {
        setSelectedFindingId(f[0].id);
      }
    });
  }, [runId]);

  const selectedFinding = findings.find((f) => f.id === selectedFindingId) || findings[0] || null;

  const postedFindings = findings.filter((f) => f.status === "posted");
  const heldFindings = findings.filter((f) => f.status === "held");
  const suppressedFindings = findings.filter((f) => f.status === "suppressed");
  const refutedFindings = findings.filter((f) => f.status === "refuted");

  const currentList =
    activeTab === "posted"
      ? postedFindings
      : activeTab === "held"
      ? heldFindings
      : activeTab === "suppressed"
      ? suppressedFindings
      : refutedFindings;

  const handleDismiss = (id: string, reason: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "suppressed" as const } : f))
    );
    setStatusMessage(`Finding ${id} dismissed (${reason})`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handlePostHeld = (id: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "posted" as const } : f))
    );
    setStatusMessage(`Held finding ${id} posted to PR review`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const copyPermalink = () => {
    navigator.clipboard.writeText(window.location.href);
    setStatusMessage("Permalink copied to clipboard!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", gap: "var(--q-3)" }}>
      {/* Top Banner / Verdict */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)" }}>
            <Link href="/runs" style={{ color: "var(--q-text-muted)", textDecoration: "none", fontSize: "var(--q-fs-sm)" }}>
              ← Reviews Inbox
            </Link>
            <span style={{ color: "var(--q-text-faint)" }}>/</span>
            <span style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>
              {run?.repo_id || "repo"} #{run?.pr_number || "PR"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "var(--q-2)", alignItems: "center" }}>
            {statusMessage && (
              <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-ok)", fontWeight: "var(--q-fw-medium)" }}>
                ✓ {statusMessage}
              </span>
            )}
            <button type="button" className="q-btn" onClick={copyPermalink}>
              Copy Permalink
            </button>
            <Link href={`/runs/${runId}/trace`} className="q-btn">
              View Trace (S06)
            </Link>
            <button type="button" className="q-btn q-btn-primary" onClick={() => alert("Re-run triggered")}>
              Re-run Review
            </button>
          </div>
        </div>

        {run && <VerdictBanner run={run} />}
      </div>

      {findings.length === 0 ? (
        <EmptyState
          title="Clean Review — Zero Actionable Defects"
          description="Quorum evaluated all enabled lanes against this pull request. No blocking defects or evidence-backed regressions were discovered."
          checkedScope={{
            lanes: ["correctness", "security", "api_contract", "tests", "style"],
            filesReviewed: 14,
            filesSkimmed: 3,
            analyzersPassed: ["ruff", "bandit", "semgrep", "mypy"],
          }}
        />
      ) : (
        /* 3-Pane Review Detail Layout (S05) */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr 380px",
            gap: "var(--q-3)",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Left Pane: Findings List */}
          <section
            aria-label="Findings Navigation"
            className="q-card"
            style={{ display: "flex", flexDirection: "column", padding: "var(--q-3)", overflowY: "hidden" }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "var(--q-1)",
                borderBottom: "1px solid var(--q-border)",
                paddingBottom: "var(--q-2)",
                marginBottom: "var(--q-3)",
              }}
            >
              <button
                type="button"
                className="q-btn"
                style={{
                  fontSize: "var(--q-fs-xs)",
                  padding: "4px 8px",
                  backgroundColor: activeTab === "posted" ? "var(--q-surface-sunken)" : "transparent",
                  fontWeight: activeTab === "posted" ? "var(--q-fw-bold)" : "normal",
                }}
                onClick={() => setActiveTab("posted")}
              >
                Posted ({postedFindings.length})
              </button>
              <button
                type="button"
                className="q-btn"
                style={{
                  fontSize: "var(--q-fs-xs)",
                  padding: "4px 8px",
                  backgroundColor: activeTab === "held" ? "var(--q-surface-sunken)" : "transparent",
                  fontWeight: activeTab === "held" ? "var(--q-fw-bold)" : "normal",
                }}
                onClick={() => setActiveTab("held")}
              >
                Held ({heldFindings.length})
              </button>
              <button
                type="button"
                className="q-btn"
                style={{
                  fontSize: "var(--q-fs-xs)",
                  padding: "4px 8px",
                  backgroundColor: activeTab === "suppressed" ? "var(--q-surface-sunken)" : "transparent",
                  fontWeight: activeTab === "suppressed" ? "var(--q-fw-bold)" : "normal",
                }}
                onClick={() => setActiveTab("suppressed")}
              >
                Suppressed ({suppressedFindings.length})
              </button>
              <button
                type="button"
                className="q-btn"
                style={{
                  fontSize: "var(--q-fs-xs)",
                  padding: "4px 8px",
                  backgroundColor: activeTab === "refuted" ? "var(--q-surface-sunken)" : "transparent",
                  fontWeight: activeTab === "refuted" ? "var(--q-fw-bold)" : "normal",
                }}
                onClick={() => setActiveTab("refuted")}
              >
                Refuted ({refutedFindings.length})
              </button>
            </div>

            {/* Scrollable list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {currentList.length === 0 ? (
                <div style={{ padding: "var(--q-4)", textAlign: "center", color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)" }}>
                  No {activeTab} findings.
                </div>
              ) : (
                currentList.map((f) => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    isSelected={f.id === selectedFinding?.id}
                    onSelect={() => setSelectedFindingId(f.id)}
                    onDismiss={handleDismiss}
                    onPostHeld={handlePostHeld}
                  />
                ))
              )}
            </div>
          </section>

          {/* Center Pane: Diff Viewer */}
          <section aria-label="Code Diff Viewer" style={{ minHeight: 0, overflowY: "hidden" }}>
            <DiffViewer
              filePath={selectedFinding?.file_path || "payments/refund.py"}
              highlightLineStart={selectedFinding?.start_line || 118}
              highlightLineEnd={selectedFinding?.end_line || 124}
            />
          </section>

          {/* Right Pane: Evidence and Verdict Panel */}
          <section aria-label="Evidence & Analysis" style={{ minHeight: 0, overflowY: "hidden" }}>
            <EvidencePanel finding={selectedFinding} />
          </section>
        </div>
      )}
    </div>
  );
}

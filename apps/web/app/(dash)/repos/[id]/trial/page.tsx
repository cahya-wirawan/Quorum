"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { api } from "../../../../../lib/api";
import { Finding, TraceNode } from "../../../../../lib/mockData";
import { RunTimeline } from "../../../../../components/RunTimeline";
import { FindingCard } from "../../../../../components/FindingCard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GuidedFirstReviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const repoId = decodeURIComponent(resolvedParams.id || "acme/payment-gateway");

  const [selectedPr, setSelectedPr] = useState("PR #142 — Fix idempotency race in refund processor");
  const [budget, setBudget] = useState(8);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [traceNodes, setTraceNodes] = useState<TraceNode[]>([]);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    api.getFindings("run_pr_142_refund_race").then(setFindings);
    api.getTrace("run_pr_142_refund_race").then(setTraceNodes);
  }, []);

  const handleStartTrial = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 1500);
  };

  const handleActivateRepo = async () => {
    await api.updateRepoState(repoId, "active");
    setActivated(true);
  };

  // Dynamically partition findings based on budget slider without re-running
  const postedFindings = findings.slice(0, budget);
  const heldFindings = findings.slice(budget);

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", marginBottom: "var(--q-1)" }}>
          <Link href="/repos" style={{ color: "var(--q-text-muted)", textDecoration: "none", fontSize: "var(--q-fs-sm)" }}>
            ← Repositories
          </Link>
          <span style={{ color: "var(--q-text-faint)" }}>/</span>
          <span style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)" }}>{repoId}</span>
        </div>
        <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
          Guided First Review (S03)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          Show value safely before Quorum posts anything publicly. Trial reviews are locked in <code>observe</code> mode.
        </p>
      </div>

      {activated && (
        <div className="q-card" style={{ backgroundColor: "var(--q-ok-bg)", border: "1px solid var(--q-ok)", padding: "var(--q-4)" }}>
          <h4 style={{ color: "var(--q-ok)", fontWeight: "var(--q-fw-bold)" }}>🎉 Repository Activated!</h4>
          <p style={{ fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            Quorum will now automatically review upcoming pull requests to <strong>{repoId}</strong> and post high-confidence proven findings directly to PR threads.
          </p>
          <div style={{ marginTop: "var(--q-3)", display: "flex", gap: "var(--q-2)" }}>
            <Link href="/runs" className="q-btn q-btn-primary">Go to Reviews Inbox</Link>
            <Link href="/org/members" className="q-btn">Invite Team Members</Link>
          </div>
        </div>
      )}

      {/* PR Selection & Trigger Card */}
      <div className="q-card" style={{ padding: "var(--q-4)" }}>
        <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-3)" }}>
          Select a Historical PR for Trial Simulation
        </h3>
        <div style={{ display: "flex", gap: "var(--q-3)", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedPr}
            onChange={(e) => setSelectedPr(e.target.value)}
            style={{
              flex: 1,
              minWidth: "300px",
              padding: "var(--q-2) var(--q-3)",
              borderRadius: "var(--q-radius-sm)",
              border: "1px solid var(--q-border)",
              backgroundColor: "var(--q-surface)",
              color: "var(--q-text)",
              fontSize: "var(--q-fs-sm)",
            }}
          >
            <option>PR #142 — Fix idempotency race in refund processor (Merged 2 days ago)</option>
            <option>PR #139 — Upgrade cryptography dependency and refactor RSA verify (Merged 5 days ago)</option>
            <option>PR #128 — Add stripe webhook verification and handler (Merged 12 days ago)</option>
          </select>

          <button
            type="button"
            className="q-btn q-btn-primary"
            disabled={isRunning}
            onClick={handleStartTrial}
          >
            {isRunning ? "Simulating Review Pipeline..." : "Run Trial Review"}
          </button>
        </div>
      </div>

      {/* Live Simulation Timeline */}
      {isRunning && (
        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <h4 style={{ fontSize: "var(--q-fs-sm)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-3)" }}>
            Simulating LangGraph Review Pipeline...
          </h4>
          <RunTimeline nodes={traceNodes.slice(0, 3)} />
        </div>
      )}

      {hasRun && !isRunning && (
        <>
          {/* Comment Budget Slider & Rerank Controls */}
          <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
                  Dynamic Comment Budget: <strong>{budget}</strong>
                </h4>
                <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                  AC-032 / FR-031: Quorum strictly caps inline comments per review to prevent alert fatigue. Drag to simulate ranking thresholds.
                </p>
              </div>

              <div style={{ display: "flex", gap: "var(--q-2)" }}>
                {!activated && (
                  <button type="button" className="q-btn q-btn-primary" onClick={handleActivateRepo}>
                    ✓ Activate {repoId} for Live Reviews
                  </button>
                )}
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="15"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--q-accent)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
              <span>Strict Focus (1 comment)</span>
              <span>Default Cap (8 comments)</span>
              <span>Comprehensive (15 comments)</span>
            </div>
          </div>

          {/* Side-by-Side: What would post vs What stayed in dashboard */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--q-4)" }}>
            {/* Left: What Would Have Been Posted to Git Host */}
            <div className="q-card" style={{ padding: "var(--q-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-3)" }}>
                <div>
                  <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", color: "var(--q-ok)" }}>
                    📬 Would Post to GitHub ({postedFindings.length})
                  </h4>
                  <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                    Highest calibrated confidence, within budget cap
                  </span>
                </div>
                <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)" }}>
                  INLINE ON PR
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
                {postedFindings.length === 0 ? (
                  <p style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)" }}>Budget set to 0. No comments posted.</p>
                ) : (
                  postedFindings.map((f) => (
                    <FindingCard key={f.id} finding={{ ...f, status: "posted" }} />
                  ))
                )}
              </div>
            </div>

            {/* Right: What Stayed in the Dashboard */}
            <div className="q-card" style={{ padding: "var(--q-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-3)" }}>
                <div>
                  <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", color: "var(--q-text-muted)" }}>
                    🛡️ Held Below Budget ({heldFindings.length})
                  </h4>
                  <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                    Available in Quorum Dashboard without PR clutter
                  </span>
                </div>
                <span className="q-badge" style={{ backgroundColor: "var(--q-surface-sunken)", color: "var(--q-text-muted)" }}>
                  DASHBOARD ONLY
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
                {heldFindings.length === 0 ? (
                  <p style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)" }}>All findings fit within the current budget.</p>
                ) : (
                  heldFindings.map((f) => (
                    <FindingCard key={f.id} finding={{ ...f, status: "held" }} />
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

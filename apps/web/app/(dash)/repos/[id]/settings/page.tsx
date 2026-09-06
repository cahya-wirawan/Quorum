"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { PolicyDialog } from "../../../../../components/PolicyDialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RepositorySettingsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const repoId = decodeURIComponent(resolvedParams.id || "acme/payment-gateway");

  // State & Scope
  const [reviewState, setReviewState] = useState<"disabled" | "observe" | "active">("active");
  const [branchFilter, setBranchFilter] = useState("main, release/*");
  const [pathExclude, setPathExclude] = useState("vendor/**, *.min.js, migrations/**");
  const [handleDrafts, setHandleDrafts] = useState(false);
  const [handleBots, setHandleBots] = useState(false);

  // Budget & Ranking
  const [budget, setBudget] = useState(8);
  const [minSeverity, setMinSeverity] = useState("low");
  const [styleAdvisories, setStyleAdvisories] = useState(false);

  // Lanes
  const [lanes, setLanes] = useState({
    correctness: true,
    security: true,
    api_contract: true,
    tests: true,
    style: false,
  });

  // Policy & Escalations
  const [conclusionBlocking, setConclusionBlocking] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [mayApprove, setMayApprove] = useState(false);

  // Modal for typed confirmation
  const [pendingPolicyAction, setPendingPolicyAction] = useState<{
    key: "blocking" | "auto_fix" | "approve";
    title: string;
    description: string;
    keyword: string;
  } | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const toggleLane = (laneKey: keyof typeof lanes) => {
    setLanes((prev) => ({ ...prev, [laneKey]: !prev[laneKey] }));
  };

  const handleEscalationToggle = (key: "blocking" | "auto_fix" | "approve", currentVal: boolean) => {
    if (!currentVal) {
      // Enabling policy escalation requires typed confirmation
      if (key === "blocking") {
        setPendingPolicyAction({
          key,
          title: "Enable Blocking CI Check Runs",
          description: "This allows Quorum to fail GitHub Check Runs and block PR merges when Critical/High defects are confirmed.",
          keyword: "ENABLE BLOCKING",
        });
      } else if (key === "auto_fix") {
        setPendingPolicyAction({
          key,
          title: "Enable Autonomous Pull Request Auto-Fix",
          description: "This allows Quorum to push remediation commits or open fix PRs with human maintainer pause gates [AC-045].",
          keyword: "ENABLE AUTO FIX",
        });
      } else if (key === "approve") {
        setPendingPolicyAction({
          key,
          title: "Authorize Quorum Bot PR Approval",
          description: "This permits Quorum to submit official GitHub PR APPROVAL reviews when all lanes pass cleanly [AC-046].",
          keyword: "AUTHORIZE APPROVAL",
        });
      }
    } else {
      if (key === "blocking") setConclusionBlocking(false);
      if (key === "auto_fix") setAutoFixEnabled(false);
      if (key === "approve") setMayApprove(false);
    }
  };

  const confirmPolicyEscalation = () => {
    if (pendingPolicyAction?.key === "blocking") setConclusionBlocking(true);
    if (pendingPolicyAction?.key === "auto_fix") setAutoFixEnabled(true);
    if (pendingPolicyAction?.key === "approve") setMayApprove(true);
    setPendingPolicyAction(null);
    setNotification("Policy escalation confirmed and saved.");
    setTimeout(() => setNotification(null), 3000);
  };

  const generatedYaml = `# .quorum.yaml for ${repoId}
version: 1
state: ${reviewState}

scope:
  branches: [${branchFilter.split(",").map((s) => `"${s.trim()}"`).join(", ")}]
  exclude: [${pathExclude.split(",").map((s) => `"${s.trim()}"`).join(", ")}]
  drafts: ${handleDrafts}
  bots: ${handleBots}

budget:
  max_inline_comments: ${budget}
  min_severity: "${minSeverity}"
  include_style_advisories: ${styleAdvisories}

lanes:
  correctness: ${lanes.correctness}
  security: ${lanes.security}
  api_contract: ${lanes.api_contract}
  tests: ${lanes.tests}
  style: ${lanes.style}

policy:
  check_run_blocking: ${conclusionBlocking}
  auto_fix: ${autoFixEnabled}
  may_approve: ${mayApprove}
`;

  const copyYaml = () => {
    navigator.clipboard.writeText(generatedYaml);
    setNotification("Copied .quorum.yaml to clipboard!");
    setTimeout(() => setNotification(null), 3000);
  };

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
          Repository Configuration (S07)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          Manage review scope, comment budget caps, active analysis lanes, and policy gates.
        </p>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {notification}
        </div>
      )}

      {/* Grid: Settings on left, Effective Config & YAML on right */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "var(--q-5)" }}>
        {/* Left Column: Form Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
          {/* Section 1: State & Scope */}
          <fieldset className="q-card" style={{ padding: "var(--q-4)", border: "1px solid var(--q-border)" }}>
            <legend style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-base)", padding: "0 var(--q-2)" }}>
              State &amp; Scope
            </legend>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)", marginTop: "var(--q-2)" }}>
              <div>
                <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                  Operational State
                </label>
                <select
                  value={reviewState}
                  onChange={(e) => setReviewState(e.target.value as any)}
                  style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
                >
                  <option value="disabled">Disabled (Do not run)</option>
                  <option value="observe">Observe (Record to dashboard only; quiet mode)</option>
                  <option value="active">Active (Post proven inline review comments to PRs)</option>
                </select>
                <div style={{ fontSize: "11px", color: "var(--q-text-muted)", marginTop: "4px" }}>
                  Layer: <strong style={{ color: "var(--q-accent)" }}>repo UI</strong> (overrides org default)
                </div>
              </div>

              <div>
                <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                  Branch Filters (comma-separated globs)
                </label>
                <input
                  type="text"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                  Path Exclusion Filters
                </label>
                <input
                  type="text"
                  value={pathExclude}
                  onChange={(e) => setPathExclude(e.target.value)}
                  style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--q-4)", marginTop: "var(--q-2)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={handleDrafts}
                    onChange={(e) => setHandleDrafts(e.target.checked)}
                  />
                  Review draft PRs
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={handleBots}
                    onChange={(e) => setHandleBots(e.target.checked)}
                  />
                  Review bot PRs (e.g. Dependabot)
                </label>
              </div>
            </div>
          </fieldset>

          {/* Section 2: Comment Budget & Ranking */}
          <fieldset className="q-card" style={{ padding: "var(--q-4)", border: "1px solid var(--q-border)" }}>
            <legend style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-base)", padding: "0 var(--q-2)" }}>
              Comment Budget &amp; Ranking (AC-032)
            </legend>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)", marginTop: "var(--q-2)" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)" }}>
                    Maximum Inline Comments: <strong>{budget}</strong>
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--q-text-muted)" }}>Limit 1–25</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--q-accent)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                  Minimum Severity Threshold
                </label>
                <select
                  value={minSeverity}
                  onChange={(e) => setMinSeverity(e.target.value)}
                  style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
                >
                  <option value="low">Low (Post Low, Medium, High, Critical)</option>
                  <option value="medium">Medium (Post Medium, High, Critical only)</option>
                  <option value="high">High (Post High, Critical only)</option>
                  <option value="critical">Critical Only</option>
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer", marginTop: "var(--q-1)" }}>
                <input
                  type="checkbox"
                  checked={styleAdvisories}
                  onChange={(e) => setStyleAdvisories(e.target.checked)}
                />
                Post style advisories (Non-blocking suggestions)
              </label>
            </div>
          </fieldset>

          {/* Section 3: Lanes */}
          <fieldset className="q-card" style={{ padding: "var(--q-4)", border: "1px solid var(--q-border)" }}>
            <legend style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-base)", padding: "0 var(--q-2)" }}>
              Analysis Lanes (AC-023)
            </legend>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--q-3)", marginTop: "var(--q-2)" }}>
              {Object.entries(lanes).map(([laneKey, isEnabled]) => (
                <label
                  key={laneKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--q-2)",
                    padding: "var(--q-2)",
                    borderRadius: "var(--q-radius-sm)",
                    backgroundColor: isEnabled ? "var(--q-surface-sunken)" : "transparent",
                    cursor: "pointer",
                    fontSize: "var(--q-fs-sm)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => toggleLane(laneKey as any)}
                  />
                  <span style={{ textTransform: "capitalize", fontWeight: "var(--q-fw-medium)" }}>
                    {laneKey.replace(/_/g, " ")}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Section 4: Policy Escalations */}
          <fieldset className="q-card" style={{ padding: "var(--q-4)", border: "1px solid var(--q-critical)40", backgroundColor: "var(--q-critical)05" }}>
            <legend style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-base)", padding: "0 var(--q-2)", color: "var(--q-critical)" }}>
              Policy &amp; Escalations (Requires Owner Confirmation)
            </legend>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)", marginTop: "var(--q-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>Block Merge on Critical Failure</div>
                  <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Sets check_run conclusion to &apos;action_required&apos;</div>
                </div>
                <button
                  type="button"
                  className={conclusionBlocking ? "q-btn q-btn-danger" : "q-btn"}
                  onClick={() => handleEscalationToggle("blocking", conclusionBlocking)}
                >
                  {conclusionBlocking ? "Enabled (Blocking)" : "Enable Blocking"}
                </button>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--q-border)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>Autonomous PR Auto-Fix (AC-045)</div>
                  <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Allows verified fix generation with human approval checkpoint</div>
                </div>
                <button
                  type="button"
                  className={autoFixEnabled ? "q-btn q-btn-primary" : "q-btn"}
                  onClick={() => handleEscalationToggle("auto_fix", autoFixEnabled)}
                >
                  {autoFixEnabled ? "Enabled" : "Enable Auto-Fix"}
                </button>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--q-border)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>Bot PR Approval (AC-046)</div>
                  <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Submit official GitHub APPROVE review when all lanes pass</div>
                </div>
                <button
                  type="button"
                  className={mayApprove ? "q-btn q-btn-primary" : "q-btn"}
                  onClick={() => handleEscalationToggle("approve", mayApprove)}
                >
                  {mayApprove ? "Enabled" : "Authorize Approval"}
                </button>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Right Column: Effective Config Layer & YAML Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
          {/* Effective Config Hierarchy */}
          <div className="q-card" style={{ padding: "var(--q-4)" }}>
            <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-2)" }}>
              Config Layer Precedence (AC-005)
            </h4>
            <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", marginBottom: "var(--q-3)" }}>
              Values are resolved hierarchically: <code>default &lt; org &lt; .quorum.yaml &lt; repo UI</code>.
            </p>

            <table className="q-table" style={{ fontSize: "var(--q-fs-xs)" }}>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Source Layer</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>state</td>
                  <td><code>{reviewState}</code></td>
                  <td><span className="q-badge" style={{ backgroundColor: "var(--q-accent-soft)", color: "var(--q-accent)" }}>repo UI</span></td>
                </tr>
                <tr>
                  <td>budget</td>
                  <td><code>{budget}</code></td>
                  <td><span className="q-badge" style={{ backgroundColor: "var(--q-accent-soft)", color: "var(--q-accent)" }}>repo UI</span></td>
                </tr>
                <tr>
                  <td>min_severity</td>
                  <td><code>{minSeverity}</code></td>
                  <td><span className="q-badge" style={{ backgroundColor: "var(--q-surface-sunken)", color: "var(--q-text-muted)" }}>.quorum.yaml</span></td>
                </tr>
                <tr>
                  <td>routing_tier</td>
                  <td><code>tier_2_mid</code></td>
                  <td><span className="q-badge" style={{ backgroundColor: "var(--q-surface-sunken)", color: "var(--q-text-muted)" }}>org default</span></td>
                </tr>
                <tr>
                  <td>adversarial_verify</td>
                  <td><code>true</code></td>
                  <td><span className="q-badge" style={{ backgroundColor: "var(--q-surface-sunken)", color: "var(--q-text-muted)" }}>system default</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* YAML Live Preview */}
          <div className="q-card" style={{ padding: "var(--q-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-2)" }}>
              <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
                .quorum.yaml Preview
              </h4>
              <button type="button" className="q-btn" style={{ fontSize: "var(--q-fs-xs)" }} onClick={copyYaml}>
                Copy as .quorum.yaml
              </button>
            </div>
            <pre
              style={{
                backgroundColor: "var(--q-surface-sunken)",
                padding: "var(--q-3)",
                borderRadius: "var(--q-radius-sm)",
                fontSize: "var(--q-fs-xs)",
                fontFamily: "var(--q-font-mono)",
                overflowX: "auto",
                border: "1px solid var(--q-border)",
              }}
            >
              {generatedYaml}
            </pre>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingPolicyAction && (
        <PolicyDialog
          isOpen={true}
          title={pendingPolicyAction.title}
          description={pendingPolicyAction.description}
          confirmationKeyword={pendingPolicyAction.keyword}
          onConfirm={confirmPolicyEscalation}
          onCancel={() => setPendingPolicyAction(null)}
        />
      )}
    </div>
  );
}

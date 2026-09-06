"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ConnectGitProviderPage() {
  const [selectedProvider, setSelectedProvider] = useState<"github" | "gitlab" | "azure">("github");
  const [deploymentType, setDeploymentType] = useState<"cloud" | "self_hosted">("cloud");
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const handleInstall = () => {
    setInstalling(true);
    setTimeout(() => {
      setInstalling(false);
      setInstalled(true);
    }, 1200);
  };

  const scopes = [
    {
      scope: "Pull requests: Read & Write",
      reason: "To fetch diffs and post proven review comments and summary check runs.",
    },
    {
      scope: "Repository contents: Read",
      reason: "To build local symbol indexes and inspect referenced definitions.",
    },
    {
      scope: "Checks & Commit statuses: Read & Write",
      reason: "To report pipeline status checks (in_progress, completed, action_required).",
    },
    {
      scope: "Webhooks: Read & Write",
      reason: "To receive pull_request and pull_request_review_comment events sub-500ms.",
    },
  ];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
          Connect Git Provider (S01)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          Connect your organization&apos;s source code host. Quorum will not post anything until you switch a repository to Active.
        </p>
      </div>

      {installed ? (
        <div className="q-card" style={{ padding: "var(--q-5)", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "var(--q-2)" }}>🎉</div>
          <h3 style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-semibold)" }}>
            GitHub App Successfully Connected!
          </h3>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", margin: "var(--q-2) 0 var(--q-4)" }}>
            Installation exposed 3 active repositories. Proceed to repository selection and first indexing.
          </p>
          <Link href="/repos" className="q-btn q-btn-primary">
            Continue to Repositories (S02) →
          </Link>
        </div>
      ) : (
        <>
          {/* Deployment Choice */}
          <div className="q-card" style={{ padding: "var(--q-4)" }}>
            <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-2)" }}>
              Deployment Target
            </h3>
            <div style={{ display: "flex", gap: "var(--q-3)" }}>
              <label
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--q-2)",
                  padding: "var(--q-3)",
                  borderRadius: "var(--q-radius-sm)",
                  border: deploymentType === "cloud" ? "2px solid var(--q-accent)" : "1px solid var(--q-border)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="deploy"
                  checked={deploymentType === "cloud"}
                  onChange={() => setDeploymentType("cloud")}
                />
                <div>
                  <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>Quorum Cloud / Multi-Tenant</div>
                  <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Fully managed runner pool with zero data persistence</div>
                </div>
              </label>
              <label
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--q-2)",
                  padding: "var(--q-3)",
                  borderRadius: "var(--q-radius-sm)",
                  border: deploymentType === "self_hosted" ? "2px solid var(--q-accent)" : "1px solid var(--q-border)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="deploy"
                  checked={deploymentType === "self_hosted"}
                  onChange={() => setDeploymentType("self_hosted")}
                />
                <div>
                  <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>Self-Hosted VPC / On-Premise</div>
                  <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Runs inside your own isolated network boundary</div>
                </div>
              </label>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="q-card" style={{ padding: "var(--q-4)" }}>
            <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-3)" }}>
              Select Git Provider
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--q-3)" }}>
              {/* GitHub */}
              <div
                onClick={() => setSelectedProvider("github")}
                style={{
                  padding: "var(--q-4)",
                  borderRadius: "var(--q-radius-sm)",
                  border: selectedProvider === "github" ? "2px solid var(--q-accent)" : "1px solid var(--q-border)",
                  backgroundColor: "var(--q-surface)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "var(--q-2)" }}>🐙</div>
                <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>GitHub</div>
                <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", marginTop: "var(--q-2)" }}>
                  Available
                </span>
              </div>

              {/* GitLab */}
              <div
                onClick={() => setSelectedProvider("gitlab")}
                style={{
                  padding: "var(--q-4)",
                  borderRadius: "var(--q-radius-sm)",
                  border: selectedProvider === "gitlab" ? "2px solid var(--q-accent)" : "1px solid var(--q-border)",
                  backgroundColor: "var(--q-surface)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "var(--q-2)" }}>🦊</div>
                <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>GitLab</div>
                <span className="q-badge" style={{ backgroundColor: "var(--q-surface-sunken)", color: "var(--q-text-muted)", marginTop: "var(--q-2)" }}>
                  Preview (P1)
                </span>
              </div>

              {/* Azure DevOps */}
              <div
                onClick={() => setSelectedProvider("azure")}
                style={{
                  padding: "var(--q-4)",
                  borderRadius: "var(--q-radius-sm)",
                  border: selectedProvider === "azure" ? "2px solid var(--q-accent)" : "1px solid var(--q-border)",
                  backgroundColor: "var(--q-surface)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "var(--q-2)" }}>☁️</div>
                <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>Azure / Bitbucket</div>
                <span className="q-badge" style={{ backgroundColor: "var(--q-surface-sunken)", color: "var(--q-text-muted)", marginTop: "var(--q-2)" }}>
                  Roadmap (P2)
                </span>
              </div>
            </div>
          </div>

          {/* Scope Explanation */}
          <div className="q-card" style={{ padding: "var(--q-4)" }}>
            <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-2)" }}>
              Required Permissions &amp; Scopes
            </h3>
            <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", marginBottom: "var(--q-3)" }}>
              Quorum operates under strict least-privilege principles. Code is held in memory only during active analysis.
            </p>

            <dl style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
              {scopes.map((s, i) => (
                <div key={i} style={{ borderBottom: "1px solid var(--q-border)", paddingBottom: "var(--q-2)" }}>
                  <dt style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)", color: "var(--q-text)" }}>
                    {s.scope}
                  </dt>
                  <dd style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", margin: "4px 0 0" }}>
                    {s.reason}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Action Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-accent)", textDecoration: "none" }}
            >
              🔒 Read our Security &amp; Data Privacy Architecture
            </a>

            <button
              type="button"
              className="q-btn q-btn-primary"
              disabled={installing}
              onClick={handleInstall}
            >
              {installing ? "Confirming installation..." : `Install ${selectedProvider === "github" ? "GitHub" : selectedProvider} App →`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { Repository } from "../../../lib/mockData";

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getRepositories().then(setRepos);
  }, []);

  const handleStateChange = async (id: string, newState: "disabled" | "observe" | "active") => {
    await api.updateRepoState(id, newState);
    setRepos((prev) => prev.map((r) => (r.id === id ? { ...r, state: newState } : r)));
    setActionMessage(`Repository state updated to ${newState.toUpperCase()}`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleTriggerIndex = (id: string) => {
    setRepos((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              indexing_progress: {
                stage: "symbol_index",
                percent: 65,
                error: null,
              },
            }
          : r
      )
    );
    setActionMessage(`Indexing triggered for ${id}`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
            Repository Selection &amp; Indexing (S02)
          </h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            Choose which repositories Quorum monitors. Switch to <strong>Active</strong> for inline reviews, or <strong>Observe</strong> for dashboard-only insights.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--q-2)" }}>
          <Link href="/settings/integrations" className="q-btn">
            Configure App Access
          </Link>
          <Link href="/onboarding/trial" className="q-btn q-btn-primary">
            Run Trial Review (S03) →
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {actionMessage}
        </div>
      )}

      {/* Filter and Search */}
      <div className="q-card" style={{ display: "flex", gap: "var(--q-3)", alignItems: "center", padding: "var(--q-3)" }}>
        <input
          type="text"
          placeholder="Search repositories by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "var(--q-2) var(--q-3)",
            borderRadius: "var(--q-radius-sm)",
            border: "1px solid var(--q-border)",
            backgroundColor: "var(--q-surface)",
            color: "var(--q-text)",
            fontSize: "var(--q-fs-sm)",
          }}
        />
        <button
          type="button"
          className="q-btn"
          onClick={() => {
            repos.forEach((r) => handleStateChange(r.id, "observe"));
          }}
        >
          Bulk Observe All
        </button>
      </div>

      {/* Repository Table */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="q-table">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Language</th>
              <th>Default Branch</th>
              <th>Review State</th>
              <th>Code Graph Index</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepos.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "var(--q-6)", color: "var(--q-text-muted)" }}>
                  No repositories found.
                </td>
              </tr>
            ) : (
              filteredRepos.map((repo) => {
                const isOverLimit = repo.size_mb > 500;
                const stage = repo.indexing_progress.stage;
                const pct = repo.indexing_progress.percent;

                return (
                  <tr key={repo.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)" }}>
                        <Link
                          href={`/repos/${encodeURIComponent(repo.id)}/settings`}
                          style={{ fontWeight: "var(--q-fw-semibold)", color: "var(--q-text)", textDecoration: "none" }}
                        >
                          {repo.name}
                        </Link>
                        {isOverLimit && (
                          <span
                            className="q-badge"
                            style={{ backgroundColor: "var(--q-warn-bg)", color: "var(--q-warn)", border: "1px solid var(--q-warn)40" }}
                            title="Working tree exceeds standard limit: using diff-scoped retrieval [FR-003]"
                          >
                            diff-scoped retrieval only
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                        {(repo.size_mb).toFixed(1)} MB
                      </div>
                    </td>

                    <td style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)" }}>
                      {repo.language}
                    </td>

                    <td style={{ fontSize: "var(--q-fs-sm)", fontFamily: "var(--q-font-mono)", color: "var(--q-text-muted)" }}>
                      {repo.default_branch}
                    </td>

                    <td>
                      <select
                        value={repo.state}
                        onChange={(e) => handleStateChange(repo.id, e.target.value as any)}
                        style={{
                          padding: "var(--q-1) var(--q-2)",
                          borderRadius: "var(--q-radius-sm)",
                          border: "1px solid var(--q-border)",
                          backgroundColor:
                            repo.state === "active"
                              ? "var(--q-ok-bg)"
                              : repo.state === "observe"
                              ? "var(--q-accent-soft)"
                              : "var(--q-surface)",
                          color:
                            repo.state === "active"
                              ? "var(--q-ok)"
                              : repo.state === "observe"
                              ? "var(--q-accent)"
                              : "var(--q-text-muted)",
                          fontWeight: "var(--q-fw-semibold)",
                          fontSize: "var(--q-fs-xs)",
                        }}
                      >
                        <option value="disabled">Disabled</option>
                        <option value="observe">Observe (Quiet)</option>
                        <option value="active">Active (Inline Post)</option>
                      </select>
                    </td>

                    <td style={{ minWidth: "220px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                        <span style={{ textTransform: "capitalize", color: "var(--q-text-muted)" }}>
                          {stage === "embeddings"
                            ? "✓ Ready"
                            : stage.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontWeight: "var(--q-fw-mono)" }}>{pct}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Index progress for ${repo.name}`}
                        style={{
                          height: "6px",
                          borderRadius: "3px",
                          backgroundColor: "var(--q-border)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            backgroundColor: pct === 100 ? "var(--q-ok)" : "var(--q-accent)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: "var(--q-2)" }}>
                        <Link
                          href={`/repos/${encodeURIComponent(repo.id)}/trial`}
                          className="q-btn"
                          style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
                        >
                          Trial Review
                        </Link>
                        <button
                          type="button"
                          className="q-btn"
                          style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
                          onClick={() => handleTriggerIndex(repo.id)}
                        >
                          Re-index
                        </button>
                        <Link
                          href={`/repos/${encodeURIComponent(repo.id)}/settings`}
                          className="q-btn"
                          style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
                        >
                          Settings
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

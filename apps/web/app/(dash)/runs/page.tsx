"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "../../../lib/api";
import { RunSummary } from "../../../lib/mockData";

function ReviewsInboxContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [runs, setRuns] = useState<RunSummary[]>([]);

  const search = searchParams.get("q") || "";
  const stateFilter = searchParams.get("verdict") || "all";

  const updateFilters = (newSearch: string, newVerdict: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch) params.set("q", newSearch);
    else params.delete("q");
    if (newVerdict && newVerdict !== "all") params.set("verdict", newVerdict);
    else params.delete("verdict");
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    api.getRuns().then(setRuns);
  }, []);

  const filteredRuns = runs.filter((r) => {
    if (stateFilter !== "all" && r.verdict !== stateFilter) return false;
    if (search && !r.pr_title.toLowerCase().includes(search.toLowerCase()) && !r.repo_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-5)" }}>
        <div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>Reviews Inbox</h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            Autonomous PR reviews across all active repositories. Showing prove-it evidence first.
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--q-2)" }}>
          <button type="button" className="q-btn">Export CSV</button>
          <Link href="/onboarding/connect" className="q-btn q-btn-primary">+ Add Repository</Link>
        </div>
      </div>

      {/* Filter Bar with URL Serialization */}
      <div className="q-card" style={{ marginBottom: "var(--q-4)", display: "flex", gap: "var(--q-3)", alignItems: "center", padding: "var(--q-3)" }}>
        <input
          type="text"
          placeholder="Filter by PR title, repo, or author..."
          value={search}
          onChange={(e) => updateFilters(e.target.value, stateFilter)}
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
        <select
          value={stateFilter}
          onChange={(e) => updateFilters(search, e.target.value)}
          style={{
            padding: "var(--q-2) var(--q-3)",
            borderRadius: "var(--q-radius-sm)",
            border: "1px solid var(--q-border)",
            backgroundColor: "var(--q-surface)",
            color: "var(--q-text)",
            fontSize: "var(--q-fs-sm)",
          }}
        >
          <option value="all">All Verdicts</option>
          <option value="actionable">Actionable Defects</option>
          <option value="clean">Clean (No Findings)</option>
        </select>
      </div>

      {/* Table */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="q-table">
          <thead>
            <tr>
              <th>Pull Request</th>
              <th>Repository</th>
              <th>Verdict</th>
              <th>Posted</th>
              <th>Held (Budget 8)</th>
              <th>Duration</th>
              <th>Credits</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "var(--q-6)", color: "var(--q-text-muted)" }}>
                  No reviews match your filters.
                </td>
              </tr>
            ) : (
              filteredRuns.map((r) => {
                const isClean = r.verdict === "clean";
                return (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/runs/${r.id}`}
                        style={{
                          fontWeight: "var(--q-fw-semibold)",
                          color: "var(--q-text)",
                          textDecoration: "none",
                        }}
                      >
                        #{r.pr_number} — {r.pr_title}
                      </Link>
                      <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                        Author: {r.author} · Commit: <code>{r.head_sha}</code>
                      </div>
                    </td>
                    <td>
                      <span className="q-badge" style={{ backgroundColor: "var(--q-surface-sunken)", color: "var(--q-text-muted)" }}>
                        {r.repo_id}
                      </span>
                    </td>
                    <td>
                      <span
                        className="q-badge"
                        style={{
                          backgroundColor: isClean ? "var(--q-ok)20" : "var(--q-warn)20",
                          color: isClean ? "var(--q-ok)" : "var(--q-warn)",
                        }}
                      >
                        {isClean ? "✓ CLEAN" : "⚠️ ACTIONABLE"}
                      </span>
                    </td>
                    <td style={{ fontWeight: "var(--q-fw-semibold)" }}>{r.posted_count}</td>
                    <td style={{ color: "var(--q-text-muted)" }}>{r.held_count}</td>
                    <td style={{ fontSize: "var(--q-fs-xs)" }}>{r.duration_seconds}s</td>
                    <td style={{ fontSize: "var(--q-fs-xs)" }}>{(r.cost_estimate_usd * 10).toFixed(1)}</td>
                    <td style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                      {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

export default function ReviewsInboxPage() {
  return (
    <Suspense fallback={<div className="q-card" style={{ padding: "var(--q-6)", textAlign: "center" }}>Loading Reviews Inbox...</div>}>
      <ReviewsInboxContent />
    </Suspense>
  );
}

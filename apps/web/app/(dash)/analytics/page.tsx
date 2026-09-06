"use client";

import React, { useState } from "react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [showTableMode, setShowTableMode] = useState(false);

  // Mock analytics data
  const weeklyAcceptance = [
    { week: "W32", acceptanceRate: 88, postedCount: 42, dismissedCount: 5 },
    { week: "W33", acceptanceRate: 91, postedCount: 56, dismissedCount: 5 },
    { week: "W34", acceptanceRate: 94, postedCount: 49, dismissedCount: 3 },
    { week: "W35", acceptanceRate: 96, postedCount: 61, dismissedCount: 2 },
  ];

  const lanePerformance = [
    { lane: "Correctness", yield: 124, dismissRate: 4.1, avgConfidence: 0.94 },
    { lane: "Security", yield: 38, dismissRate: 2.6, avgConfidence: 0.98 },
    { lane: "API Contract", yield: 52, dismissRate: 5.7, avgConfidence: 0.91 },
    { lane: "Tests", yield: 41, dismissRate: 8.2, avgConfidence: 0.88 },
    { lane: "Style", yield: 18, dismissRate: 16.6, avgConfidence: 0.79 },
  ];

  const repoLeaderboard = [
    { repo: "acme/payment-gateway", reviews: 84, acceptance: "95.8%", avgDuration: "3.2s" },
    { repo: "acme/auth-service", reviews: 52, acceptance: "94.2%", avgDuration: "2.8s" },
    { repo: "acme/frontend-portal", reviews: 36, acceptance: "91.7%", avgDuration: "4.1s" },
  ];

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
            Review Analytics &amp; Yield (S10)
          </h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            Tracking signal-to-noise, dismissal rate, and AI review ROI. Aggregated per repo and lane only.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--q-2)", alignItems: "center" }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: "var(--q-2) var(--q-3)",
              borderRadius: "var(--q-radius-sm)",
              border: "1px solid var(--q-border)",
              backgroundColor: "var(--q-surface)",
              color: "var(--q-text)",
              fontSize: "var(--q-fs-sm)",
            }}
          >
            <option value="1d">Last 24 Hours (&lt; 20 runs sample)</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <button
            type="button"
            className="q-btn"
            onClick={() => setShowTableMode(!showTableMode)}
          >
            {showTableMode ? "Chart Visualisation" : "Accessible Data Table"}
          </button>

          <button type="button" className="q-btn">
            Export CSV
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div
        style={{
          padding: "var(--q-3)",
          borderRadius: "var(--q-radius-sm)",
          backgroundColor: "var(--q-surface-sunken)",
          borderLeft: "4px solid var(--q-accent)",
          fontSize: "var(--q-fs-xs)",
          color: "var(--q-text-muted)",
        }}
      >
        🔒 <strong>Zero Developer Surveillance Guarantee:</strong> Metrics reflect system precision, review yield, and repo health. Quorum never scores, ranks, or monitors individual human engineers.
      </div>

      {timeRange === "1d" ? (
        <div className="q-card" style={{ padding: "var(--q-7) var(--q-4)", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "var(--q-2)" }}>📊</div>
          <h3 style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-semibold)" }}>Not Enough Data</h3>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", maxWidth: "450px", margin: "var(--q-2) auto 0" }}>
            This range contains only 12 completed review runs. Quorum requires at least 20 runs to display statistically reliable precision, comment yield, and dismissal metrics without misleading charts.
          </p>
        </div>
      ) : (
        <>
          {/* Primary KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "var(--q-4)",
            }}
          >
            <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Acceptance Rate (Precision)
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", color: "var(--q-ok)", marginTop: "var(--q-1)" }}>
            94.8%
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            +2.3% vs previous period
          </span>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Avg Comments / PR
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", marginTop: "var(--q-1)" }}>
            1.8
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Strictly bounded by budget (cap 8)
          </span>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            p90 Time to Comment
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", color: "var(--q-accent)", marginTop: "var(--q-1)" }}>
            3.4s
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Sub-5s fast path SLA target met
          </span>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Monthly Compute Spend
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", marginTop: "var(--q-1)" }}>
            $312.40
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            31% of $1,000 monthly cap
          </span>
        </div>
      </div>

      {/* Acceptance Trend & Lane Yield */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--q-4)" }}>
        {/* Acceptance Over Time */}
        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-3)" }}>
            Acceptance Rate Over Time
          </h3>

          {showTableMode ? (
            <table className="q-table" style={{ fontSize: "var(--q-fs-xs)" }}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Acceptance Rate</th>
                  <th>Posted Findings</th>
                  <th>Dismissed Findings</th>
                </tr>
              </thead>
              <tbody>
                {weeklyAcceptance.map((w) => (
                  <tr key={w.week}>
                    <td>{w.week}</td>
                    <td>{w.acceptanceRate}%</td>
                    <td>{w.postedCount}</td>
                    <td>{w.dismissedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)", padding: "var(--q-2) 0" }}>
              {weeklyAcceptance.map((w) => (
                <div key={w.week}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--q-fs-xs)", marginBottom: "4px" }}>
                    <span>Week {w.week}</span>
                    <strong>{w.acceptanceRate}% ({w.postedCount} posted)</strong>
                  </div>
                  <div
                    style={{
                      height: "12px",
                      borderRadius: "6px",
                      backgroundColor: "var(--q-border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${w.acceptanceRate}%`,
                        backgroundColor: "var(--q-ok)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-Lane Yield and Dismissal Rate */}
        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-3)" }}>
            Per-Lane Signal Yield (AC-023)
          </h3>

          <table className="q-table" style={{ fontSize: "var(--q-fs-xs)" }}>
            <thead>
              <tr>
                <th>Lane</th>
                <th>Yield</th>
                <th>Dismissal %</th>
                <th>Calibrated Conf</th>
              </tr>
            </thead>
            <tbody>
              {lanePerformance.map((lp) => (
                <tr key={lp.lane}>
                  <td><strong>{lp.lane}</strong></td>
                  <td>{lp.yield} issues</td>
                  <td>
                    <span style={{ color: lp.dismissRate > 10 ? "var(--q-warn)" : "var(--q-ok)" }}>
                      {lp.dismissRate}%
                    </span>
                  </td>
                  <td>{(lp.avgConfidence * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repo Leaderboard (strictly by acceptance, NEVER by author) */}
      <div className="q-card" style={{ padding: "var(--q-4)" }}>
        <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", marginBottom: "var(--q-2)" }}>
          Repository Precision Leaderboard
        </h3>
        <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", marginBottom: "var(--q-3)" }}>
          Repos with highest signal acceptance and lowest developer dismissal.
        </p>

        <table className="q-table">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Reviews Run</th>
              <th>Acceptance Rate</th>
              <th>Avg Latency</th>
            </tr>
          </thead>
          <tbody>
            {repoLeaderboard.map((rl) => (
              <tr key={rl.repo}>
                <td><strong>{rl.repo}</strong></td>
                <td>{rl.reviews} reviews</td>
                <td><span style={{ color: "var(--q-ok)", fontWeight: "var(--q-fw-bold)" }}>{rl.acceptance}</span></td>
                <td>{rl.avgDuration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}
</div>
  );
}

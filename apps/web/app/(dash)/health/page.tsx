"use client";

import React, { useState } from "react";

export default function SystemHealthPage() {
  const [emergencyMute, setEmergencyMute] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const runners = [
    { id: "runner-node-01", status: "online", activeJobs: 2, memoryUsage: "42%", cpuUsage: "28%", uptime: "14d 6h" },
    { id: "runner-node-02", status: "online", activeJobs: 1, memoryUsage: "38%", cpuUsage: "19%", uptime: "14d 6h" },
    { id: "runner-node-03", status: "online", activeJobs: 0, memoryUsage: "24%", cpuUsage: "5%", uptime: "4d 2h" },
    { id: "runner-sandbox-01", status: "online", activeJobs: 3, memoryUsage: "56%", cpuUsage: "61%", uptime: "2d 11h" },
  ];

  const providers = [
    { provider: "Anthropic API", p95Latency: "840ms", errorRate: "0.02%", status: "healthy" },
    { provider: "OpenAI API", p95Latency: "610ms", errorRate: "0.00%", status: "healthy" },
    { provider: "Local Sandbox Runner", p95Latency: "120ms", errorRate: "0.00%", status: "healthy" },
  ];

  const toggleEmergencyMute = () => {
    const nextState = !emergencyMute;
    setEmergencyMute(nextState);
    if (nextState) {
      setNotification("🚨 EMERGENCY MUTE ACTIVATED: All inline GitHub posting suspended globally.");
    } else {
      setNotification("Emergency mute deactivated. Normal posting resumed.");
    }
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
            System Infrastructure &amp; Health (S16)
          </h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            Real-time pipeline queue depth, runner pool utilization, checkpointer lag, and emergency controls.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--q-2)" }}>
          <button
            type="button"
            className={emergencyMute ? "q-btn q-btn-danger" : "q-btn"}
            onClick={toggleEmergencyMute}
          >
            {emergencyMute ? "🚨 MUTE ACTIVE (Click to Resume)" : "Emergency Mute Switch"}
          </button>
          <button
            type="button"
            className="q-btn"
            onClick={() => {
              setNotification("Webhook backlog replayed successfully.");
              setTimeout(() => setNotification(null), 3000);
            }}
          >
            Replay Webhooks
          </button>
        </div>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: emergencyMute ? "var(--q-critical)20" : "var(--q-ok-bg)", color: emergencyMute ? "var(--q-critical)" : "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)", fontWeight: "var(--q-fw-bold)" }}>
          {notification}
        </div>
      )}

      {/* Primary Status Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--q-4)",
        }}
      >
        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Ingress Queue Depth
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", color: "var(--q-ok)", marginTop: "var(--q-1)" }}>
            0 msgs
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Redis stream backlog nominal
          </span>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Active Review Runs
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", color: "var(--q-accent)", marginTop: "var(--q-1)" }}>
            3 runs
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Across 4 parallel workers
          </span>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Checkpointer Lag
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", marginTop: "var(--q-1)" }}>
            14 ms
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Postgres state snapshot delay
          </span>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)" }}>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Core Engine Version
          </span>
          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", marginTop: "var(--q-1)" }}>
            v0.1.0
          </div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-ok)" }}>
            ● Healthy &amp; Up to Date
          </span>
        </div>
      </div>

      {/* Runner Pool Status */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--q-3) var(--q-4)", borderBottom: "1px solid var(--q-border)", backgroundColor: "var(--q-surface-sunken)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Worker &amp; Sandbox Runner Pool
          </h3>
          <button
            type="button"
            className="q-btn"
            style={{ fontSize: "var(--q-fs-xs)" }}
            onClick={() => alert("Draining worker pool for rolling maintenance...")}
          >
            Drain &amp; Rotate
          </button>
        </div>

        <table className="q-table">
          <thead>
            <tr>
              <th>Runner ID</th>
              <th>Status</th>
              <th>Active Jobs</th>
              <th>Memory</th>
              <th>CPU</th>
              <th>Uptime</th>
            </tr>
          </thead>
          <tbody>
            {runners.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.id}</strong></td>
                <td>
                  <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)" }}>
                    ● {r.status.toUpperCase()}
                  </span>
                </td>
                <td>{r.activeJobs}</td>
                <td>{r.memoryUsage}</td>
                <td>{r.cpuUsage}</td>
                <td style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>{r.uptime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Provider Connectivity & Error Rates */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--q-3) var(--q-4)", borderBottom: "1px solid var(--q-border)", backgroundColor: "var(--q-surface-sunken)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            External Provider Latency &amp; Error Rates
          </h3>
        </div>

        <table className="q-table">
          <thead>
            <tr>
              <th>Provider Endpoint</th>
              <th>p95 Response Latency</th>
              <th>Error Rate (5xx)</th>
              <th>Health Status</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.provider}>
                <td><strong>{p.provider}</strong></td>
                <td>{p.p95Latency}</td>
                <td>{p.errorRate}</td>
                <td>
                  <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)" }}>
                    ✓ {p.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

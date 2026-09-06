"use client";

import React, { useState } from "react";

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  ip_address: string;
  correlation_id: string;
}

export default function AuditLogPage() {
  const [filterAction, setFilterAction] = useState("all");
  const [search, setSearch] = useState("");

  const events: AuditEvent[] = [
    {
      id: "evt_101",
      timestamp: "2026-09-06T14:15:22Z",
      actor: "alice@acme.corp",
      action: "repo.state_changed",
      target: "acme/payment-gateway (observe -> active)",
      ip_address: "192.0.2.45",
      correlation_id: "req_99a8b7c6",
    },
    {
      id: "evt_102",
      timestamp: "2026-09-06T13:40:10Z",
      actor: "bob@acme.corp",
      action: "policy.escalated",
      target: "acme/payment-gateway: check_run_blocking enabled",
      ip_address: "198.51.100.12",
      correlation_id: "req_88f7e6d5",
    },
    {
      id: "evt_103",
      timestamp: "2026-09-06T11:20:04Z",
      actor: "alice@acme.corp",
      action: "member.role_changed",
      target: "carol@acme.corp (auditor -> member)",
      ip_address: "192.0.2.45",
      correlation_id: "req_77c6b5a4",
    },
    {
      id: "evt_104",
      timestamp: "2026-09-06T09:05:49Z",
      actor: "carol@acme.corp",
      action: "finding.dismissed",
      target: "finding_race_condition_01 (false-positive)",
      ip_address: "203.0.113.88",
      correlation_id: "run_pr_142_refund_race",
    },
  ];

  const exportNdjson = () => {
    const ndjsonContent = events.map((e) => JSON.stringify(e)).join("\n");
    const blob = new Blob([ndjsonContent], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.ndjson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = events.filter((e) => {
    if (filterAction !== "all" && !e.action.startsWith(filterAction)) return false;
    if (search && !e.actor.includes(search) && !e.target.includes(search) && !e.correlation_id.includes(search)) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
            Audit Log (S14)
          </h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            Immutable chronological record of administrative actions, policy mutations, and security events.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--q-2)" }}>
          <button type="button" className="q-btn" onClick={exportNdjson}>
            Export NDJSON
          </button>
          <button type="button" className="q-btn" onClick={() => alert("SIEM streaming is enabled on Enterprise plan.")}>
            Stream to SIEM (Datadog / Splunk)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="q-card" style={{ display: "flex", gap: "var(--q-3)", alignItems: "center", padding: "var(--q-3)" }}>
        <input
          type="text"
          placeholder="Filter by actor email, target, or correlation ID..."
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

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            padding: "var(--q-2) var(--q-3)",
            borderRadius: "var(--q-radius-sm)",
            border: "1px solid var(--q-border)",
            backgroundColor: "var(--q-surface)",
            color: "var(--q-text)",
            fontSize: "var(--q-fs-sm)",
          }}
        >
          <option value="all">All Actions</option>
          <option value="repo">Repository Actions</option>
          <option value="policy">Policy &amp; Config</option>
          <option value="member">Member &amp; Roles</option>
          <option value="finding">Review &amp; Findings</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="q-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target Details</th>
              <th>Client IP</th>
              <th>Correlation ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td style={{ fontSize: "var(--q-fs-xs)", fontFamily: "var(--q-font-mono)", color: "var(--q-text-muted)" }}>
                  {e.timestamp}
                </td>
                <td style={{ fontSize: "var(--q-fs-sm)", fontWeight: "var(--q-fw-medium)" }}>
                  {e.actor}
                </td>
                <td>
                  <span
                    className="q-badge"
                    style={{
                      backgroundColor: e.action.includes("policy") ? "var(--q-critical)20" : "var(--q-surface-sunken)",
                      color: e.action.includes("policy") ? "var(--q-critical)" : "var(--q-text)",
                      fontFamily: "var(--q-font-mono)",
                    }}
                  >
                    {e.action}
                  </span>
                </td>
                <td style={{ fontSize: "var(--q-fs-sm)" }}>
                  {e.target}
                </td>
                <td style={{ fontSize: "var(--q-fs-xs)", fontFamily: "var(--q-font-mono)", color: "var(--q-text-muted)" }}>
                  {e.ip_address}
                </td>
                <td style={{ fontSize: "var(--q-fs-xs)", fontFamily: "var(--q-font-mono)", color: "var(--q-text-faint)" }}>
                  {e.correlation_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

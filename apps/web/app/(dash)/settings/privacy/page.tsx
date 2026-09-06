"use client";

import React, { useState } from "react";
import { PolicyDialog } from "../../../../components/PolicyDialog";

export default function DataPrivacyPage() {
  const [traceRetention, setTraceRetention] = useState("30");
  const [findingRetention, setFindingRetention] = useState("90");
  const [persistExcerpts, setPersistExcerpts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const subProcessors = [
    { name: "Anthropic, PBC", role: "LLM Inference (Claude 3.5 Sonnet / Haiku)", location: "USA", zeroDataRetention: "Yes (Commercial API)" },
    { name: "OpenAI, LLC", role: "LLM Inference (GPT-4o mini)", location: "USA", zeroDataRetention: "Yes (Enterprise ZDR)" },
    { name: "Amazon Web Services (AWS)", role: "Encrypted Cloud Hosting & S3 Vault", location: "EU (Frankfurt)", zeroDataRetention: "Customer Isolated" },
  ];

  const handleSaveRetention = () => {
    setNotification("Data retention policies saved successfully.");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleConfirmDeletion = () => {
    setIsDeleting(false);
    setNotification("Organization deletion scheduled. A 24-hour grace cancellation window has begun.");
  };

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
          Data Retention &amp; Privacy (S15)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          Control code storage policies, audit sub-processors, and request cryptographic deletion under SOC2 / GDPR.
        </p>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {notification}
        </div>
      )}

      {/* Retention Controls Card */}
      <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
        <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
          Data Retention Windows
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--q-4)" }}>
          <div>
            <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
              Execution Trace Retention
            </label>
            <select
              value={traceRetention}
              onChange={(e) => setTraceRetention(e.target.value)}
              style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)", fontSize: "var(--q-fs-xs)" }}
            >
              <option value="7">7 Days (Strict Security / ephemeral)</option>
              <option value="30">30 Days (Standard)</option>
              <option value="90">90 Days (Extended Audit)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
              Finding &amp; Review Record Retention
            </label>
            <select
              value={findingRetention}
              onChange={(e) => setFindingRetention(e.target.value)}
              style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)", fontSize: "var(--q-fs-xs)" }}
            >
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="365">365 Days (1 Year)</option>
            </select>
          </div>
        </div>

        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-surface-sunken)", borderRadius: "var(--q-radius-sm)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={persistExcerpts}
              onChange={(e) => setPersistExcerpts(e.target.checked)}
            />
            <div>
              <strong>Persist Code Excerpts in Evidence Vault:</strong>
              <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                When disabled, Quorum stores only file paths and line offsets. Code diff snippets are fetched dynamically on-demand from your Git host and never stored at rest.
              </div>
            </div>
          </label>
        </div>

        <button type="button" className="q-btn q-btn-primary" style={{ alignSelf: "flex-start" }} onClick={handleSaveRetention}>
          Update Retention Policy
        </button>
      </div>

      {/* Sub-processors List */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--q-3) var(--q-4)", borderBottom: "1px solid var(--q-border)", backgroundColor: "var(--q-surface-sunken)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Authorized AI &amp; Infrastructure Sub-processors
          </h3>
        </div>

        <table className="q-table">
          <thead>
            <tr>
              <th>Sub-processor</th>
              <th>Purpose / Service</th>
              <th>Jurisdiction</th>
              <th>Zero Data Retention</th>
            </tr>
          </thead>
          <tbody>
            {subProcessors.map((sp) => (
              <tr key={sp.name}>
                <td><strong>{sp.name}</strong></td>
                <td style={{ fontSize: "var(--q-fs-xs)" }}>{sp.role}</td>
                <td style={{ fontSize: "var(--q-fs-xs)" }}>{sp.location}</td>
                <td>
                  <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)" }}>
                    {sp.zeroDataRetention}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Data Export, DPA & Deletion */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--q-4)" }}>
        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-2)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Export Organization Data
          </h3>
          <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Download a full export archive of all reviews, findings, traces, custom rules, and audit logs.
          </p>
          <button
            type="button"
            className="q-btn"
            style={{ alignSelf: "flex-start", marginTop: "auto" }}
            onClick={() => alert("Data export job queued. An email notification will be sent upon completion.")}
          >
            Request Full Archive Export (.zip)
          </button>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-2)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Data Processing Agreement (DPA)
          </h3>
          <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Execute our standard enterprise GDPR / CCPA compliant Data Processing Agreement with Standard Contractual Clauses (SCCs).
          </p>
          <button
            type="button"
            className="q-btn"
            style={{ alignSelf: "flex-start", marginTop: "auto" }}
            onClick={() => alert("Downloading signed Quorum Data Processing Agreement (DPA) PDF...")}
          >
            Download Signed DPA (PDF)
          </button>
        </div>

        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-2)", border: "1px solid var(--q-critical)40", backgroundColor: "var(--q-critical)05" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)", color: "var(--q-critical)" }}>
            Schedule Organization Deletion
          </h3>
          <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Permanently destroy all indices, rules, review records, and credentials. Subject to a mandatory 24-hour cancellation grace window.
          </p>
          <button
            type="button"
            className="q-btn q-btn-danger"
            style={{ alignSelf: "flex-start", marginTop: "auto" }}
            onClick={() => setIsDeleting(true)}
          >
            Request Organization Deletion
          </button>
        </div>
      </div>

      {/* Deletion Dialog */}
      {isDeleting && (
        <PolicyDialog
          isOpen={true}
          title="Confirm Organization Deletion"
          description="Are you absolutely sure? All repositories, findings, configurations, and billing profiles will be permanently erased after a 24-hour cancellation period."
          confirmationKeyword="DELETE ACME CORP"
          onConfirm={handleConfirmDeletion}
          onCancel={() => setIsDeleting(false)}
        />
      )}
    </div>
  );
}

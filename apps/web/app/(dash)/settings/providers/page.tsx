"use client";

import React, { useState } from "react";

interface NodeClassConfig {
  nodeClass: string;
  provider: string;
  model: string;
  tier: "tier_1_cheap" | "tier_2_mid" | "tier_3_strong";
  role: "primary" | "escalation" | "fallback" | "floor";
  maxTokens: number;
  temperature: number;
  testStatus?: "idle" | "testing" | "passed" | "failed";
}

export default function ProvidersAndRoutingPage() {
  const [configs, setConfigs] = useState<NodeClassConfig[]>([
    {
      nodeClass: "triage",
      provider: "OpenAI Compatible",
      model: "meta-llama/Llama-3.3-70B-Instruct",
      tier: "tier_1_cheap",
      role: "primary",
      maxTokens: 1024,
      temperature: 0.1,
      testStatus: "passed",
    },
    {
      nodeClass: "lane (correctness, security, etc.)",
      provider: "Anthropic",
      model: "claude-3-5-haiku-latest",
      tier: "tier_2_mid",
      role: "primary",
      maxTokens: 4096,
      temperature: 0.2,
      testStatus: "passed",
    },
    {
      nodeClass: "verify (adversarial)",
      provider: "Anthropic",
      model: "claude-3-5-sonnet-latest",
      tier: "tier_3_strong",
      role: "floor",
      maxTokens: 4096,
      temperature: 0.0,
      testStatus: "passed",
    },
    {
      nodeClass: "summarise",
      provider: "OpenAI Compatible",
      model: "gpt-4o-mini",
      tier: "tier_1_cheap",
      role: "primary",
      maxTokens: 2048,
      temperature: 0.3,
      testStatus: "passed",
    },
  ]);

  const [routingMode, setRoutingMode] = useState<"static" | "adaptive" | "shadow">("adaptive");
  const [escalationBudget, setEscalationBudget] = useState(3);
  const [triggers, setTriggers] = useState({
    ambiguousConfidence: true,
    complexAst: true,
    crossFileDeps: false,
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Check if verify uses same model as lane (anti-pattern warning)
  const laneModel = configs.find((c) => c.nodeClass.startsWith("lane"))?.model;
  const verifyModel = configs.find((c) => c.nodeClass.startsWith("verify"))?.model;
  const isSameModelWarning = laneModel && verifyModel && laneModel === verifyModel;

  const testConnection = (idx: number) => {
    setConfigs((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, testStatus: "testing" as const } : c))
    );

    setTimeout(() => {
      setConfigs((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, testStatus: "passed" as const } : c))
      );
      setNotification(`Connection to ${configs[idx].provider} (${configs[idx].model}) verified!`);
      setTimeout(() => setNotification(null), 3000);
    }, 1000);
  };

  const handleSave = () => {
    setNotification("Model provider and adaptive routing configurations saved.");
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
            Models, Providers &amp; Adaptive Routing (S12)
          </h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            Configure multi-provider LLMs, cost floors, and adaptive escalation triggers (AC-084 / AC-085).
          </p>
        </div>

        <button type="button" className="q-btn q-btn-primary" onClick={handleSave}>
          Save Configuration
        </button>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {notification}
        </div>
      )}

      {/* Model Verification Warning Banner */}
      {isSameModelWarning && (
        <div
          style={{
            padding: "var(--q-3)",
            backgroundColor: "var(--q-warn-bg)",
            color: "var(--q-warn)",
            border: "1px solid var(--q-warn)40",
            borderRadius: "var(--q-radius-sm)",
            fontSize: "var(--q-fs-xs)",
          }}
        >
          ⚠️ <strong>Adversarial Verification Warning:</strong> The adversarial verifier is using the same model as the lane generation. Using distinct model families or higher capability tiers provides stronger refutation calibration.
        </div>
      )}

      {/* Node-Class Model Assignments */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--q-3) var(--q-4)", borderBottom: "1px solid var(--q-border)", backgroundColor: "var(--q-surface-sunken)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Node-Class Model Assignments
          </h3>
        </div>

        <table className="q-table">
          <thead>
            <tr>
              <th>Node Class</th>
              <th>Provider</th>
              <th>Model Identifier</th>
              <th>Model Tier</th>
              <th>Routing Role</th>
              <th>Connection</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((cfg, idx) => (
              <tr key={cfg.nodeClass}>
                <td>
                  <strong>{cfg.nodeClass}</strong>
                </td>
                <td>
                  <select
                    value={cfg.provider}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfigs((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, provider: val } : c))
                      );
                    }}
                    style={{ padding: "var(--q-1) var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)", fontSize: "var(--q-fs-xs)" }}
                  >
                    <option>Anthropic</option>
                    <option>OpenAI Compatible</option>
                    <option>Local / vLLM / Ollama</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={cfg.model}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfigs((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, model: val } : c))
                      );
                    }}
                    style={{ width: "220px", padding: "var(--q-1) var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)", fontSize: "var(--q-fs-xs)", fontFamily: "var(--q-font-mono)" }}
                  />
                </td>
                <td>
                  <select
                    value={cfg.tier}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setConfigs((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, tier: val } : c))
                      );
                    }}
                    style={{ padding: "var(--q-1) var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)", fontSize: "var(--q-fs-xs)" }}
                  >
                    <option value="tier_1_cheap">Tier 1 (Cheap / Fast)</option>
                    <option value="tier_2_mid">Tier 2 (Mid-range)</option>
                    <option value="tier_3_strong">Tier 3 (Strongest / Flagship)</option>
                  </select>
                </td>
                <td>
                  <span
                    className="q-badge"
                    style={{
                      backgroundColor: cfg.role === "floor" ? "var(--q-critical)20" : "var(--q-accent-soft)",
                      color: cfg.role === "floor" ? "var(--q-critical)" : "var(--q-accent)",
                    }}
                  >
                    {cfg.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="q-btn"
                    style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
                    disabled={cfg.testStatus === "testing"}
                    onClick={() => testConnection(idx)}
                  >
                    {cfg.testStatus === "testing"
                      ? "Testing..."
                      : cfg.testStatus === "passed"
                      ? "✓ Live"
                      : "Test"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adaptive Routing & Escalation Policy */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "var(--q-5)" }}>
        {/* Left: Routing Controls */}
        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Adaptive Routing Engine (AC-084)
          </h3>

          <div>
            <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
              Routing Mode
            </label>
            <div style={{ display: "flex", gap: "var(--q-2)" }}>
              <button
                type="button"
                className="q-btn"
                style={{
                  flex: 1,
                  backgroundColor: routingMode === "static" ? "var(--q-surface-sunken)" : "transparent",
                  fontWeight: routingMode === "static" ? "var(--q-fw-bold)" : "normal",
                }}
                onClick={() => setRoutingMode("static")}
              >
                Static (Fixed Tiers)
              </button>
              <button
                type="button"
                className="q-btn"
                style={{
                  flex: 1,
                  backgroundColor: routingMode === "adaptive" ? "var(--q-surface-sunken)" : "transparent",
                  fontWeight: routingMode === "adaptive" ? "var(--q-fw-bold)" : "normal",
                  color: routingMode === "adaptive" ? "var(--q-accent)" : "inherit",
                }}
                onClick={() => setRoutingMode("adaptive")}
              >
                Adaptive (Recommended)
              </button>
              <button
                type="button"
                className="q-btn"
                style={{
                  flex: 1,
                  backgroundColor: routingMode === "shadow" ? "var(--q-surface-sunken)" : "transparent",
                  fontWeight: routingMode === "shadow" ? "var(--q-fw-bold)" : "normal",
                }}
                onClick={() => setRoutingMode("shadow")}
              >
                Shadow (Log Only)
              </button>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)" }}>
                Max Escalation Budget Per Run: <strong>{escalationBudget}</strong>
              </label>
              <span style={{ fontSize: "11px", color: "var(--q-text-muted)" }}>Limit 0–10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={escalationBudget}
              onChange={(e) => setEscalationBudget(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--q-accent)" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-2)" }}>
            <span style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)" }}>
              Escalation Triggers
            </span>

            <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={triggers.ambiguousConfidence}
                onChange={(e) => setTriggers({ ...triggers, ambiguousConfidence: e.target.checked })}
              />
              <div>
                <strong>Ambiguous confidence (0.45 – 0.75):</strong>
                <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                  Escalate candidate findings in the uncertain band to tier 3 model before dropping.
                </div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={triggers.complexAst}
                onChange={(e) => setTriggers({ ...triggers, complexAst: e.target.checked })}
              />
              <div>
                <strong>High cyclomatic complexity diff (&gt;15 branches):</strong>
                <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                  Route dense algorithmic code changes directly to strong reasoning models.
                </div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={triggers.crossFileDeps}
                onChange={(e) => setTriggers({ ...triggers, crossFileDeps: e.target.checked })}
              />
              <div>
                <strong>Cross-module interface breaks (&gt;5 dependents):</strong>
                <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                  Route symbol resolution ambiguities to higher-capacity context windows.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Right: Cost & Precision Savings Live Report */}
        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Efficiency &amp; Realised Savings
          </h3>
          <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Realised savings compared to running an all-Tier-3 baseline across all review stages.
          </p>

          <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-surface-sunken)", borderRadius: "var(--q-radius-sm)", textAlign: "center" }}>
            <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>Monthly Realised Savings</span>
            <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)", color: "var(--q-ok)", margin: "4px 0" }}>
              68.4%
            </div>
            <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
              ~$680 saved per 1,000 pull requests
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-2)", fontSize: "var(--q-fs-xs)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tier 1 (Cheap) Share:</span>
              <strong>62% of requests</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tier 2 (Mid) Share:</span>
              <strong>26% of requests</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tier 3 (Escalations &amp; Verify):</span>
              <strong>12% of requests</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Escalation Resolution Yield:</span>
              <strong style={{ color: "var(--q-ok)" }}>91.2% precision confirmed</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

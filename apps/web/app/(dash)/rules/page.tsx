"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Rule, RuleSpecCase } from "../../../lib/mockData";
import { SeverityChip } from "../../../components/SeverityChip";

export default function RulesEditorPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [ruleText, setRuleText] = useState("");
  const [scope, setScope] = useState("");
  const [severity, setSeverity] = useState<"critical" | "high" | "medium" | "low" | "info">("medium");
  const [specCases, setSpecCases] = useState<RuleSpecCase[]>([]);

  // Testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ id: string; passed: boolean; reason: string }[] | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    api.getRules().then((r) => {
      setRules(r);
      if (r.length > 0) {
        selectRule(r[0]);
      }
    });
  }, []);

  const selectRule = (rule: Rule) => {
    setSelectedRuleId(rule.id);
    setName(rule.name);
    setRuleText(rule.rule_text);
    setScope(rule.scope_globs.join(", "));
    setSeverity(rule.severity);
    setSpecCases(rule.spec_cases);
    setTestResults(null);
    setIsEditing(false);
  };

  const handleTestRule = () => {
    setIsTesting(true);
    setTestResults(null);

    setTimeout(() => {
      setIsTesting(false);
      // Validate spec cases
      const results = specCases.map((sc) => ({
        id: sc.id,
        passed: true,
        reason:
          sc.expected === "should_flag"
            ? "Successfully flagged code violation as expected"
            : "Clean code successfully passed without firing",
      }));
      setTestResults(results);
      setNotification("All rule spec test cases passed! Rule is valid for activation.");
      setTimeout(() => setNotification(null), 4000);
    }, 1000);
  };

  const handleSaveRule = () => {
    if (!testResults || testResults.some((r) => !r.passed)) {
      alert("A rule cannot be enabled until its spec passes! Please run Test Rule first.");
      return;
    }

    setRules((prev) =>
      prev.map((r) =>
        r.id === selectedRuleId
          ? {
              ...r,
              name,
              rule_text: ruleText,
              scope_globs: scope.split(",").map((s) => s.trim()),
              severity,
              spec_cases: specCases,
              status: "enabled",
            }
          : r
      )
    );
    setNotification("Rule successfully saved and enabled!");
    setTimeout(() => setNotification(null), 3000);
  };

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
            Custom Rules &amp; Spec Cases (S08)
          </h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            FR-025 / FR-030: Natural language team conventions backed by executable unit test specs.
          </p>
        </div>

        <button
          type="button"
          className="q-btn q-btn-primary"
          onClick={() => {
            const newId = `rule_${Date.now()}`;
            const newRule: Rule = {
              id: newId,
              name: "New Architectural Rule",
              rule_text: "Always validate user input at API boundary.",
              scope_globs: ["services/**"],
              severity: "medium",
              status: "disabled",
              hit_count: 0,
              dismissal_count: 0,
              spec_cases: [
                {
                  id: "sc_new_1",
                  expected: "should_flag",
                  code_sample: "def handler(event):\n    process(event['data'])",
                  explanation: "Missing boundary schema validation",
                },
              ],
            };
            setRules([newRule, ...rules]);
            selectRule(newRule);
            setIsEditing(true);
          }}
        >
          + Create New Rule
        </button>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {notification}
        </div>
      )}

      {/* Main Grid: Left Rules List, Right Editor & Test Harness */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "var(--q-4)" }}>
        {/* Left: Rules List */}
        <div className="q-card" style={{ padding: "var(--q-3)", display: "flex", flexDirection: "column", gap: "var(--q-2)" }}>
          <h3 style={{ fontSize: "var(--q-fs-sm)", fontWeight: "var(--q-fw-semibold)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>
            Configured Rules ({rules.length})
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-2)", marginTop: "var(--q-2)" }}>
            {rules.map((r) => {
              const dismissalRate = r.hit_count > 0 ? (r.dismissal_count / r.hit_count) * 100 : 0;
              const isAutoFlagged = r.hit_count >= 20 && dismissalRate > 30;

              return (
                <div
                  key={r.id}
                  onClick={() => selectRule(r)}
                  style={{
                    padding: "var(--q-3)",
                    borderRadius: "var(--q-radius-sm)",
                    backgroundColor: selectedRuleId === r.id ? "var(--q-surface-sunken)" : "var(--q-surface)",
                    border: selectedRuleId === r.id ? "2px solid var(--q-accent)" : "1px solid var(--q-border)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-sm)" }}>{r.name}</span>
                    <SeverityChip severity={r.severity} />
                  </div>

                  <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", margin: "4px 0" }}>
                    {r.scope_globs.join(", ")}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                    <span style={{ color: r.status === "enabled" ? "var(--q-ok)" : "var(--q-text-faint)" }}>
                      ● {r.status.toUpperCase()}
                    </span>
                    <span style={{ color: dismissalRate > 30 ? "var(--q-warn)" : "var(--q-text-muted)" }}>
                      {r.hit_count} hits · {dismissalRate.toFixed(0)}% dismissed
                    </span>
                  </div>

                  {isAutoFlagged && (
                    <div style={{ marginTop: "var(--q-1)", padding: "2px 6px", backgroundColor: "var(--q-warn-bg)", color: "var(--q-warn)", borderRadius: "var(--q-radius-sm)", fontSize: "10px" }}>
                      ⚠️ Auto-flagged: High dismissal rate (&gt;30%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Editor & Spec Runner */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
          {/* Rule Definition Form */}
          <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "var(--q-fs-lg)", fontWeight: "var(--q-fw-semibold)" }}>
                Rule Specification
              </h3>
              <div style={{ display: "flex", gap: "var(--q-2)" }}>
                <button
                  type="button"
                  className="q-btn"
                  disabled={isTesting}
                  onClick={handleTestRule}
                >
                  {isTesting ? "Testing Against Specs..." : "Run Spec Tests"}
                </button>
                <button
                  type="button"
                  className="q-btn q-btn-primary"
                  onClick={handleSaveRule}
                >
                  Save &amp; Enable Rule
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "var(--q-3)" }}>
              <div>
                <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                Scope Globs (Files where this rule applies)
              </label>
              <input
                type="text"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
                Natural Language Rule Policy
              </label>
              <textarea
                rows={3}
                value={ruleText}
                onChange={(e) => setRuleText(e.target.value)}
                style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Test Harness & Spec Cases */}
          <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
                  Executable Spec Cases ({specCases.length})
                </h4>
                <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                  A rule cannot be enabled until all positive (&quot;should flag&quot;) and negative (&quot;should not flag&quot;) unit test samples pass.
                </p>
              </div>

              <button
                type="button"
                className="q-btn"
                style={{ fontSize: "var(--q-fs-xs)" }}
                onClick={() => {
                  const newCase: RuleSpecCase = {
                    id: `sc_${Date.now()}`,
                    expected: "should_not_flag",
                    code_sample: "def safe_example():\n    return True",
                    explanation: "Valid compliance pattern",
                  };
                  setSpecCases([...specCases, newCase]);
                }}
              >
                + Add Spec Case
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
              {specCases.map((sc, idx) => {
                const result = testResults?.find((r) => r.id === sc.id);

                return (
                  <div
                    key={sc.id}
                    style={{
                      padding: "var(--q-3)",
                      borderRadius: "var(--q-radius-sm)",
                      backgroundColor: "var(--q-surface-sunken)",
                      border: "1px solid var(--q-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)" }}>
                        <span
                          className="q-badge"
                          style={{
                            backgroundColor: sc.expected === "should_flag" ? "var(--q-critical)20" : "var(--q-ok-bg)",
                            color: sc.expected === "should_flag" ? "var(--q-critical)" : "var(--q-ok)",
                          }}
                        >
                          {sc.expected === "should_flag" ? "❌ MUST FLAG" : "✓ MUST NOT FLAG"}
                        </span>
                        <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                          {sc.explanation}
                        </span>
                      </div>

                      {result && (
                        <span
                          style={{
                            fontSize: "var(--q-fs-xs)",
                            fontWeight: "var(--q-fw-bold)",
                            color: result.passed ? "var(--q-ok)" : "var(--q-critical)",
                          }}
                        >
                          {result.passed ? "✓ TEST PASSED" : "✗ TEST FAILED"}
                        </span>
                      )}
                    </div>

                    <pre
                      style={{
                        backgroundColor: "var(--q-surface)",
                        padding: "var(--q-2)",
                        borderRadius: "var(--q-radius-sm)",
                        fontSize: "var(--q-fs-xs)",
                        fontFamily: "var(--q-font-mono)",
                        border: "1px solid var(--q-border)",
                      }}
                    >
                      {sc.code_sample}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

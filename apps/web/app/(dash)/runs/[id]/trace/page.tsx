"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "../../../../../lib/api";
import { TraceNode } from "../../../../../lib/mockData";
import { RunTimeline } from "../../../../../components/RunTimeline";
import { GraphMap } from "../../../../../components/GraphMap";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RunTracePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const runId = resolvedParams.id;

  const [nodes, setNodes] = useState<TraceNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "graph">("timeline");
  const [replayNotice, setReplayNotice] = useState<string | null>(null);

  useEffect(() => {
    api.getTrace(runId).then((t) => {
      setNodes(t);
      if (t.length > 0) {
        setSelectedNodeId(t[0].id);
      }
    });
  }, [runId]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;

  const totalCost = nodes.reduce((sum, n) => sum + n.cost_usd, 0);
  const totalDuration = nodes.reduce((sum, n) => sum + n.duration_ms, 0);
  const totalTokens = nodes.reduce((sum, n) => sum + n.tokens_in + n.tokens_out, 0);

  const downloadTraceJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nodes, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trace-${runId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const triggerReplay = (checkpointId: string) => {
    setReplayNotice(`Sandboxed replay initiated from checkpoint: ${checkpointId}`);
    setTimeout(() => setReplayNotice(null), 4000);
  };

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", marginBottom: "var(--q-1)" }}>
            <Link href={`/runs/${runId}`} style={{ color: "var(--q-text-muted)", textDecoration: "none", fontSize: "var(--q-fs-sm)" }}>
              ← Back to Review Detail
            </Link>
            <span style={{ color: "var(--q-text-faint)" }}>/</span>
            <span style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)" }}>Trace Inspector</span>
          </div>
          <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
            Execution Trace: {runId}
          </h2>
          <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
            FR-050 inspectable LangGraph pipeline with model tiers, adaptive routing decisions, and redacted payloads.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--q-2)" }}>
          <button type="button" className="q-btn" onClick={downloadTraceJson}>
            Download Trace JSON
          </button>
          <button
            type="button"
            className="q-btn q-btn-primary"
            onClick={() => triggerReplay("checkpoint_node_triage_v1")}
          >
            Replay from Checkpoint
          </button>
        </div>
      </div>

      {replayNotice && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {replayNotice}
        </div>
      )}

      {/* Metrics Bar */}
      <div
        className="q-card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--q-4)",
          padding: "var(--q-4)",
        }}
      >
        <div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>Total Latency</span>
          <div style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-bold)" }}>{totalDuration} ms</div>
        </div>
        <div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>Total Tokens</span>
          <div style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-bold)" }}>{totalTokens.toLocaleString()}</div>
        </div>
        <div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>Execution Cost</span>
          <div style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-bold)", color: "var(--q-accent)" }}>${totalCost.toFixed(4)}</div>
        </div>
        <div>
          <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>Nodes Executed</span>
          <div style={{ fontSize: "var(--q-fs-xl)", fontWeight: "var(--q-fw-bold)" }}>{nodes.length}</div>
        </div>
      </div>

      {/* View Switcher */}
      <div style={{ display: "flex", gap: "var(--q-2)", borderBottom: "1px solid var(--q-border)", paddingBottom: "var(--q-2)" }}>
        <button
          type="button"
          className="q-btn"
          style={{
            backgroundColor: viewMode === "timeline" ? "var(--q-surface-sunken)" : "transparent",
            fontWeight: viewMode === "timeline" ? "var(--q-fw-bold)" : "normal",
          }}
          onClick={() => setViewMode("timeline")}
        >
          Node Timeline List
        </button>
        <button
          type="button"
          className="q-btn"
          style={{
            backgroundColor: viewMode === "graph" ? "var(--q-surface-sunken)" : "transparent",
            fontWeight: viewMode === "graph" ? "var(--q-fw-bold)" : "normal",
          }}
          onClick={() => setViewMode("graph")}
        >
          Graph Topology Map
        </button>
      </div>

      {/* Main View Area */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "var(--q-4)" }}>
        {/* Left: Execution Visualization */}
        <section aria-label="Pipeline Trace Structure">
          {viewMode === "timeline" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-2)" }}>
              {nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{
                    cursor: "pointer",
                    outline: selectedNode?.id === node.id ? "2px solid var(--q-accent)" : "none",
                    borderRadius: "var(--q-radius)",
                  }}
                >
                  <RunTimeline nodes={[node]} />
                </div>
              ))}
            </div>
          ) : (
            <GraphMap />
          )}
        </section>

        {/* Right: Node Detail & Redacted Payload Inspector */}
        <section aria-label="Node Inspector" className="q-card" style={{ padding: "var(--q-4)", height: "fit-content" }}>
          {selectedNode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "var(--q-fs-lg)", fontWeight: "var(--q-fw-semibold)" }}>
                  Node: {selectedNode.node_name}
                </h3>
                <span
                  className="q-badge"
                  style={{
                    backgroundColor: selectedNode.status === "success" ? "var(--q-ok-bg)" : "var(--q-critical-bg)",
                    color: selectedNode.status === "success" ? "var(--q-ok)" : "var(--q-critical)",
                  }}
                >
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                <div><strong>Model:</strong> {selectedNode.model}</div>
                <div><strong>Tier:</strong> {selectedNode.tier}</div>
                <div><strong>Prompt Asset:</strong> {selectedNode.prompt_version}</div>
                <div><strong>Duration:</strong> {selectedNode.duration_ms} ms</div>
                <div><strong>Tokens:</strong> {selectedNode.tokens_in} in / {selectedNode.tokens_out} out</div>
                {selectedNode.escalation_trigger && (
                  <div style={{ color: "var(--q-high)", marginTop: "var(--q-1)" }}>
                    <strong>Escalation:</strong> {selectedNode.escalation_trigger}
                  </div>
                )}
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--q-border)" }} />

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--q-1)" }}>
                  <span style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-semibold)", textTransform: "uppercase" }}>
                    Redacted State & Payload
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--q-text-muted)" }}>
                    Secrets masked server-side [AC-052]
                  </span>
                </div>
                {(() => {
                  const MAX_PAYLOAD_BYTES = 256 * 1024;
                  const rawPayload = JSON.stringify(
                    {
                      node_id: selectedNode.id,
                      node_name: selectedNode.node_name,
                      model_dispatched: selectedNode.model,
                      tier: selectedNode.tier,
                      tokens: {
                        in: selectedNode.tokens_in,
                        out: selectedNode.tokens_out,
                      },
                      cost_usd: selectedNode.cost_usd,
                      escalation: selectedNode.escalation_trigger
                        ? { trigger: selectedNode.escalation_trigger, original_tier: "tier_1_cheap" }
                        : null,
                      env_context: {
                        github_token: "[REDACTED]",
                        org_secret_key: "[REDACTED]",
                      },
                      checkpoint_id: `chk_${selectedNode.node_name}_${selectedNode.id}`,
                    },
                    null,
                    2
                  );

                  const isTruncated = rawPayload.length > MAX_PAYLOAD_BYTES;
                  const displayedPayload = isTruncated
                    ? rawPayload.slice(0, MAX_PAYLOAD_BYTES) + "\n\n... [TRUNCATED: Payload exceeds 256 KB threshold [AC-S06]]"
                    : rawPayload;

                  const downloadFullPayload = () => {
                    const blob = new Blob([rawPayload], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `payload-${selectedNode.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  };

                  return (
                    <>
                      <pre
                        style={{
                          backgroundColor: "var(--q-surface-sunken)",
                          padding: "var(--q-3)",
                          borderRadius: "var(--q-radius-sm)",
                          fontSize: "var(--q-fs-xs)",
                          fontFamily: "var(--q-font-mono)",
                          overflowX: "auto",
                          maxHeight: "350px",
                          border: "1px solid var(--q-border)",
                        }}
                      >
                        {displayedPayload}
                      </pre>

                      <div style={{ display: "flex", gap: "var(--q-2)", marginTop: "var(--q-2)" }}>
                        <button
                          type="button"
                          className="q-btn"
                          style={{ fontSize: "var(--q-fs-xs)" }}
                          onClick={() => {
                            navigator.clipboard.writeText(rawPayload);
                            alert(`Payload copied for node ${selectedNode.node_name}`);
                          }}
                        >
                          Copy Node Payload
                        </button>
                        {isTruncated && (
                          <button
                            type="button"
                            className="q-btn"
                            style={{ fontSize: "var(--q-fs-xs)" }}
                            onClick={downloadFullPayload}
                          >
                            Download Full Payload (Exceeds 256 KB)
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)" }}>Select a node to inspect payload</div>
          )}
        </section>
      </div>
    </div>
  );
}

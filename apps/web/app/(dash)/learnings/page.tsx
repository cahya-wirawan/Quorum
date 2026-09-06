"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Learning } from "../../../lib/mockData";
import { PolicyDialog } from "../../../components/PolicyDialog";

export default function LearningsPage() {
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [search, setSearch] = useState("");
  const [filterScope, setFilterScope] = useState("all");
  const [notification, setNotification] = useState<string | null>(null);

  // Policy confirmation modal for security suppression promotion or delete
  const [confirmModal, setConfirmModal] = useState<{
    learningId: string;
    action: "promote" | "delete";
    title: string;
    description: string;
    keyword: string;
  } | null>(null);

  useEffect(() => {
    api.getLearnings().then(setLearnings);
  }, []);

  const handlePromote = (learning: Learning) => {
    if (learning.suppresses_severity.includes("high") || learning.suppresses_severity.includes("critical")) {
      setConfirmModal({
        learningId: learning.id,
        action: "promote",
        title: "Promote High/Critical Learning to Org Level",
        description: `This learning will suppress ${learning.suppresses_severity.join(", ")} findings across ALL repositories in the organization.`,
        keyword: "CONFIRM PROMOTION",
      });
    } else {
      setLearnings((prev) =>
        prev.map((l) => (l.id === learning.id ? { ...l, scope: "org" as const } : l))
      );
      setNotification(`Learning promoted to Organization scope.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDelete = (learning: Learning) => {
    setConfirmModal({
      learningId: learning.id,
      action: "delete",
      title: "Delete Inferred Learning",
      description: "Deleting this learning will remove the suppression rule. Similar future findings will be surfaced again.",
      keyword: "DELETE LEARNING",
    });
  };

  const handleConfirmModal = () => {
    if (!confirmModal) return;
    if (confirmModal.action === "promote") {
      setLearnings((prev) =>
        prev.map((l) => (l.id === confirmModal.learningId ? { ...l, scope: "org" as const } : l))
      );
      setNotification("High-severity learning promoted across organization.");
    } else if (confirmModal.action === "delete") {
      setLearnings((prev) => prev.filter((l) => l.id !== confirmModal.learningId));
      setNotification("Learning deleted.");
    }
    setConfirmModal(null);
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = learnings.filter((l) => {
    if (filterScope !== "all" && l.scope !== filterScope) return false;
    if (search && !l.statement.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
          Inferred Learnings &amp; Suppressions (S09)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          FR-061: Machine-inferred suppression rules derived from developer feedback and dismissals.
        </p>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {notification}
        </div>
      )}

      {/* Filter Bar */}
      <div className="q-card" style={{ display: "flex", gap: "var(--q-3)", alignItems: "center", padding: "var(--q-3)" }}>
        <input
          type="text"
          placeholder="Filter learnings by statement..."
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
          value={filterScope}
          onChange={(e) => setFilterScope(e.target.value)}
          style={{
            padding: "var(--q-2) var(--q-3)",
            borderRadius: "var(--q-radius-sm)",
            border: "1px solid var(--q-border)",
            backgroundColor: "var(--q-surface)",
            color: "var(--q-text)",
            fontSize: "var(--q-fs-sm)",
          }}
        >
          <option value="all">All Scopes</option>
          <option value="repository">Repository Scope</option>
          <option value="org">Organization Wide</option>
        </select>
      </div>

      {/* Learnings Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
        {filtered.length === 0 ? (
          <div className="q-card" style={{ padding: "var(--q-6)", textAlign: "center", color: "var(--q-text-muted)" }}>
            <div style={{ fontSize: "28px", marginBottom: "var(--q-2)" }}>💡</div>
            <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>No learnings yet</h4>
            <p style={{ fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
              Learnings automatically generate as team members dismiss findings with explanatory feedback.
            </p>
          </div>
        ) : (
          filtered.map((l) => {
            const hasHighSeverity =
              l.suppresses_severity.includes("high") || l.suppresses_severity.includes("critical");

            return (
              <div key={l.id} className="q-card" style={{ padding: "var(--q-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--q-3)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-2)", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)" }}>
                      <span
                        className="q-badge"
                        style={{
                          backgroundColor: l.scope === "org" ? "var(--q-accent-soft)" : "var(--q-surface-sunken)",
                          color: l.scope === "org" ? "var(--q-accent)" : "var(--q-text-muted)",
                          border: "1px solid var(--q-border)",
                        }}
                      >
                        {l.scope.toUpperCase()} SCOPE
                      </span>
                      {hasHighSeverity && (
                        <span
                          className="q-badge"
                          style={{ backgroundColor: "var(--q-high-bg)", color: "var(--q-high)" }}
                        >
                          ⚠️ SUPPRESSES HIGH/CRITICAL
                        </span>
                      )}
                      <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                        Created {l.created_at}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
                      &ldquo;{l.statement}&rdquo;
                    </h4>

                    <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                      <span>Origin: <code>{l.origin_finding_id}</code></span>
                      <span style={{ margin: "0 var(--q-2)" }}>·</span>
                      <span>Suppressed: <strong>{l.suppression_count}</strong> occurrences</span>
                      <span style={{ margin: "0 var(--q-2)" }}>·</span>
                      <span>Last triggered: {l.last_used}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "var(--q-2)", alignItems: "center" }}>
                    {l.scope === "repository" && (
                      <button
                        type="button"
                        className="q-btn"
                        style={{ fontSize: "var(--q-fs-xs)" }}
                        onClick={() => handlePromote(l)}
                      >
                        Promote to Org
                      </button>
                    )}
                    <button
                      type="button"
                      className="q-btn q-btn-danger"
                      style={{ fontSize: "var(--q-fs-xs)" }}
                      onClick={() => handleDelete(l)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {confirmModal && (
        <PolicyDialog
          isOpen={true}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmationKeyword={confirmModal.keyword}
          onConfirm={handleConfirmModal}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

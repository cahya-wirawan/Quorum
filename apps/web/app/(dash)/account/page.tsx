"use client";

import React, { useState } from "react";

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
}

export default function AccountPage() {
  const [notificationPref, setNotificationPref] = useState<"digest" | "critical_only" | "off">("critical_only");
  const [tokens, setTokens] = useState<ApiToken[]>([
    {
      id: "tok_1",
      name: "CLI Automation Key",
      prefix: "qrm_live_7a8b...",
      scopes: ["runs:read", "runs:write"],
      expiresAt: "2027-03-01",
      createdAt: "2026-09-01",
    },
  ]);

  // Token generator form
  const [tokenName, setTokenName] = useState("");
  const [tokenExpiryDays, setTokenExpiryDays] = useState(90);
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sessions = [
    { id: "sess_1", device: "Chrome 128 on Linux (This device)", location: "Frankfurt, Germany", ip: "192.0.2.45", lastSeen: "Active now" },
    { id: "sess_2", device: "CLI Client v2026.09.1", location: "Frankfurt, Germany", ip: "192.0.2.45", lastSeen: "2 hours ago" },
  ];

  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName) return;

    if (tokenExpiryDays > 365) {
      alert("Validation Error: Personal access tokens cannot exceed 365 days expiry.");
      return;
    }

    const randomSecret = `qrm_live_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + tokenExpiryDays);

    const newToken: ApiToken = {
      id: `tok_${Date.now()}`,
      name: tokenName,
      prefix: `${randomSecret.substring(0, 12)}...`,
      scopes: ["runs:read", "runs:write", "rules:read"],
      expiresAt: expiresDate.toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setTokens([...tokens, newToken]);
    setNewlyCreatedSecret(randomSecret);
    setTokenName("");
    setStatusMessage("Token created! Copy your secret now — it will never be displayed again.");
  };

  const handleRevokeToken = (tokenId: string) => {
    setTokens(tokens.filter((t) => t.id !== tokenId));
    setStatusMessage("API token revoked.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
          Personal Account &amp; Credentials (S17)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          Manage your personal profile, linked Git host identity, notifications, and API tokens.
        </p>
      </div>

      {statusMessage && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Grid: Profile & Notification Preferences */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--q-4)" }}>
        {/* Profile */}
        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Profile Details
          </h3>

          <div>
            <label style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", display: "block" }}>Full Name</label>
            <div style={{ fontWeight: "var(--q-fw-medium)", fontSize: "var(--q-fs-sm)" }}>Alice Vance</div>
          </div>

          <div>
            <label style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", display: "block" }}>Work Email</label>
            <div style={{ fontWeight: "var(--q-fw-medium)", fontSize: "var(--q-fs-sm)" }}>alice@acme.corp</div>
          </div>

          <div>
            <label style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", display: "block" }}>Linked Git Host Identity</label>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", marginTop: "4px" }}>
              <span>🐙</span>
              <strong style={{ fontSize: "var(--q-fs-sm)", fontFamily: "var(--q-font-mono)" }}>@alice-vance (GitHub)</strong>
              <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)" }}>LINKED</span>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Email Notification Preferences
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--q-2)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
              <input
                type="radio"
                name="notifications"
                checked={notificationPref === "digest"}
                onChange={() => setNotificationPref("digest")}
              />
              <div>
                <strong>Daily Repository Digest:</strong> Summary of all PR reviews and yield metrics.
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
              <input
                type="radio"
                name="notifications"
                checked={notificationPref === "critical_only"}
                onChange={() => setNotificationPref("critical_only")}
              />
              <div>
                <strong>Critical &amp; High Only (Recommended):</strong> Immediate alert when verified blocking defects are found.
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", fontSize: "var(--q-fs-sm)", cursor: "pointer" }}>
              <input
                type="radio"
                name="notifications"
                checked={notificationPref === "off"}
                onChange={() => setNotificationPref("off")}
              />
              <div>
                <strong>Off:</strong> Do not send review notification emails.
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Personal API Tokens (PAT) */}
      <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-4)" }}>
        <div>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Personal Access Tokens (PAT)
          </h3>
          <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", marginTop: "2px" }}>
            Used to authenticate the Quorum CLI (<code>quorum login</code>) and CI/CD pipelines.
          </p>
        </div>

        {/* Token Reveal Alert */}
        {newlyCreatedSecret && (
          <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", border: "1px solid var(--q-ok)", borderRadius: "var(--q-radius-sm)" }}>
            <div style={{ fontWeight: "var(--q-fw-semibold)", fontSize: "var(--q-fs-xs)", color: "var(--q-ok)", marginBottom: "4px" }}>
              ⚠️ Make sure to copy your personal access token now. You will not be able to see it again!
            </div>
            <div style={{ display: "flex", gap: "var(--q-2)", alignItems: "center" }}>
              <code style={{ flex: 1, padding: "var(--q-2)", backgroundColor: "var(--q-surface)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-xs)", fontFamily: "var(--q-font-mono)", border: "1px solid var(--q-border)" }}>
                {newlyCreatedSecret}
              </code>
              <button
                type="button"
                className="q-btn"
                onClick={() => {
                  navigator.clipboard.writeText(newlyCreatedSecret);
                  alert("Token copied to clipboard!");
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Token Creation Form */}
        <form onSubmit={handleGenerateToken} style={{ display: "flex", gap: "var(--q-3)", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
              Token Description / Name
            </label>
            <input
              type="text"
              placeholder="e.g. Laptop CLI / Jenkins Worker"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
            />
          </div>

          <div style={{ width: "180px" }}>
            <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
              Expiration (Days, max 365)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={tokenExpiryDays}
              onChange={(e) => setTokenExpiryDays(Number(e.target.value))}
              style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
            />
          </div>

          <button type="submit" className="q-btn q-btn-primary">
            Generate New Token
          </button>
        </form>

        {/* Token List */}
        <table className="q-table">
          <thead>
            <tr>
              <th>Token Name</th>
              <th>Key Prefix</th>
              <th>Scopes</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong></td>
                <td><code style={{ fontSize: "var(--q-fs-xs)" }}>{t.prefix}</code></td>
                <td>
                  <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
                    {t.scopes.join(", ")}
                  </span>
                </td>
                <td style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>{t.createdAt}</td>
                <td style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>{t.expiresAt}</td>
                <td>
                  <button
                    type="button"
                    className="q-btn q-btn-danger"
                    style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
                    onClick={() => handleRevokeToken(t.id)}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Active Login Sessions */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--q-3) var(--q-4)", borderBottom: "1px solid var(--q-border)", backgroundColor: "var(--q-surface-sunken)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Active Login Sessions
          </h3>
        </div>

        <table className="q-table">
          <thead>
            <tr>
              <th>Client / Browser</th>
              <th>Location</th>
              <th>IP Address</th>
              <th>Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.device}</strong></td>
                <td>{s.location}</td>
                <td style={{ fontSize: "var(--q-fs-xs)", fontFamily: "var(--q-font-mono)", color: "var(--q-text-muted)" }}>{s.ip}</td>
                <td style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>{s.lastSeen}</td>
                <td>
                  {s.id !== "sess_1" && (
                    <button
                      type="button"
                      className="q-btn q-btn-danger"
                      style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
                      onClick={() => alert(`Revoking session ${s.id}`)}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "maintainer" | "member" | "auditor";
  git_identity: string;
  last_active: string;
}

export default function OrganizationMembersPage() {
  const [members, setMembers] = useState<Member[]>([
    {
      id: "m_1",
      name: "Alice Vance",
      email: "alice@acme.corp",
      role: "owner",
      git_identity: "@alice-vance (GitHub)",
      last_active: "10 mins ago",
    },
    {
      id: "m_2",
      name: "Bob Stone",
      email: "bob@acme.corp",
      role: "maintainer",
      git_identity: "@bstone-acme (GitHub)",
      last_active: "2 hours ago",
    },
    {
      id: "m_3",
      name: "Carol Danvers",
      email: "carol@acme.corp",
      role: "member",
      git_identity: "@cdanvers (GitHub)",
      last_active: "Yesterday",
    },
    {
      id: "m_4",
      name: "David Kim",
      email: "david@acme.corp",
      role: "auditor",
      git_identity: "@dkim-audit (GitHub)",
      last_active: "3 days ago",
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Member["role"]>("member");
  const [notification, setNotification] = useState<string | null>(null);

  const ownerCount = members.filter((m) => m.role === "owner").length;

  const handleRoleChange = (memberId: string, newRole: Member["role"]) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    if (target.role === "owner" && newRole !== "owner" && ownerCount <= 1) {
      alert("Validation Error: Cannot demote the last organization owner. Transfer or add another owner first.");
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    setNotification(`Updated ${target.name}'s role to ${newRole.toUpperCase()}`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRemove = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    if (target.role === "owner" && ownerCount <= 1) {
      alert("Validation Error: Cannot remove the last organization owner.");
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setNotification(`Removed ${target.name} from organization.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: Member = {
      id: `m_${Date.now()}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole,
      git_identity: "Pending GitHub Link",
      last_active: "Invited",
    };

    setMembers([...members, newMember]);
    setInviteEmail("");
    setNotification(`Invitation sent to ${inviteEmail} with role ${inviteRole}.`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
          Team &amp; Members (S11)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          Manage team access, role-based permissions, and linked Git host identities.
        </p>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {notification}
        </div>
      )}

      {/* Invite Box */}
      <form onSubmit={handleInvite} className="q-card" style={{ padding: "var(--q-4)", display: "flex", gap: "var(--q-3)", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
            Invite by Email
          </label>
          <input
            type="email"
            placeholder="colleague@acme.corp"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
          />
        </div>

        <div style={{ width: "180px" }}>
          <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
            Role
          </label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as any)}
            style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)" }}
          >
            <option value="member">Member (Read &amp; Dismiss)</option>
            <option value="maintainer">Maintainer (Post held &amp; Suppress)</option>
            <option value="auditor">Auditor (Read-only)</option>
            <option value="owner">Owner (Full Admin)</option>
          </select>
        </div>

        <button type="submit" className="q-btn q-btn-primary">
          Send Invitation
        </button>
      </form>

      {/* Member Table */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="q-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Linked Git Identity</th>
              <th>Role</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <div style={{ fontWeight: "var(--q-fw-semibold)" }}>{m.name}</div>
                  <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>{m.email}</div>
                </td>
                <td style={{ fontSize: "var(--q-fs-sm)", fontFamily: "var(--q-font-mono)", color: "var(--q-text-muted)" }}>
                  {m.git_identity}
                </td>
                <td>
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value as any)}
                    style={{
                      padding: "var(--q-1) var(--q-2)",
                      borderRadius: "var(--q-radius-sm)",
                      border: "1px solid var(--q-border)",
                      backgroundColor: "var(--q-surface)",
                      color: "var(--q-text)",
                      fontSize: "var(--q-fs-xs)",
                    }}
                  >
                    <option value="owner">Owner</option>
                    <option value="maintainer">Maintainer</option>
                    <option value="member">Member</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </td>
                <td style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)" }}>
                  {m.last_active}
                </td>
                <td>
                  <button
                    type="button"
                    className="q-btn q-btn-danger"
                    style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
                    onClick={() => handleRemove(m.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enterprise SSO / SCIM Card */}
      <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h4 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            SAML 2.0 / OIDC Single Sign-On (SSO) &amp; SCIM
          </h4>
          <p style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", marginTop: "4px" }}>
            Enforce corporate identity provider login via Okta, Google Workspace, or Azure Active Directory.
          </p>
        </div>
        <button type="button" className="q-btn" onClick={() => alert("SSO configuration is available on Business and Enterprise plans.")}>
          Configure SSO
        </button>
      </div>
    </div>
  );
}

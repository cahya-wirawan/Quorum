"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Banner } from "../../components/Banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  const navItems = [
    { label: "Reviews Inbox", href: "/runs", icon: "📥" },
    { label: "Repositories", href: "/repos", icon: "📁" },
    { label: "Rules Editor", href: "/rules", icon: "📜" },
    { label: "Learnings", href: "/learnings", icon: "💡" },
    { label: "Analytics", href: "/analytics", icon: "📊" },
    { label: "Audit Log", href: "/audit", icon: "📋" },
    { label: "System Health", href: "/health", icon: "🩺" },
  ];

  const settingsItems = [
    { label: "Git Integrations", href: "/settings/integrations", icon: "🔌" },
    { label: "Model Providers", href: "/settings/providers", icon: "🤖" },
    { label: "Team & Members", href: "/org/members", icon: "👥" },
    { label: "Billing & Plans", href: "/billing", icon: "💳" },
    { label: "Data & Privacy", href: "/settings/privacy", icon: "🔒" },
    { label: "My Account", href: "/account", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      {/* Offline Alert Banner */}
      {isOffline && (
        <Banner
          type="warn"
          message="Git host connection degraded — queued runs will resume automatically."
          actionText="Dismiss"
          onAction={() => setIsOffline(false)}
        />
      )}

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "var(--q-sidebar)",
            backgroundColor: "var(--q-surface)",
            borderRight: "1px solid var(--q-border)",
            display: "flex",
            flexDirection: "column",
            padding: "var(--q-4)",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--q-2)", marginBottom: "var(--q-6)" }}>
            <span style={{ fontSize: "20px" }}>🛡️</span>
            <div>
              <h1 style={{ fontSize: "var(--q-fs-lg)", fontWeight: "var(--q-fw-semibold)", lineHeight: 1 }}>Quorum</h1>
              <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>Evidence-first review</span>
            </div>
          </div>

          {/* Org Selector */}
          <div
            style={{
              padding: "var(--q-2)",
              backgroundColor: "var(--q-surface-sunken)",
              borderRadius: "var(--q-radius-sm)",
              marginBottom: "var(--q-5)",
              fontSize: "var(--q-fs-xs)",
              fontWeight: "var(--q-fw-medium)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>🏢 Acme Corp</span>
            <span style={{ color: "var(--q-text-faint)" }}>Business</span>
          </div>

          {/* Nav List */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)", textTransform: "uppercase", paddingLeft: "var(--q-2)", marginBottom: "var(--q-1)" }}>
              Workspace
            </div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--q-2)",
                  padding: "var(--q-2) var(--q-3)",
                  borderRadius: "var(--q-radius-sm)",
                  color: "var(--q-text)",
                  fontSize: "var(--q-fs-sm)",
                  textDecoration: "none",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-faint)", textTransform: "uppercase", paddingLeft: "var(--q-2)", marginTop: "var(--q-4)", marginBottom: "var(--q-1)" }}>
              Administration
            </div>
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--q-2)",
                  padding: "var(--q-2) var(--q-3)",
                  borderRadius: "var(--q-radius-sm)",
                  color: "var(--q-text)",
                  fontSize: "var(--q-fs-sm)",
                  textDecoration: "none",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer controls */}
          <div style={{ marginTop: "auto", paddingTop: "var(--q-4)", borderTop: "1px solid var(--q-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="q-btn"
              style={{ fontSize: "var(--q-fs-xs)", padding: "2px 8px" }}
              onClick={toggleTheme}
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <span style={{ fontSize: "11px", color: "var(--q-text-faint)" }}>v0.1.0</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, backgroundColor: "var(--q-bg)", padding: "var(--q-5)", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

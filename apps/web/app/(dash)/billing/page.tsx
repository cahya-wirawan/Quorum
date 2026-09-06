"use client";

import React, { useState } from "react";

export default function BillingPage() {
  const [plan] = useState("Scale Tier");
  const [creditsUsed] = useState(6420);
  const [creditCap, setCreditCap] = useState(10000);
  const [overagePolicy, setOveragePolicy] = useState<"degrade_to_observe" | "notify_only">("degrade_to_observe");
  const [notification, setNotification] = useState<string | null>(null);

  const invoices = [
    { id: "INV-2026-08", date: "Aug 31, 2026", amount: "$384.20", status: "Paid", pdfUrl: "#" },
    { id: "INV-2026-07", date: "Jul 31, 2026", amount: "$298.50", status: "Paid", pdfUrl: "#" },
    { id: "INV-2026-06", date: "Jun 30, 2026", amount: "$210.00", status: "Paid", pdfUrl: "#" },
  ];

  const handleCapChange = (newCap: number) => {
    if (newCap < creditsUsed) {
      alert("Warning: Setting the credit cap below current usage will cause new review runs to immediately degrade to Observe mode.");
    }
    setCreditCap(newCap);
    setNotification("Monthly credit cap updated.");
    setTimeout(() => setNotification(null), 3000);
  };

  const usagePct = Math.min(100, Math.round((creditsUsed / creditCap) * 100));

  return (
    <div style={{ maxWidth: "var(--q-max-content)", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--q-5)" }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-semibold)" }}>
          Billing, Usage &amp; Plans (S13)
        </h2>
        <p style={{ color: "var(--q-text-muted)", fontSize: "var(--q-fs-sm)", marginTop: "var(--q-1)" }}>
          Track model execution credits, manage monthly spending caps, and configure overage policies.
        </p>
      </div>

      {notification && (
        <div style={{ padding: "var(--q-3)", backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)", borderRadius: "var(--q-radius-sm)", fontSize: "var(--q-fs-sm)" }}>
          ✓ {notification}
        </div>
      )}

      {/* Grid: Plan card + Credit usage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--q-4)" }}>
        {/* Plan Details */}
        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)", textTransform: "uppercase" }}>Current Subscription</span>
              <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)" }}>ACTIVE</span>
            </div>

            <h3 style={{ fontSize: "var(--q-fs-2xl)", fontWeight: "var(--q-fw-bold)", margin: "var(--q-2) 0" }}>
              {plan}
            </h3>

            <ul style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text)", paddingLeft: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-1)" }}>
              <li>Unlimited pull request reviews</li>
              <li>Multi-provider adaptive routing (Claude 3.5 Sonnet + Haiku)</li>
              <li>Adversarial verification &amp; executable rule specs</li>
              <li>Custom retention &amp; zero-persistence guarantees</li>
              <li>Up to 25 team members (4 active)</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: "var(--q-2)", marginTop: "var(--q-4)" }}>
            <button type="button" className="q-btn q-btn-primary">Upgrade to Enterprise</button>
            <button type="button" className="q-btn">Update Card (•••• 4242)</button>
          </div>
        </div>

        {/* Credit Meter */}
        <div className="q-card" style={{ padding: "var(--q-4)", display: "flex", flexDirection: "column", gap: "var(--q-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
              Execution Credits Meter
            </h3>
            <span style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
              Billing period ends Sept 30
            </span>
          </div>

          <div style={{ fontSize: "var(--q-fs-3xl)", fontWeight: "var(--q-fw-bold)" }}>
            {creditsUsed.toLocaleString()} <span style={{ fontSize: "var(--q-fs-sm)", color: "var(--q-text-muted)", fontWeight: "normal" }}>/ {creditCap.toLocaleString()} credits ({usagePct}%)</span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={usagePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Execution credits used"
            style={{
              height: "10px",
              borderRadius: "5px",
              backgroundColor: "var(--q-border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${usagePct}%`,
                backgroundColor: usagePct > 90 ? "var(--q-critical)" : "var(--q-accent)",
              }}
            />
          </div>

          <div style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-text-muted)" }}>
            Projected end-of-month: <strong>~8,200 credits</strong> (within configured cap).
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--q-border)" }} />

          {/* Overage Policy */}
          <div>
            <label style={{ fontSize: "var(--q-fs-xs)", fontWeight: "var(--q-fw-medium)", display: "block", marginBottom: "4px" }}>
              Overage Policy (When cap is reached)
            </label>
            <select
              value={overagePolicy}
              onChange={(e) => setOveragePolicy(e.target.value as any)}
              style={{ width: "100%", padding: "var(--q-2)", borderRadius: "var(--q-radius-sm)", border: "1px solid var(--q-border)", backgroundColor: "var(--q-surface)", color: "var(--q-text)", fontSize: "var(--q-fs-xs)" }}
            >
              <option value="degrade_to_observe">Degrade to Observe mode (Prevent excess charges)</option>
              <option value="notify_only">Notify Admins only (Continue inline posting at $0.05 / 100 credits)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="q-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--q-3) var(--q-4)", borderBottom: "1px solid var(--q-border)", backgroundColor: "var(--q-surface-sunken)" }}>
          <h3 style={{ fontSize: "var(--q-fs-base)", fontWeight: "var(--q-fw-semibold)" }}>
            Invoice History
          </h3>
        </div>

        <table className="q-table">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Billing Date</th>
              <th>Amount (USD)</th>
              <th>Status</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td><strong>{inv.id}</strong></td>
                <td>{inv.date}</td>
                <td>{inv.amount}</td>
                <td>
                  <span className="q-badge" style={{ backgroundColor: "var(--q-ok-bg)", color: "var(--q-ok)" }}>
                    {inv.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  <a
                    href={inv.pdfUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Downloading invoice ${inv.id}`);
                    }}
                    style={{ fontSize: "var(--q-fs-xs)", color: "var(--q-accent)", textDecoration: "none" }}
                  >
                    Download PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

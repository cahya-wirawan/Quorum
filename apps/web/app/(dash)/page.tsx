import React from "react";

export default function DashboardPage() {
  return (
    <main className="dashboard-container">
      <header className="header">
        <h1>Quorum Code Review Dashboard</h1>
        <p>Autonomous code review pipeline that only speaks when it can prove it.</p>
      </header>
      <section className="runs-table">
        <h2>Active Reviews</h2>
        <div className="run-card">
          <span>Run #123 — PR #42</span>
          <span className="badge badge-pass">PASS</span>
        </div>
      </section>
    </main>
  );
}

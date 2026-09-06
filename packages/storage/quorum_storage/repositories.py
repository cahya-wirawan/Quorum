"""Tenant-scoped database repository implementations."""
from __future__ import annotations

import sqlite3
from typing import Any, Dict, List, Optional
from quorum_storage.models import FindingRecord, LearningRecord, RunRecord, SuppressionRecord


class StorageRepository:
    """Multi-tenant persistence repository with enforced org_id scoping."""

    def __init__(self, db_path: str = ":memory:"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        cur = self.conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                run_id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                repo_id TEXT NOT NULL,
                pr_number INTEGER NOT NULL,
                head_sha TEXT NOT NULL,
                base_sha TEXT NOT NULL,
                status TEXT NOT NULL,
                mode TEXT NOT NULL,
                verdict TEXT,
                lanes_run TEXT,
                lanes_degraded TEXT,
                summary_markdown TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS findings (
                id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                repo_id TEXT NOT NULL,
                run_id TEXT NOT NULL,
                fingerprint TEXT NOT NULL,
                title TEXT NOT NULL,
                claim TEXT NOT NULL,
                severity TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT NOT NULL,
                path TEXT NOT NULL,
                line_start INTEGER NOT NULL,
                line_end INTEGER NOT NULL,
                rank_score REAL NOT NULL,
                evidence_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS suppressions (
                id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                repo_id TEXT NOT NULL,
                fingerprint TEXT NOT NULL,
                reason TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS learnings (
                id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                repo_id TEXT NOT NULL,
                rule_text TEXT NOT NULL,
                created_from_finding_id TEXT,
                active INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        self.conn.commit()

    # --- Runs Repository ---
    def save_run(self, run: RunRecord) -> None:
        import json
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT OR REPLACE INTO runs (
                run_id, org_id, repo_id, pr_number, head_sha, base_sha,
                status, mode, verdict, lanes_run, lanes_degraded,
                summary_markdown, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run.run_id,
                run.org_id,
                run.repo_id,
                run.pr_number,
                run.head_sha,
                run.base_sha,
                run.status,
                run.mode,
                run.verdict,
                json.dumps(run.lanes_run),
                json.dumps(run.lanes_degraded),
                run.summary_markdown,
                run.created_at,
                run.updated_at,
            ),
        )
        self.conn.commit()

    def get_run(self, org_id: str, run_id: str) -> Optional[RunRecord]:
        import json
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM runs WHERE org_id = ? AND run_id = ?",
            (org_id, run_id),
        )
        row = cur.fetchone()
        if not row:
            return None
        return RunRecord(
            run_id=row["run_id"],
            org_id=row["org_id"],
            repo_id=row["repo_id"],
            pr_number=row["pr_number"],
            head_sha=row["head_sha"],
            base_sha=row["base_sha"],
            status=row["status"],
            mode=row["mode"],
            verdict=row["verdict"],
            lanes_run=json.loads(row["lanes_run"] or "[]"),
            lanes_degraded=json.loads(row["lanes_degraded"] or "[]"),
            summary_markdown=row["summary_markdown"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    # --- Findings Repository ---
    def save_finding(self, finding: FindingRecord) -> None:
        import json
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT OR REPLACE INTO findings (
                id, org_id, repo_id, run_id, fingerprint, title, claim,
                severity, category, status, path, line_start, line_end,
                rank_score, evidence_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                finding.id,
                finding.org_id,
                finding.repo_id,
                finding.run_id,
                finding.fingerprint,
                finding.title,
                finding.claim,
                finding.severity,
                finding.category,
                finding.status,
                finding.path,
                finding.line_start,
                finding.line_end,
                finding.rank_score,
                json.dumps(finding.evidence_data),
                finding.created_at,
            ),
        )
        self.conn.commit()

    def get_findings_for_run(self, org_id: str, run_id: str) -> List[FindingRecord]:
        import json
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM findings WHERE org_id = ? AND run_id = ? ORDER BY rank_score DESC",
            (org_id, run_id),
        )
        rows = cur.fetchall()
        results = []
        for r in rows:
            results.append(
                FindingRecord(
                    id=r["id"],
                    org_id=r["org_id"],
                    repo_id=r["repo_id"],
                    run_id=r["run_id"],
                    fingerprint=r["fingerprint"],
                    title=r["title"],
                    claim=r["claim"],
                    severity=r["severity"],
                    category=r["category"],
                    status=r["status"],
                    path=r["path"],
                    line_start=r["line_start"],
                    line_end=r["line_end"],
                    rank_score=r["rank_score"],
                    evidence_data=json.loads(r["evidence_json"] or "[]"),
                    created_at=r["created_at"],
                )
            )
        return results

    # --- Suppressions Repository ---
    def add_suppression(self, sup: SuppressionRecord) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            INSERT OR REPLACE INTO suppressions (
                id, org_id, repo_id, fingerprint, reason, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sup.id,
                sup.org_id,
                sup.repo_id,
                sup.fingerprint,
                sup.reason,
                sup.created_by,
                sup.created_at,
            ),
        )
        self.conn.commit()

    def get_suppressions_for_repo(self, org_id: str, repo_id: str) -> List[SuppressionRecord]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM suppressions WHERE org_id = ? AND repo_id = ?",
            (org_id, repo_id),
        )
        rows = cur.fetchall()
        return [
            SuppressionRecord(
                id=r["id"],
                org_id=r["org_id"],
                repo_id=r["repo_id"],
                fingerprint=r["fingerprint"],
                reason=r["reason"],
                created_by=r["created_by"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

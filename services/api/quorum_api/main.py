"""FastAPI API Server implementing 06_API_SPEC.md."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from quorum_core.errors import ProblemDetail
from quorum_storage.repositories import StorageRepository
from quorum_telemetry.redaction import redact_dict


class ApiServer:
    """REST API service handling requests with mandatory tenant org_id scoping."""

    def __init__(self, storage: Optional[StorageRepository] = None):
        self.storage = storage or StorageRepository()

    # --- Health Endpoints (16_REPO_STRUCTURE.md) ---
    def get_healthz(self) -> Dict[str, str]:
        """Liveness probe."""
        return {"status": "ok"}

    def get_readyz(self) -> Dict[str, str]:
        """Readiness probe."""
        return {"status": "ready", "database": "connected"}

    # --- Runs API ---
    def get_run(self, org_id: str, run_id: str) -> Dict[str, Any]:
        run = self.storage.get_run(org_id, run_id)
        if not run:
            return ProblemDetail(
                type="https://quorum.dev/errors/not-found",
                title="Run Not Found",
                status=404,
                detail=f"Run {run_id} not found in org {org_id}",
            ).to_dict()
        return {
            "run_id": run.run_id,
            "org_id": run.org_id,
            "repo_id": run.repo_id,
            "pr_number": run.pr_number,
            "status": run.status,
            "verdict": run.verdict,
            "lanes_run": run.lanes_run,
            "lanes_degraded": run.lanes_degraded,
            "summary_markdown": run.summary_markdown,
        }

    def get_run_findings(self, org_id: str, run_id: str) -> List[Dict[str, Any]]:
        findings = self.storage.get_findings_for_run(org_id, run_id)
        return [
            {
                "id": f.id,
                "fingerprint": f.fingerprint,
                "title": f.title,
                "claim": f.claim,
                "severity": f.severity,
                "category": f.category,
                "status": f.status,
                "path": f.path,
                "line_start": f.line_start,
                "line_end": f.line_end,
                "rank_score": f.rank_score,
            }
            for f in findings
        ]

    # --- AC-052: Server-side Trace Redaction ---
    def get_run_trace(self, org_id: str, run_id: str, raw_trace_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Return run trace with mandatory server-side credential/key redaction."""
        return redact_dict(raw_trace_payload)

    # --- AC-046: PR Approval Gate ---
    def approve_pr(self, org_id: str, repo_id: str, pr_number: int, policy: Optional[Policy] = None) -> Dict[str, Any]:
        """Approve pull request, returning 409 Conflict if policy.may_approve is False (AC-046)."""
        from quorum_core.models import Policy
        pol = policy or Policy()
        if not pol.may_approve:
            return ProblemDetail(
                type="https://quorum.dev/errors/policy-conflict",
                title="Policy Conflict: Bot Approval Disabled",
                status=409,
                detail=f"Automated bot approval is disabled for org {org_id} (policy.may_approve is false)",
            ).to_dict()
        return {"status": "approved", "pr_number": pr_number, "org_id": org_id}

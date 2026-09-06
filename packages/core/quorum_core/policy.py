"""Policy evaluation engine.

Checks security boundaries, sensitive paths, blocking conditions,
and approval requirements.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List
from quorum_core.models import Finding, FindingStatus, Policy, RepoConfig, Severity


@dataclass
class PolicyEvaluationResult:
    is_blocked: bool
    requires_approval: bool
    blocking_reasons: List[str]
    sensitive_paths_touched: List[str]


def check_sensitive_paths(files: List[str], policy: Policy) -> List[str]:
    """Check which changed files match configured sensitive paths."""
    touched: List[str] = []
    for f in files:
        f_norm = f.strip().replace("\\", "/")
        for sp in policy.sensitive_paths:
            sp_norm = sp.strip().replace("\\", "/")
            if sp_norm in f_norm:
                touched.append(f)
                break
    return touched


def evaluate_policy(
    findings: List[Finding],
    policy: Policy,
    repo_config: RepoConfig,
    changed_files: List[str] | None = None,
) -> PolicyEvaluationResult:
    """Evaluate organizational review policy against findings and context."""
    reasons: List[str] = []
    is_blocked = False
    requires_approval = False

    # Check for blocking critical/high findings
    if policy.block_on_critical:
        critical_active = [
            f
            for f in findings
            if f.severity == Severity.CRITICAL
            and f.status in (FindingStatus.CONFIRMED, FindingStatus.PUBLISHED)
        ]
        if critical_active:
            is_blocked = True
            reasons.append(
                f"Policy blocks PR due to {len(critical_active)} unresolved critical findings"
            )

    # Check sensitive paths
    sensitive_touched = []
    if changed_files:
        sensitive_touched = check_sensitive_paths(changed_files, policy)
        if sensitive_touched and repo_config.mode == "skip":
            reasons.append("Skipping is prohibited for PRs touching sensitive security paths")

    # Check auto-fix approval requirement
    if policy.require_human_approval_for_fix:
        requires_approval = any(
            f.proposed_fix is not None
            for f in findings
            if f.status in (FindingStatus.CONFIRMED, FindingStatus.PUBLISHED)
        )

    return PolicyEvaluationResult(
        is_blocked=is_blocked,
        requires_approval=requires_approval,
        blocking_reasons=reasons,
        sensitive_paths_touched=sensitive_touched,
    )

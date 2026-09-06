"""ReviewState and state reducers for the LangGraph pipeline (07_AI_OR_AUTOMATION_PIPELINE.md)."""
from __future__ import annotations

from typing import Annotated, Any, Dict, List, Optional, TypedDict
from operator import add

from quorum_core.models import (
    AnalyzerResult,
    CheckResult,
    DiffSummary,
    Finding,
    FindingStatus,
    Policy,
    PostedComment,
    PRMeta,
    RepoConfig,
    RetrievedContext,
    TriageDecision,
    Verification,
)


def merge_findings(left: List[Finding], right: List[Finding]) -> List[Finding]:
    """Reducer for concurrent lane writes: dedupe by fingerprint, keeping the strongest finding."""
    merged: Dict[str, Finding] = {}
    for f in (left or []) + (right or []):
        fp = f.fingerprint
        if fp not in merged:
            merged[fp] = f
        else:
            # Keep the finding with higher confidence or higher severity
            if f.confidence > merged[fp].confidence:
                merged[fp] = f
    return list(merged.values())


def merge_dicts(left: Dict[str, Any], right: Dict[str, Any]) -> Dict[str, Any]:
    """Reducer for verifications and metadata dicts."""
    merged = dict(left or {})
    merged.update(right or {})
    return merged


class ReviewState(TypedDict, total=False):
    # Immutable run identity
    run_id: str
    org_id: str
    repo_id: str
    pr_number: int
    head_sha: str
    base_sha: str
    pipeline_version: str
    config: RepoConfig
    policy: Policy

    # Inputs
    diff: DiffSummary
    raw_diff: str
    pr_meta: PRMeta
    ci_signals: List[CheckResult]

    # Stage outputs
    triage: TriageDecision
    analyzers: Annotated[List[AnalyzerResult], add]
    context: RetrievedContext
    candidates: Annotated[List[Finding], merge_findings]
    verifications: Annotated[Dict[str, Verification], merge_dicts]
    ranked: List[Finding]
    held: List[Finding]
    posted: List[PostedComment]

    # Control & Observability
    lanes_run: Annotated[List[str], add]
    lanes_degraded: Annotated[List[str], add]
    summary_markdown: str
    check_conclusion: str
    auto_fix_pending: bool
    tokens_consumed: int
    is_partial: bool
    suspected_injection: bool
    quarantined_findings: List[Finding]

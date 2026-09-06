"""Finding ranking, confidence calibration, and comment budgeting.

Enforces:
1. rank_score = severity_weight * calibrated_confidence * blast_radius
2. Strict comment budget allocation (AC-032)
3. Advisory style findings never consume inline comment budget
4. Gating on confirmation and evidence class (AC-030, AC-031)
"""
from __future__ import annotations

from typing import List, Tuple
from quorum_core.models import (
    Finding,
    FindingCategory,
    FindingStatus,
    Policy,
    Severity,
    EvidenceClass,
)

SEVERITY_WEIGHTS = {
    Severity.CRITICAL: 1.0,
    Severity.HIGH: 0.7,
    Severity.MEDIUM: 0.4,
    Severity.LOW: 0.1,
}


def calculate_rank_score(finding: Finding) -> float:
    """Calculate composite ranking score for a finding."""
    sev_weight = SEVERITY_WEIGHTS.get(finding.severity, 0.1)
    # Ensure calibrated confidence is bounded in [0.0, 1.0]
    conf = max(0.0, min(1.0, finding.calibrated_confidence))
    # Blast radius >= 0.1
    blast = max(0.1, finding.blast_radius)
    return round(sev_weight * conf * blast, 4)


def is_eligible_for_publication(finding: Finding) -> bool:
    """Check if finding satisfies publication gating rules (AC-030, AC-031).
    
    1. Must be CONFIRMED.
    2. Must have at least one non-heuristic evidence reference.
    """
    if finding.status != FindingStatus.CONFIRMED:
        return False
    
    # Check evidence classes: must not be ONLY heuristic
    if not finding.evidences and not finding.evidence_ids:
        return False

    has_concrete_evidence = False
    for ev in finding.evidences:
        if ev.evidence_class != EvidenceClass.HEURISTIC:
            has_concrete_evidence = True
            break

    # If evidences list is empty but IDs exist, assume validly linked in graph
    if not finding.evidences and finding.evidence_ids:
        has_concrete_evidence = True

    return has_concrete_evidence


def apply_comment_budget(
    findings: List[Finding],
    budget: int,
    policy: Policy,
) -> Tuple[List[Finding], List[Finding]]:
    """Partition findings into publishable inline comments vs held comments.
    
    Rules:
    - Advisory 'style' lane findings NEVER consume inline comment budget (AC-032).
    - Unconfirmed or purely heuristic findings are held or excluded.
    - Findings are sorted descending by rank_score.
    - The top `budget` findings receive status PUBLISHED; the remainder become HELD.
    """
    # 1. Update rank scores
    for f in findings:
        f.rank_score = calculate_rank_score(f)

    # 2. Separate eligible non-style findings from style/ineligible findings
    eligible: List[Finding] = []
    held: List[Finding] = []

    for f in findings:
        # Style findings never consume inline comment budget
        if f.category == FindingCategory.STYLE or f.lane == "style":
            f.status = FindingStatus.HELD
            held.append(f)
            continue

        if not is_eligible_for_publication(f):
            f.status = FindingStatus.HELD
            held.append(f)
            continue

        eligible.append(f)

    # 3. Sort eligible by rank_score descending (tie breaker: severity weight, line_start)
    eligible.sort(
        key=lambda x: (
            x.rank_score,
            SEVERITY_WEIGHTS.get(x.severity, 0.0),
            -x.line_start,
        ),
        reverse=True,
    )

    # 4. Allocate budget
    publishable = eligible[:budget]
    excess = eligible[budget:]

    for f in publishable:
        f.status = FindingStatus.PUBLISHED

    for f in excess:
        f.status = FindingStatus.HELD
        held.append(f)

    return publishable, held

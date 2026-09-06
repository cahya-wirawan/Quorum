"""Suppression evaluation engine.

Filters out candidate findings that match user dismissals or historical rules (AC-034).
Requires explicit justification for suppressing critical or high security findings (AC-061).
"""
from __future__ import annotations

from typing import Dict, List, Tuple
from quorum_core.models import Finding, FindingStatus, Severity, Suppression


def evaluate_suppressions(
    findings: List[Finding],
    suppressions: List[Suppression],
) -> Tuple[List[Finding], List[Finding]]:
    """Match candidate findings against active suppressions by fingerprint.
    
    Returns:
        active_findings: Findings that are not suppressed
        suppressed_findings: Findings that matched a suppression rule
    """
    suppression_map: Dict[str, Suppression] = {s.fingerprint: s for s in suppressions}

    active: List[Finding] = []
    suppressed: List[Finding] = []

    for finding in findings:
        matched_rule = suppression_map.get(finding.fingerprint)
        if matched_rule:
            # AC-061: Critical security suppressions must have explicit valid reasons
            if finding.severity in (Severity.CRITICAL, Severity.HIGH):
                if not matched_rule.reason or matched_rule.reason not in ("intended", "wontfix", "wrong"):
                    # Missing valid reason: cannot suppress critical findings
                    active.append(finding)
                    continue

            finding.status = FindingStatus.SUPPRESSED
            suppressed.append(finding)
        else:
            active.append(finding)

    return active, suppressed

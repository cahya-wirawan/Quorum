"""SARIF 2.1.0 parser converting static analysis reports to Quorum Findings."""
from __future__ import annotations

import json
from typing import Any, Dict, List
from quorum_core.models import (
    Evidence,
    EvidenceClass,
    Finding,
    FindingCategory,
    FindingStatus,
    Severity,
    SourceType,
)
from quorum_core.fingerprint import compute_fingerprint


LEVEL_TO_SEVERITY = {
    "error": Severity.HIGH,
    "warning": Severity.MEDIUM,
    "note": Severity.LOW,
    "none": Severity.LOW,
}


def parse_sarif_json(sarif_data: Dict[str, Any], tool_name: str) -> List[Finding]:
    """Parse SARIF JSON payload into Quorum Finding entities."""
    findings: List[Finding] = []
    runs = sarif_data.get("runs", [])
    for run in runs:
        results = run.get("results", [])
        for r in results:
            rule_id = r.get("ruleId", "analyzer-rule")
            message = r.get("message", {}).get("text", "Static analyzer warning")
            level = r.get("level", "warning")
            severity = LEVEL_TO_SEVERITY.get(level, Severity.MEDIUM)

            locations = r.get("locations", [])
            path = "unknown"
            line_start = 1
            line_end = 1
            snippet = ""

            if locations:
                phys = locations[0].get("physicalLocation", {})
                artifact = phys.get("artifactLocation", {})
                path = artifact.get("uri", "unknown")
                region = phys.get("region", {})
                line_start = region.get("startLine", 1)
                line_end = region.get("endLine", line_start)
                snippet = region.get("snippet", {}).get("text", "")

            fp = compute_fingerprint(path, "analyzer", message, snippet)
            ev = Evidence(
                id=f"ev_sarif_{len(findings)+1}",
                evidence_class=EvidenceClass.ANALYZER,
                source_type=SourceType.STATIC_TOOL,
                path=path,
                line_start=line_start,
                line_end=line_end,
                content_snippet=snippet or message,
                tool_name=tool_name,
            )

            finding = Finding(
                id=f"sarif_{tool_name}_{len(findings)+1}",
                fingerprint=fp,
                title=f"[{tool_name}] {rule_id}",
                claim=message,
                severity=severity,
                category=FindingCategory.CORRECTNESS,
                path=path,
                line_start=line_start,
                line_end=line_end,
                evidence_ids=[ev.id],
                evidences=[ev],
                confidence=1.0,
                calibrated_confidence=1.0,
                status=FindingStatus.CONFIRMED,
                lane="analyzer",
            )
            findings.append(finding)

    return findings

"""Deterministic node: runs static analyzers and collects SARIF results (AC-020)."""
from __future__ import annotations

from typing import Any, Dict, List
from quorum_analysis.runner import AnalyzerRunner
from quorum_core.models import AnalyzerResult, Finding
from quorum_graph.state import ReviewState


async def deterministic_node(state: ReviewState, runner: AnalyzerRunner) -> Dict[str, Any]:
    """Execute static analyzers, converting findings into candidates."""
    target_path = "."
    results = await runner.run_all(target_path)

    analyzer_findings: List[Finding] = []
    for res in results:
        analyzer_findings.extend(res.findings)

    return {
        "analyzers": results,
        "candidates": analyzer_findings,
    }

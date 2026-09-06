"""Deduplication and merge node."""
from __future__ import annotations

from typing import Any, Dict
from quorum_graph.state import ReviewState, merge_findings


async def dedupe_merge_node(state: ReviewState) -> Dict[str, Any]:
    """Merge findings from all completed review lanes and analyzers."""
    candidates = state.get("candidates", [])
    deduped = merge_findings([], candidates)
    return {"candidates": deduped}

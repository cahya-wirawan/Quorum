"""Ranking and budgeting node (AC-032)."""
from __future__ import annotations

from typing import Any, Dict
from quorum_core.ranking import apply_comment_budget
from quorum_graph.state import ReviewState


async def rank_node(state: ReviewState) -> Dict[str, Any]:
    """Rank verified findings and allocate comment budget."""
    candidates = state.get("candidates", [])
    config = state["config"]
    policy = state["policy"]

    budget = config.comment_budget
    publishable, held = apply_comment_budget(candidates, budget, policy)

    # AC-091: Quarantine findings on suspected prompt injection
    if state.get("suspected_injection"):
        return {
            "ranked": [],
            "held": [],
            "quarantined_findings": publishable + held,
        }

    return {
        "ranked": publishable,
        "held": held,
        "quarantined_findings": [],
    }

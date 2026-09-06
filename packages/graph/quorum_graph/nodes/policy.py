"""Policy enforcement node."""
from __future__ import annotations

from typing import Any, Dict
from quorum_core.policy import evaluate_policy
from quorum_graph.state import ReviewState


async def policy_node(state: ReviewState) -> Dict[str, Any]:
    """Evaluate repository policies on ranked findings."""
    ranked = state.get("ranked", [])
    policy = state["policy"]
    config = state["config"]
    diff = state.get("diff")

    changed_files = [f.path for f in diff.files] if diff else []
    res = evaluate_policy(ranked, policy, config, changed_files)

    return {
        "check_conclusion": "failure" if res.is_blocked else "success",
        "auto_fix_pending": res.requires_approval and state.get("auto_fix_requested", False),
    }

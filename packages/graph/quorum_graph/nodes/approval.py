"""Approval node for human-in-the-loop auto-fix workflows (AC-045)."""
from __future__ import annotations

from typing import Any, Dict
from quorum_graph.state import ReviewState


async def approval_node(state: ReviewState) -> Dict[str, Any]:
    """Human approval check for auto-fix PR proposals."""
    auto_fix_pending = state.get("auto_fix_pending", False)
    return {"auto_fix_pending": auto_fix_pending}

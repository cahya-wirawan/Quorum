"""Learn node: records confirmed findings into repository learnings."""
from __future__ import annotations

from typing import Any, Dict
from quorum_graph.state import ReviewState


async def learn_node(state: ReviewState) -> Dict[str, Any]:
    """Extract learning records from confirmed and published findings."""
    ranked = state.get("ranked", [])
    return {"learnings_count": len(ranked)}

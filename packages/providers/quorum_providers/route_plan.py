"""Route plan recording and replay for deterministic re-runs (AC-085, AC-102)."""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from typing import Dict, Optional
from quorum_providers.adaptive import RouteSelection


@dataclass
class RoutePlan:
    run_key: str
    routes: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    @property
    def plan_hash(self) -> str:
        payload = json.dumps(self.routes, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def record(self, node_id: str, selection: RouteSelection) -> None:
        self.routes[node_id] = {
            "tier": int(selection.tier),
            "model": selection.model,
            "escalated": selection.escalated,
            "reason": selection.reason,
        }

    def get_selection(self, node_id: str) -> Optional[Dict[str, Any]]:
        return self.routes.get(node_id)


class RoutePlanStore:
    """Store caching route plans by run_key."""

    def __init__(self):
        self._plans: Dict[str, RoutePlan] = {}

    def get(self, run_key: str) -> Optional[RoutePlan]:
        return self._plans.get(run_key)

    def save(self, plan: RoutePlan) -> None:
        self._plans[plan.run_key] = plan


# Global singleton store for in-process runs
default_plan_store = RoutePlanStore()

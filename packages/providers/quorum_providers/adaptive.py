"""Adaptive routing decision engine.

Evaluates pre-call signals and post-call escalation triggers (AC-084).
Enforces:
- Ambiguous confidence window [0.35, 0.70] triggers escalation for high/critical findings
- Security floor (never below Tier 2)
- Hard ceiling on escalations: max 1 per call, max 3 per run
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from quorum_providers.routing import (
    ModelTier,
    NODE_BASE_TIERS,
    NODE_TIER_FLOORS,
    TIER_MODELS,
    RoutingPolicy,
)


@dataclass
class RouteSignals:
    node_class: str
    is_sensitive_path: bool = False
    confidence: Optional[float] = None
    severity: Optional[str] = None
    prior_escalations_in_run: int = 0


@dataclass
class RouteSelection:
    node_class: str
    tier: ModelTier
    model: str
    escalated: bool
    reason: str


def route(signals: RouteSignals, policy: RoutingPolicy) -> RouteSelection:
    """Pure deterministic routing function."""
    base_tier = NODE_BASE_TIERS.get(signals.node_class, ModelTier.TIER_2_STANDARD)
    floor_tier = NODE_TIER_FLOORS.get(signals.node_class, ModelTier.TIER_1_CHEAP)
    effective_tier = max(base_tier, floor_tier)

    escalated = False
    reason = "baseline_tier"

    # Check escalation triggers if policy permits and run budget is not exhausted
    if policy.enable_adaptive_escalation and signals.prior_escalations_in_run < policy.max_escalations_per_run:
        # Trigger 1: Sensitive security path
        if signals.is_sensitive_path and effective_tier < ModelTier.TIER_3_STRONG:
            effective_tier = ModelTier.TIER_3_STRONG
            escalated = True
            reason = "escalation_sensitive_path"

        # Trigger 2: Ambiguous confidence on critical/high severity
        elif signals.confidence is not None and signals.severity in ("critical", "high"):
            if 0.35 <= signals.confidence <= 0.70 and effective_tier < ModelTier.TIER_3_STRONG:
                effective_tier = ModelTier.TIER_3_STRONG
                escalated = True
                reason = "escalation_ambiguous_confidence"

    # Model resolution
    if signals.node_class in policy.custom_model_overrides:
        model = policy.custom_model_overrides[signals.node_class]
    else:
        model = TIER_MODELS[effective_tier]

    return RouteSelection(
        node_class=signals.node_class,
        tier=effective_tier,
        model=model,
        escalated=escalated,
        reason=reason,
    )

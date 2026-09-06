"""Quorum Providers Package.

Multi-provider model abstraction, adaptive routing, and token cost accounting.
"""
from quorum_providers.base import ModelProvider, ModelResult
from quorum_providers.cost import MODEL_PRICING, calculate_cost_cents, estimate_tokens
from quorum_providers.cache import ModelResponseCache, default_cache
from quorum_providers.routing import (
    ModelTier,
    NODE_BASE_TIERS,
    NODE_TIER_FLOORS,
    TIER_MODELS,
    RoutingPolicy,
)
from quorum_providers.adaptive import RouteSignals, RouteSelection, route
from quorum_providers.route_plan import RoutePlan, RoutePlanStore, default_plan_store
from quorum_providers.local import LocalStubProvider
from quorum_providers.anthropic import AnthropicProvider
from quorum_providers.openai_compatible import OpenAICompatibleProvider

__all__ = [
    "ModelProvider",
    "ModelResult",
    "MODEL_PRICING",
    "calculate_cost_cents",
    "estimate_tokens",
    "ModelResponseCache",
    "default_cache",
    "ModelTier",
    "NODE_BASE_TIERS",
    "NODE_TIER_FLOORS",
    "TIER_MODELS",
    "RoutingPolicy",
    "RouteSignals",
    "RouteSelection",
    "route",
    "RoutePlan",
    "RoutePlanStore",
    "default_plan_store",
    "LocalStubProvider",
    "AnthropicProvider",
    "OpenAICompatibleProvider",
]

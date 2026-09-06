"""Tier definitions and node-class routing configurations."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Dict, List, Optional


class ModelTier(IntEnum):
    TIER_1_CHEAP = 1
    TIER_2_STANDARD = 2
    TIER_3_STRONG = 3


# Default models per tier
TIER_MODELS: Dict[ModelTier, str] = {
    ModelTier.TIER_1_CHEAP: "deepseek-v4-flash",
    ModelTier.TIER_2_STANDARD: "gpt-5.6-terra",
    ModelTier.TIER_3_STRONG: "claude-opus-5",
}

# Node class baseline tiers and floor constraints
NODE_BASE_TIERS: Dict[str, ModelTier] = {
    "triage": ModelTier.TIER_1_CHEAP,
    "lane.correctness": ModelTier.TIER_2_STANDARD,
    "lane.security": ModelTier.TIER_2_STANDARD,
    "lane.api_contract": ModelTier.TIER_2_STANDARD,
    "lane.tests": ModelTier.TIER_2_STANDARD,
    "lane.style": ModelTier.TIER_1_CHEAP,
    "verify": ModelTier.TIER_3_STRONG,
    "summarise": ModelTier.TIER_1_CHEAP,
    "fix": ModelTier.TIER_2_STANDARD,
}

# Minimum tier constraints (floor)
NODE_TIER_FLOORS: Dict[str, ModelTier] = {
    "lane.security": ModelTier.TIER_2_STANDARD,  # Security must never run on tier 1
    "verify": ModelTier.TIER_3_STRONG,          # Verification requires frontier reasoning
}


@dataclass
class RoutingPolicy:
    provider: str = "auto"
    custom_model_overrides: Dict[str, str] = field(default_factory=dict)
    enable_adaptive_escalation: bool = True
    max_escalations_per_run: int = 3

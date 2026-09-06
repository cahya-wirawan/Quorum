"""Token pricing and cost accounting for multi-provider models."""
from __future__ import annotations

from typing import Dict, Tuple

# Rates: (input_cents_per_1k, output_cents_per_1k)
MODEL_PRICING: Dict[str, Tuple[float, float]] = {
    # Anthropic
    "claude-opus-5": (1.5, 7.5),
    "claude-sonnet-5": (0.3, 1.5),
    "claude-haiku-4.5": (0.025, 0.125),
    "deepseek-v4-flash": (0.014, 0.028),
    # OpenAI
    "gpt-5.6": (0.25, 1.0),
    "gpt-5.6-terra": (0.15, 0.6),
    "gpt-4o-mini": (0.015, 0.06),
    # Gemini
    "gemini-3.8-flash": (0.0075, 0.03),
    # Local / Ollama
    "qwen3:32b": (0.0, 0.0),
    "local-stub": (0.0, 0.0),
}


def estimate_tokens(text: str) -> int:
    """Rough token estimation (approx 4 chars per token)."""
    if not text:
        return 0
    return max(1, len(text) // 4)


def calculate_cost_cents(model: str, tokens_in: int, tokens_out: int) -> float:
    """Calculate call cost in US cents."""
    pricing = MODEL_PRICING.get(model, (0.1, 0.3))
    in_rate, out_rate = pricing
    cost = (tokens_in / 1000.0) * in_rate + (tokens_out / 1000.0) * out_rate
    return round(cost, 5)

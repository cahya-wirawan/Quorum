"""Model provider abstraction protocol and data classes."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Protocol, runtime_checkable


@dataclass
class ModelResult:
    content: str
    tokens_in: int = 0
    tokens_out: int = 0
    cached: bool = False
    provider: str = "mock"
    model: str = "mock-model"
    latency_ms: float = 0.0
    cost_cents: float = 0.0
    raw_response: Optional[Dict[str, Any]] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@runtime_checkable
class ModelProvider(Protocol):
    """Protocol for all LLM providers (Anthropic, OpenAI, Local)."""

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.0,
        timeout: int = 60,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> ModelResult:
        """Execute text generation against model."""
        ...

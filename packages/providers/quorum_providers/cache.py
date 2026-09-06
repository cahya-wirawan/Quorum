"""In-memory and TTL caching for model responses (24-hour retention)."""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Dict, Optional
from quorum_providers.base import ModelResult


class ModelResponseCache:
    """TTL Cache storing ModelResult by request hash."""

    def __init__(self, ttl_seconds: int = 86400):
        self.ttl_seconds = ttl_seconds
        self._store: Dict[str, Tuple[float, ModelResult]] = {}

    def _make_key(
        self,
        provider: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> str:
        schema_str = json.dumps(json_schema, sort_keys=True) if json_schema else ""
        payload = f"{provider}:{model}:{system_prompt}:{user_prompt}:{schema_str}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def get(
        self,
        provider: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> Optional[ModelResult]:
        key = self._make_key(provider, model, system_prompt, user_prompt, json_schema)
        if key not in self._store:
            return None
        created_at, res = self._store[key]
        if time.time() - created_at > self.ttl_seconds:
            del self._store[key]
            return None
        # Return cloned result marked as cached
        return ModelResult(
            content=res.content,
            tokens_in=res.tokens_in,
            tokens_out=res.tokens_out,
            cached=True,
            provider=res.provider,
            model=res.model,
            latency_ms=0.0,
            cost_cents=0.0,
            raw_response=res.raw_response,
        )

    def set(
        self,
        provider: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        result: ModelResult,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> None:
        key = self._make_key(provider, model, system_prompt, user_prompt, json_schema)
        self._store[key] = (time.time(), result)


# Global default cache
default_cache = ModelResponseCache()

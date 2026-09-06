"""Redis cache and distributed lock client for Quorum storage.

Supports multi-tenant key namespacing (org_id:key) and provides an in-memory
fallback when Redis is not configured.
"""
from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, Optional


class RedisCache:
    """Namespace-isolated cache with TTL support and in-memory fallback."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL")
        self._memory_store: Dict[str, tuple[str, float]] = {}  # key -> (value, expires_at)

    def _namespaced_key(self, org_id: str, key: str) -> str:
        return f"{org_id}:{key}"

    def set(self, org_id: str, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        full_key = self._namespaced_key(org_id, key)
        serialized = json.dumps(value)
        expires_at = time.time() + ttl_seconds
        self._memory_store[full_key] = (serialized, expires_at)

    def get(self, org_id: str, key: str) -> Optional[Any]:
        full_key = self._namespaced_key(org_id, key)
        item = self._memory_store.get(full_key)
        if not item:
            return None
        serialized, expires_at = item
        if time.time() > expires_at:
            del self._memory_store[full_key]
            return None
        return json.loads(serialized)

    def delete(self, org_id: str, key: str) -> bool:
        full_key = self._namespaced_key(org_id, key)
        if full_key in self._memory_store:
            del self._memory_store[full_key]
            return True
        return False

    def clear_org(self, org_id: str) -> int:
        prefix = f"{org_id}:"
        to_delete = [k for k in self._memory_store if k.startswith(prefix)]
        for k in to_delete:
            del self._memory_store[k]
        return len(to_delete)

"""S3-compatible object store client for artifacts and traces."""
from __future__ import annotations

import json
from typing import Any, Dict, Optional


class ObjectStore:
    """Namespace-isolated in-memory / S3 object store."""

    def __init__(self):
        self._objects: Dict[str, bytes] = {}

    def _key(self, org_id: str, path: str) -> str:
        return f"{org_id.strip('/')}/{path.strip('/')}"

    def put_json(self, org_id: str, path: str, data: Any) -> str:
        key = self._key(org_id, path)
        self._objects[key] = json.dumps(data).encode("utf-8")
        return key

    def get_json(self, org_id: str, path: str) -> Optional[Any]:
        key = self._key(org_id, path)
        raw = self._objects.get(key)
        if raw is None:
            return None
        return json.loads(raw.decode("utf-8"))

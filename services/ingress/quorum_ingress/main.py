"""Webhook Ingress service (AC-010).

Validates HMAC-SHA256 signatures, deduplicates deliveries, persists event records,
and returns HTTP 202 Accepted within <500ms without inline LLM or Git API calls.
"""
from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any, Dict, Optional
from quorum_telemetry.logger import get_logger

logger = get_logger("quorum.ingress")


def verify_github_signature(payload_bytes: bytes, signature_header: Optional[str], secret: str) -> bool:
    """Verify GitHub HMAC-SHA256 signature (sha256=...)."""
    if not signature_header or not secret:
        return False
    if not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    provided = signature_header.split("sha256=")[-1]
    return hmac.compare_digest(expected, provided)


class WebhookIngressHandler:
    """Ingress handler processing webhook events."""

    def __init__(self, secret: str = "webhook-secret-123"):
        self.secret = secret
        self.seen_deliveries: Dict[str, float] = {}
        self.enqueued_jobs: List[Dict[str, Any]] = []

    def handle_github_webhook(
        self,
        payload_bytes: bytes,
        signature_header: Optional[str],
        delivery_id: str,
        timestamp: Optional[float] = None,
    ) -> Tuple[int, Dict[str, Any]]:
        """Process incoming webhook with sub-500ms fast acknowledgement."""
        t0 = time.time()
        now = timestamp or t0

        # Signature validation
        if not verify_github_signature(payload_bytes, signature_header, self.secret):
            logger.warning("Invalid webhook signature", extra={"props": {"delivery_id": delivery_id}})
            return 401, {"error": "Invalid webhook signature"}

        # Replay / timestamp staleness check (>5 minutes)
        if abs(t0 - now) > 300:
            logger.warning("Stale webhook delivery", extra={"props": {"delivery_id": delivery_id}})
            return 401, {"error": "Webhook timestamp exceeds 5 minute tolerance"}

        # Deduplication
        if delivery_id in self.seen_deliveries:
            logger.info("Duplicate delivery acknowledged", extra={"props": {"delivery_id": delivery_id}})
            return 202, {"status": "duplicate_ignored", "delivery_id": delivery_id}

        self.seen_deliveries[delivery_id] = now

        # Enqueue job asynchronously (must not call model or Git API inline)
        job = {
            "delivery_id": delivery_id,
            "received_at": now,
            "payload_size": len(payload_bytes),
        }
        self.enqueued_jobs.append(job)

        duration_ms = round((time.time() - t0) * 1000, 2)
        logger.info(
            "Webhook acknowledged",
            extra={"props": {"delivery_id": delivery_id, "duration_ms": duration_ms}},
        )
        return 202, {"status": "accepted", "delivery_id": delivery_id, "duration_ms": duration_ms}

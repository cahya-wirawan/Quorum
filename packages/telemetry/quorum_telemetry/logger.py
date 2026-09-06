"""Structured JSON logger with automatic redaction."""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from quorum_telemetry.redaction import redact_dict, redact_text


class JsonRedactingFormatter(logging.Formatter):
    """Format log records as redacted JSON."""

    def format(self, record: logging.LogRecord) -> str:
        data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_text(record.getMessage()),
        }
        if hasattr(record, "props"):
            data.update(redact_dict(getattr(record, "props")))
        if record.exc_info:
            data["exception"] = self.formatException(record.exc_info)
        return json.dumps(data)


def get_logger(name: str) -> logging.Logger:
    """Obtain a structured logger for the specified subsystem."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonRedactingFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

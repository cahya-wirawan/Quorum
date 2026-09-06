"""Redaction utilities for telemetry and logging.

Strips API keys, tokens, and credentials from logs and traces before egress.
"""
from __future__ import annotations

import re
from typing import Any, Dict


REDACTION_PATTERNS = [
    (re.compile(r"(sk-[a-zA-Z0-9_-]{16,})"), "[REDACTED_API_KEY]"),
    (re.compile(r"(Bearer\s+[a-zA-Z0-9_\-\.]{16,})", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"(ghp_[a-zA-Z0-9]{30,})"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"(ghs_[a-zA-Z0-9]{30,})"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"(password[\"':\s=]+)([\"'][^\"']+[\"'])", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(api[_-]?key[\"':\s=]+)([\"'][^\"']+[\"'])", re.IGNORECASE), r"\1[REDACTED]"),
]


def redact_text(text: str) -> str:
    """Redact sensitive patterns from arbitrary string."""
    if not text:
        return ""
    result = text
    for pattern, replacement in REDACTION_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively redact strings in dictionary."""
    redacted: Dict[str, Any] = {}
    for k, v in data.items():
        if isinstance(v, str):
            redacted[k] = redact_text(v)
        elif isinstance(v, dict):
            redacted[k] = redact_dict(v)
        elif isinstance(v, list):
            redacted[k] = [
                redact_dict(item) if isinstance(item, dict)
                else redact_text(item) if isinstance(item, str)
                else item
                for item in v
            ]
        else:
            redacted[k] = v
    return redacted

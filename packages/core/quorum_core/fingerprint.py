"""Line-shift stable code fingerprinting for findings.

Normalizes code snippets, ignores volatile line numbers and whitespace shifts,
and generates deterministic hashes so findings track across edits.
"""
from __future__ import annotations

import hashlib
import re


def normalize_snippet(code: str) -> str:
    """Normalize code snippet by stripping comments, blank lines, and whitespace."""
    if not code:
        return ""
    lines = []
    for line in code.splitlines():
        # Strip common single-line comments in python, js, c, etc.
        stripped = re.sub(r"(#|//).*$", "", line).strip()
        if stripped:
            # Collapse multiple whitespace characters
            collapsed = re.sub(r"\s+", " ", stripped)
            lines.append(collapsed)
    return "\n".join(lines)


def normalize_claim(claim: str) -> str:
    """Normalize claim text by lowering case and collapsing whitespace."""
    if not claim:
        return ""
    cleaned = re.sub(r"[^\w\s]", "", claim.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def compute_fingerprint(
    path: str,
    category: str,
    claim: str,
    code_snippet: str = "",
) -> str:
    """Compute line-shift stable finding fingerprint.
    
    Hash composition:
    1. Normalized file path (basename or relative path)
    2. Finding category (e.g. security, correctness)
    3. Normalized core claim
    4. Normalized surrounding AST/code structure (if available)
    """
    clean_path = path.strip().replace("\\", "/")
    clean_cat = category.strip().lower()
    clean_claim = normalize_claim(claim)
    clean_code = normalize_snippet(code_snippet)

    payload = f"{clean_path}:{clean_cat}:{clean_claim}:{clean_code}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

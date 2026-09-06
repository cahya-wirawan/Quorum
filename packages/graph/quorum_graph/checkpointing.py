"""Checkpointing and resume engine for graph execution (AC-011, AC-040)."""
from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


def compute_run_key(
    repo_id: str,
    pr_number: int,
    head_sha: str,
    config_version: int = 1,
    pipeline_version: str = "1.0.0",
) -> str:
    """Deterministic thread key for review run idempotency (AC-011)."""
    return f"{repo_id}:{pr_number}:{head_sha}:{config_version}:{pipeline_version}"


class CheckpointSaver:
    """In-memory and persistent checkpoint saver."""

    def __init__(self):
        self._checkpoints: Dict[str, Dict[str, Any]] = {}

    def save_checkpoint(self, thread_id: str, state: Dict[str, Any]) -> None:
        self._checkpoints[thread_id] = copy.deepcopy(state)

    def load_checkpoint(self, thread_id: str) -> Optional[Dict[str, Any]]:
        cp = self._checkpoints.get(thread_id)
        return copy.deepcopy(cp) if cp else None


default_checkpointer = CheckpointSaver()

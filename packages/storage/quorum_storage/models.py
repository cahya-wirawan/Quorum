"""Storage ORM models matching 05_DATA_MODEL.md specification.

Mandatory tenant org_id scoping on every table.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from dataclasses import asdict, dataclass, field


@dataclass
class RunRecord:
    run_id: str
    org_id: str
    repo_id: str
    pr_number: int
    head_sha: str
    base_sha: str
    status: str  # queued, running, completed, failed, cancelled
    mode: str
    verdict: Optional[str] = None
    lanes_run: List[str] = field(default_factory=list)
    lanes_degraded: List[str] = field(default_factory=list)
    summary_markdown: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class FindingRecord:
    id: str
    org_id: str
    repo_id: str
    run_id: str
    fingerprint: str
    title: str
    claim: str
    severity: str
    category: str
    status: str
    path: str
    line_start: int
    line_end: int
    rank_score: float
    evidence_data: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class SuppressionRecord:
    id: str
    org_id: str
    repo_id: str
    fingerprint: str
    reason: str
    created_by: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class LearningRecord:
    id: str
    org_id: str
    repo_id: str
    rule_text: str
    created_from_finding_id: Optional[str] = None
    active: bool = True
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

"""Domain models for Quorum Autonomous Code Review Pipeline.

Zero framework imports, zero I/O. Pure Python standard library dataclasses.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class EvidenceClass(str, Enum):
    VERIFIED = "verified"
    STRONGLY_INFERRED = "strongly_inferred"
    PROPOSED = "proposed"
    HEURISTIC = "heuristic"
    ANALYZER = "analyzer"


class SourceType(str, Enum):
    STATIC_TOOL = "static_tool"
    TEST_REPRODUCTION = "test_reproduction"
    SYMBOL_REFERENCE = "symbol_reference"
    GIT_LOG = "git_log"
    HEURISTIC = "heuristic"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FindingCategory(str, Enum):
    CORRECTNESS = "correctness"
    SECURITY = "security"
    API_CONTRACT = "api_contract"
    TESTS = "tests"
    STYLE = "style"
    PERFORMANCE = "performance"


class FindingStatus(str, Enum):
    CANDIDATE = "candidate"
    CONFIRMED = "confirmed"
    REFUTED = "refuted"
    UNPROVABLE = "unprovable"
    HELD = "held"
    PUBLISHED = "published"
    SUPPRESSED = "suppressed"
    WITHDRAWN = "withdrawn"


class VerificationVerdict(str, Enum):
    CONFIRMED = "confirmed"
    REFUTED = "refuted"
    UNPROVABLE = "unprovable"


class TriageMode(str, Enum):
    SKIP = "skip"
    LIGHT = "light"
    FULL = "full"


@dataclass
class Evidence:
    id: str
    evidence_class: EvidenceClass
    source_type: SourceType
    path: str
    line_start: int
    line_end: int
    content_snippet: str
    tool_name: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Finding:
    id: str
    fingerprint: str
    title: str
    claim: str
    severity: Severity
    category: FindingCategory
    path: str
    line_start: int
    line_end: int
    side: str = "RIGHT"  # RIGHT for new code in diff, LEFT for deleted
    evidence_ids: List[str] = field(default_factory=list)
    evidences: List[Evidence] = field(default_factory=list)
    proposed_fix: Optional[str] = None
    confidence: float = 0.8
    calibrated_confidence: float = 0.8
    blast_radius: float = 1.0
    rank_score: float = 0.0
    status: FindingStatus = FindingStatus.CANDIDATE
    lane: str = "correctness"
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class Verification:
    finding_id: str
    verdict: VerificationVerdict
    refutation_hypothesis: str
    tools_called: List[str] = field(default_factory=list)
    evidence_ids: List[str] = field(default_factory=list)
    reasoning: str = ""
    verified_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class RepoConfig:
    comment_budget: int = 8
    mode: str = "full"  # full, observe, light, skip
    min_severity: Severity = Severity.LOW
    enabled_lanes: List[str] = field(
        default_factory=lambda: ["correctness", "security", "api_contract", "tests", "style"]
    )
    provider: str = "auto"
    persist_excerpts: bool = True
    config_version: int = 1
    source: str = "default"  # default, org, ui, file


@dataclass
class Policy:
    block_on_critical: bool = True
    require_human_approval_for_fix: bool = True
    may_approve: bool = False
    sensitive_paths: List[str] = field(
        default_factory=lambda: [".github/", "auth/", "security/", "secrets/", ".env"]
    )
    max_held_display: int = 20


@dataclass
class Suppression:
    id: str
    org_id: str
    repo_id: str
    fingerprint: str
    reason: str  # wrong, intended, wontfix
    scope: str = "repo"  # repo or org
    created_by: str = "system"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None


@dataclass
class Learning:
    id: str
    org_id: str
    repo_id: str
    rule_text: str
    created_from_finding_id: Optional[str] = None
    active: bool = True
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class UsageRecord:
    org_id: str
    run_id: str
    tokens_in: int
    tokens_out: int
    cost_cents: float
    provider: str
    model: str
    recorded_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class DiffHunk:
    old_start: int
    old_lines: int
    new_start: int
    new_lines: int
    lines: List[str] = field(default_factory=list)


@dataclass
class DiffFile:
    path: str
    old_path: Optional[str] = None
    status: str = "modified"  # added, modified, deleted
    hunks: List[DiffHunk] = field(default_factory=list)
    is_binary: bool = False


@dataclass
class DiffSummary:
    files: List[DiffFile] = field(default_factory=list)
    additions: int = 0
    deletions: int = 0
    total_files: int = 0
    risk_score: float = 0.0


@dataclass
class PRMeta:
    title: str
    body: str
    author: str
    author_is_bot: bool = False
    labels: List[str] = field(default_factory=list)
    draft: bool = False


@dataclass
class CheckResult:
    name: str
    status: str  # completed, in_progress, queued
    conclusion: Optional[str] = None  # success, failure, neutral, action_required
    output: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TriageDecision:
    mode: TriageMode
    reason: str
    attention_budget: int = 4000
    chunk_plan: List[str] = field(default_factory=list)


@dataclass
class AnalyzerResult:
    tool_name: str
    exit_code: int
    findings: List[Finding] = field(default_factory=list)
    raw_output: str = ""


@dataclass
class RetrievedChunk:
    path: str
    line_start: int
    line_end: int
    content: str
    score: float = 1.0
    source: str = "symbol_expansion"


@dataclass
class RetrievedContext:
    chunks: List[RetrievedChunk] = field(default_factory=list)
    symbols: List[str] = field(default_factory=list)
    token_count: int = 0


@dataclass
class PostedComment:
    comment_id: str
    finding_id: str
    path: str
    line: int
    side: str
    body: str
    posted_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ReviewSummary:
    run_id: str
    verdict: str  # pass, action_required, neutral
    status: str  # completed, observe
    posted_count: int
    held_count: int
    suppressed_count: int
    degraded_lanes: List[str] = field(default_factory=list)
    markdown_body: str = ""

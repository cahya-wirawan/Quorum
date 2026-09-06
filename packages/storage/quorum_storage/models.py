"""Storage ORM models matching 05_DATA_MODEL.md specification.

Mandatory tenant org_id scoping on every table.
Provides both SQLAlchemy Declarative ORM models and lightweight dataclass records.
"""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    SmallInteger,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid_str() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    """Base declarative class for Quorum database schema."""
    pass


# ---------------------------------------------------------------------------
# 1. Tenancy and Identity Models
# ---------------------------------------------------------------------------

class Organization(Base):
    __tablename__ = "organization"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="free")
    credit_cap: Mapped[int] = mapped_column(Integer, nullable=False, default=500)
    overage_policy: Mapped[str] = mapped_column(String(50), nullable=False, default="degrade")
    retention_days: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: {"traces": 30, "evidence": 90, "findings": 365, "audit": 730},
    )
    persist_excerpts: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deletion_scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    memberships = relationship("UserMembership", back_populates="organization", cascade="all, delete-orphan")
    installations = relationship("Installation", back_populates="organization", cascade="all, delete-orphan")
    repositories = relationship("Repository", back_populates="organization", cascade="all, delete-orphan")
    policies = relationship("Policy", back_populates="organization", cascade="all, delete-orphan")


class AppUser(Base):
    __tablename__ = "app_user"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    git_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    git_user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    memberships = relationship("UserMembership", back_populates="user", cascade="all, delete-orphan")


class UserMembership(Base):
    __tablename__ = "user_membership"

    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organization.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # owner, maintainer, member, auditor
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    organization = relationship("Organization", back_populates="memberships")
    user = relationship("AppUser", back_populates="memberships")


# ---------------------------------------------------------------------------
# 2. Git Host and Configuration Models
# ---------------------------------------------------------------------------

class Installation(Base):
    __tablename__ = "installation"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # github, gitlab
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    account_login: Mapped[str] = mapped_column(String(255), nullable=False)
    scopes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    installed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    organization = relationship("Organization", back_populates="installations")
    repositories = relationship("Repository", back_populates="installation", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("provider", "external_id", name="uq_installation_provider_external"),
    )


class Repository(Base):
    __tablename__ = "repository"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False, index=True)
    installation_id: Mapped[str] = mapped_column(String(36), ForeignKey("installation.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    default_branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    primary_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    size_kb: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="observe")  # disabled, observe, active
    retrieval_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="indexed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    organization = relationship("Organization", back_populates="repositories")
    installation = relationship("Installation", back_populates="repositories")
    runs = relationship("Run", back_populates="repository", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("provider", "external_id", name="uq_repo_provider_external"),
    )


class RepoConfigVersion(Base):
    __tablename__ = "repo_config_version"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # default, org, ui, file
    effective: Mapped[dict] = mapped_column(JSON, nullable=False)
    raw_file: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    validation_errors: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    __table_args__ = (
        UniqueConstraint("repo_id", "version", name="uq_repo_config_version"),
    )


class Policy(Base):
    __tablename__ = "policy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False, index=True)
    repo_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=True, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    comment_budget: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=8)
    min_post_severity: Mapped[str] = mapped_column(String(50), nullable=False, default="medium")
    blocking_severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    may_request_changes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    may_approve: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    autofix_mode: Mapped[str] = mapped_column(String(50), nullable=False, default="off")
    enabled_lanes: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["correctness", "security", "api_contract", "tests"],
    )
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("app_user.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    organization = relationship("Organization", back_populates="policies")

    __table_args__ = (
        UniqueConstraint("org_id", "repo_id", "version", name="uq_policy_org_repo_version"),
    )


class Rule(Base):
    __tablename__ = "rule"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False, index=True)
    repo_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    paths: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    severity: Mapped[str] = mapped_column(String(50), nullable=False, default="high")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("app_user.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    spec_cases = relationship("RuleSpecCase", back_populates="rule", cascade="all, delete-orphan")


class RuleSpecCase(Base):
    __tablename__ = "rule_spec_case"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    rule_id: Mapped[str] = mapped_column(String(36), ForeignKey("rule.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code_sample: Mapped[str] = mapped_column(Text, nullable=False)
    expected_flag: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    rule = relationship("Rule", back_populates="spec_cases")


class Learning(Base):
    __tablename__ = "learning"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_from_finding_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)


# ---------------------------------------------------------------------------
# 3. Work and Pipeline Models
# ---------------------------------------------------------------------------

class WebhookEvent(Base):
    __tablename__ = "webhook_event"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    delivery_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    signature_ok: Mapped[bool] = mapped_column(Boolean, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    dead_lettered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("idx_webhook_unprocessed", "received_at", postgresql_where=(processed_at.is_(None))),
    )


class PullRequest(Base):
    __tablename__ = "pull_request"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=False, index=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="open")
    base_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    head_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    head_sha: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    runs = relationship("Run", back_populates="pull_request", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("repo_id", "number", name="uq_pr_repo_number"),
    )


class Run(Base):
    __tablename__ = "run"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=False, index=True)
    pull_request_id: Mapped[str] = mapped_column(String(36), ForeignKey("pull_request.id", ondelete="CASCADE"), nullable=False, index=True)
    run_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    head_sha: Mapped[str] = mapped_column(String(64), nullable=False)
    base_sha: Mapped[str] = mapped_column(String(64), nullable=False)
    pipeline_version: Mapped[str] = mapped_column(String(50), nullable=False)
    config_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")
    verdict: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    lanes_run: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    lanes_degraded: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    summary_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cost_estimate_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tokens_consumed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reconciled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reconciliation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    repository = relationship("Repository", back_populates="runs")
    pull_request = relationship("PullRequest", back_populates="runs")
    nodes = relationship("RunNode", back_populates="run", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="run", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_run_org_created", "org_id", "created_at"),
        Index("idx_run_repo_pr", "repo_id", "pull_request_id", "created_at"),
        Index("ix_run_reconciled", "reconciled_at"),
    )


class RunNode(Base):
    __tablename__ = "run_node"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("run.id", ondelete="CASCADE"), nullable=False, index=True)
    node_name: Mapped[str] = mapped_column(String(100), nullable=False)
    tier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    prompt_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    escalated_from: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    escalation_trigger: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tokens_in: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    run = relationship("Run", back_populates="nodes")

    __table_args__ = (
        Index("idx_run_node_run_started", "run_id", "started_at"),
    )


class Finding(Base):
    __tablename__ = "finding"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=False, index=True)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("run.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    lane: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    claim: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    start_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    calibrated_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    rank_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="candidate")
    suggested_patch: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    run = relationship("Run", back_populates="findings")
    evidence_items = relationship("Evidence", back_populates="finding", cascade="all, delete-orphan")
    verification = relationship("Verification", back_populates="finding", uselist=False, cascade="all, delete-orphan")
    feedback_items = relationship("Feedback", back_populates="finding", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_finding_run_status", "run_id", "status"),
        Index("idx_finding_fingerprint", "repo_id", "fingerprint"),
        Index("idx_finding_rank", "run_id", "rank_score"),
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("finding.id", ondelete="CASCADE"), nullable=False, index=True)
    cls: Mapped[str] = mapped_column(String(50), nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    start_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    detail: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    finding = relationship("Finding", back_populates="evidence_items")


class Verification(Base):
    __tablename__ = "verification"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("finding.id", ondelete="CASCADE"), unique=True, nullable=False)
    verdict: Mapped[str] = mapped_column(String(50), nullable=False)
    refutation_attempt: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    finding = relationship("Finding", back_populates="verification")


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("finding.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("app_user.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    finding = relationship("Finding", back_populates="feedback_items")


class Suppression(Base):
    __tablename__ = "suppression"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    repo_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("app_user.id"), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    __table_args__ = (
        Index("idx_suppression_lookup", "org_id", "repo_id", "kind", "value"),
    )


class AuditEvent(Base):
    __tablename__ = "audit_event"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("app_user.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_id: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)

    __table_args__ = (
        Index("idx_audit_org_time", "org_id", "created_at"),
    )


class UsageRecord(Base):
    __tablename__ = "usage_record"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # YYYY-MM
    run_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("run.id", ondelete="CASCADE"), nullable=True)
    credits_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    __table_args__ = (
        Index("idx_usage_period", "org_id", "period"),
    )


class Subscription(Base):
    __tablename__ = "subscription"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="free")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    seats: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    credits_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=150)
    current_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class CodeChunk(Base):
    __tablename__ = "code_chunk"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    chunk_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    __table_args__ = (
        Index("idx_chunk_repo_path", "repo_id", "file_path"),
    )


class SymbolEdge(Base):
    __tablename__ = "symbol_edge"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid_str)
    org_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(String(36), ForeignKey("repository.id", ondelete="CASCADE"), nullable=False, index=True)
    from_symbol: Mapped[str] = mapped_column(String(255), nullable=False)
    to_symbol: Mapped[str] = mapped_column(String(255), nullable=False)
    edge_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    line: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    __table_args__ = (
        Index("idx_symbol_edge_from", "repo_id", "from_symbol"),
        Index("idx_symbol_edge_to", "repo_id", "to_symbol"),
    )


# ---------------------------------------------------------------------------
# Backwards-compatible Dataclass Records for legacy repository interface
# ---------------------------------------------------------------------------

@dataclass
class RunRecord:
    run_id: str
    org_id: str
    repo_id: str
    pr_number: int
    head_sha: str
    base_sha: str
    status: str
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

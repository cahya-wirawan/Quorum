"""Baseline initial schema (05_DATA_MODEL.md)

Revision ID: 0001
Revises: None
Create Date: 2026-09-06 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. organization
    op.create_table(
        "organization",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("plan", sa.String(50), nullable=False, server_default="free"),
        sa.Column("credit_cap", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("overage_policy", sa.String(50), nullable=False, server_default="degrade"),
        sa.Column("retention_days", sa.JSON(), nullable=False),
        sa.Column("persist_excerpts", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("deletion_scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_org_slug", "organization", ["slug"])

    # 2. app_user
    op.create_table(
        "app_user",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("git_provider", sa.String(50), nullable=True),
        sa.Column("git_user_id", sa.String(255), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_email", "app_user", ["email"])

    # 3. user_membership
    op.create_table(
        "user_membership",
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organization.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 4. installation
    op.create_table(
        "installation",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("account_login", sa.String(255), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("provider", "external_id", name="uq_installation_provider_external"),
    )
    op.create_index("ix_installation_org", "installation", ["org_id"])

    # 5. repository
    op.create_table(
        "repository",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("installation_id", sa.String(36), sa.ForeignKey("installation.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("default_branch", sa.String(100), nullable=False, server_default="main"),
        sa.Column("primary_language", sa.String(50), nullable=True),
        sa.Column("size_kb", sa.BigInteger(), nullable=True),
        sa.Column("state", sa.String(50), nullable=False, server_default="observe"),
        sa.Column("retrieval_mode", sa.String(50), nullable=False, server_default="indexed"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("provider", "external_id", name="uq_repo_provider_external"),
    )
    op.create_index("ix_repo_org", "repository", ["org_id"])
    op.create_index("ix_repo_full_name", "repository", ["full_name"])

    # 6. repo_config_version
    op.create_table(
        "repo_config_version",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("effective", sa.JSON(), nullable=False),
        sa.Column("raw_file", sa.Text(), nullable=True),
        sa.Column("valid", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("validation_errors", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("repo_id", "version", name="uq_repo_config_version"),
    )
    op.create_index("ix_repo_config_org", "repo_config_version", ["org_id"])
    op.create_index("ix_repo_config_repo", "repo_config_version", ["repo_id"])

    # 7. policy
    op.create_table(
        "policy",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("comment_budget", sa.SmallInteger(), nullable=False, server_default="8"),
        sa.Column("min_post_severity", sa.String(50), nullable=False, server_default="medium"),
        sa.Column("blocking_severity", sa.String(50), nullable=True),
        sa.Column("may_request_changes", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("may_approve", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("autofix_mode", sa.String(50), nullable=False, server_default="off"),
        sa.Column("enabled_lanes", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("app_user.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("org_id", "repo_id", "version", name="uq_policy_org_repo_version"),
    )
    op.create_index("ix_policy_org", "policy", ["org_id"])
    op.create_index("ix_policy_repo", "policy", ["repo_id"])

    # 8. rule
    op.create_table(
        "rule",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("paths", sa.JSON(), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False, server_default="high"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("app_user.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_rule_org", "rule", ["org_id"])
    op.create_index("ix_rule_repo", "rule", ["repo_id"])

    # 9. rule_spec_case
    op.create_table(
        "rule_spec_case",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("rule_id", sa.String(36), sa.ForeignKey("rule.id", ondelete="CASCADE"), nullable=False),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code_sample", sa.Text(), nullable=False),
        sa.Column("expected_flag", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_rule_spec_rule", "rule_spec_case", ["rule_id"])
    op.create_index("ix_rule_spec_org", "rule_spec_case", ["org_id"])

    # 10. learning
    op.create_table(
        "learning",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_text", sa.Text(), nullable=False),
        sa.Column("created_from_finding_id", sa.String(36), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_learning_org", "learning", ["org_id"])
    op.create_index("ix_learning_repo", "learning", ["repo_id"])

    # 11. webhook_event
    op.create_table(
        "webhook_event",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=True),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("delivery_id", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("signature_ok", sa.Boolean(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dead_lettered", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_webhook_delivery", "webhook_event", ["delivery_id"])
    op.create_index("ix_webhook_org", "webhook_event", ["org_id"])

    # 12. pull_request
    op.create_table(
        "pull_request",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("author", sa.String(255), nullable=False),
        sa.Column("state", sa.String(50), nullable=False, server_default="open"),
        sa.Column("base_ref", sa.String(255), nullable=False),
        sa.Column("head_ref", sa.String(255), nullable=False),
        sa.Column("head_sha", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("repo_id", "number", name="uq_pr_repo_number"),
    )
    op.create_index("ix_pr_org", "pull_request", ["org_id"])
    op.create_index("ix_pr_repo", "pull_request", ["repo_id"])

    # 13. run
    op.create_table(
        "run",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pull_request_id", sa.String(36), sa.ForeignKey("pull_request.id", ondelete="CASCADE"), nullable=False),
        sa.Column("run_key", sa.String(255), unique=True, nullable=False),
        sa.Column("head_sha", sa.String(64), nullable=False),
        sa.Column("base_sha", sa.String(64), nullable=False),
        sa.Column("pipeline_version", sa.String(50), nullable=False),
        sa.Column("config_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("state", sa.String(50), nullable=False, server_default="queued"),
        sa.Column("verdict", sa.String(50), nullable=True),
        sa.Column("lanes_run", sa.JSON(), nullable=False),
        sa.Column("lanes_degraded", sa.JSON(), nullable=False),
        sa.Column("summary_markdown", sa.Text(), nullable=True),
        sa.Column("cost_estimate_usd", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("tokens_consumed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_run_org_created", "run", ["org_id", "created_at"])
    op.create_index("idx_run_repo_pr", "run", ["repo_id", "pull_request_id", "created_at"])
    op.create_index("ix_run_state", "run", ["state"])

    # 14. run_node
    op.create_table(
        "run_node",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_name", sa.String(100), nullable=False),
        sa.Column("tier", sa.String(50), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("prompt_version", sa.String(50), nullable=True),
        sa.Column("escalated_from", sa.String(50), nullable=True),
        sa.Column("escalation_trigger", sa.String(100), nullable=True),
        sa.Column("cost_usd", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("tokens_in", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens_out", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_run_node_run_started", "run_node", ["run_id", "started_at"])
    op.create_index("ix_run_node_org", "run_node", ["org_id"])

    # 15. finding
    op.create_table(
        "finding",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=False),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("lane", sa.String(50), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("claim", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=True),
        sa.Column("start_line", sa.Integer(), nullable=True),
        sa.Column("end_line", sa.Integer(), nullable=True),
        sa.Column("raw_confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("calibrated_confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("rank_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="candidate"),
        sa.Column("suggested_patch", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_finding_run_status", "finding", ["run_id", "status"])
    op.create_index("idx_finding_fingerprint", "finding", ["repo_id", "fingerprint"])
    op.create_index("idx_finding_rank", "finding", ["run_id", "rank_score"])
    op.create_index("ix_finding_org", "finding", ["org_id"])

    # 16. evidence
    op.create_table(
        "evidence",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("finding_id", sa.String(36), sa.ForeignKey("finding.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cls", sa.String(50), nullable=False),
        sa.Column("source", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=True),
        sa.Column("start_line", sa.Integer(), nullable=True),
        sa.Column("end_line", sa.Integer(), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=True),
        sa.Column("detail", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_evidence_finding", "evidence", ["finding_id"])
    op.create_index("ix_evidence_org", "evidence", ["org_id"])

    # 17. verification
    op.create_table(
        "verification",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("finding_id", sa.String(36), sa.ForeignKey("finding.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("verdict", sa.String(50), nullable=False),
        sa.Column("refutation_attempt", sa.Text(), nullable=False),
        sa.Column("tool_calls_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_verification_finding", "verification", ["finding_id"])
    op.create_index("ix_verification_org", "verification", ["org_id"])

    # 18. feedback
    op.create_table(
        "feedback",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("finding_id", sa.String(36), sa.ForeignKey("finding.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("reason", sa.String(100), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("app_user.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_feedback_fingerprint", "feedback", ["org_id", "fingerprint", "created_at"])
    op.create_index("ix_feedback_finding", "feedback", ["finding_id"])

    # 19. suppression
    op.create_table(
        "suppression",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=True),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("value", sa.String(255), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("app_user.id"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_suppression_lookup", "suppression", ["org_id", "repo_id", "kind", "value"])

    # 20. audit_event
    op.create_table(
        "audit_event",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("actor_id", sa.String(36), sa.ForeignKey("app_user.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(100), nullable=False),
        sa.Column("target_id", sa.String(255), nullable=False),
        sa.Column("detail", sa.JSON(), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_audit_org_time", "audit_event", ["org_id", "created_at"])

    # 21. usage_record
    op.create_table(
        "usage_record",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("run_id", sa.String(36), sa.ForeignKey("run.id", ondelete="CASCADE"), nullable=True),
        sa.Column("credits_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_usage_period", "usage_record", ["org_id", "period"])

    # 22. subscription
    op.create_table(
        "subscription",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), unique=True, nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("plan", sa.String(50), nullable=False, server_default="free"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("seats", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("credits_quota", sa.Integer(), nullable=False, server_default="150"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_subscription_org", "subscription", ["org_id"])

    # 23. code_chunk
    op.create_table(
        "code_chunk",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("chunk_hash", sa.String(64), nullable=False),
        sa.Column("start_line", sa.Integer(), nullable=False),
        sa.Column("end_line", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_chunk_repo_path", "code_chunk", ["repo_id", "file_path"])
    op.create_index("ix_code_chunk_org", "code_chunk", ["org_id"])

    # 24. symbol_edge
    op.create_table(
        "symbol_edge",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repository.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_symbol", sa.String(255), nullable=False),
        sa.Column("to_symbol", sa.String(255), nullable=False),
        sa.Column("edge_type", sa.String(50), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("line", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_symbol_edge_from", "symbol_edge", ["repo_id", "from_symbol"])
    op.create_index("idx_symbol_edge_to", "symbol_edge", ["repo_id", "to_symbol"])
    op.create_index("ix_symbol_edge_org", "symbol_edge", ["org_id"])


def downgrade() -> None:
    # Drop tables in reverse order of foreign key dependencies
    op.drop_table("symbol_edge")
    op.drop_table("code_chunk")
    op.drop_table("subscription")
    op.drop_table("usage_record")
    op.drop_table("audit_event")
    op.drop_table("suppression")
    op.drop_table("feedback")
    op.drop_table("verification")
    op.drop_table("evidence")
    op.drop_table("finding")
    op.drop_table("run_node")
    op.drop_table("run")
    op.drop_table("pull_request")
    op.drop_table("webhook_event")
    op.drop_table("learning")
    op.drop_table("rule_spec_case")
    op.drop_table("rule")
    op.drop_table("policy")
    op.drop_table("repo_config_version")
    op.drop_table("repository")
    op.drop_table("installation")
    op.drop_table("user_membership")
    op.drop_table("app_user")
    op.drop_table("organization")

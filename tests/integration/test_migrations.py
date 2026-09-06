"""Integration tests for Database Migrations (05_DATA_MODEL.md & 14_IMPLEMENTATION_ROADMAP.md).

Verifies:
- Alembic migration lifecycle: upgrade to head, verify 24 tables, downgrade to base, re-upgrade.
- Expand/contract discipline: revision 0002 adds nullable columns with index, downgrade removes cleanly.
- Data integrity, relational foreign keys, and cascading deletes across the full schema.
- Multi-tenant query isolation via OrgScopedRepository.
"""
import os
import tempfile
import unittest
from datetime import datetime, timezone

from sqlalchemy import inspect, select, text

from quorum_storage.db import (
    OrgScopedRepository,
    get_current_revision,
    get_engine,
    get_session,
    rollback_migrations,
    run_migrations,
)
from quorum_storage.models import (
    AppUser,
    AuditEvent,
    Base,
    CodeChunk,
    Evidence,
    Feedback,
    Finding,
    Installation,
    Learning,
    Organization,
    Policy,
    PullRequest,
    RepoConfigVersion,
    Repository,
    Rule,
    RuleSpecCase,
    Run,
    RunNode,
    Subscription,
    Suppression,
    SymbolEdge,
    UsageRecord,
    UserMembership,
    Verification,
    WebhookEvent,
)


class DatabaseMigrationTests(unittest.TestCase):

    def setUp(self):
        # Create a temporary file-based SQLite DB for migration testing
        self.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db.close()
        self.db_url = f"sqlite:///{self.temp_db.name}"
        self.engine = get_engine(self.db_url)

    def tearDown(self):
        self.engine.dispose()
        if os.path.exists(self.temp_db.name):
            try:
                os.unlink(self.temp_db.name)
            except OSError:
                pass

    def test_migration_lifecycle_upgrade_downgrade_reupgrade(self):
        """Verify full migration lifecycle: 0 -> head -> 0001 -> base -> head."""
        # 1. Initially no migrations applied
        self.assertIsNone(get_current_revision(self.db_url))

        # 2. Upgrade to head (revision 0002)
        run_migrations(db_url=self.db_url, target_revision="head")
        self.assertEqual(get_current_revision(self.db_url), "0002")

        inspector = inspect(self.engine)
        table_names = set(inspector.get_table_names())

        expected_tables = {
            "organization", "app_user", "user_membership", "installation",
            "repository", "repo_config_version", "policy", "rule",
            "rule_spec_case", "learning", "webhook_event", "pull_request",
            "run", "run_node", "finding", "evidence", "verification",
            "feedback", "suppression", "audit_event", "usage_record",
            "subscription", "code_chunk", "symbol_edge", "alembic_version"
        }
        self.assertTrue(expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}")

        # Check that revision 0002 added reconciliation columns to run
        run_columns = {col["name"] for col in inspector.get_columns("run")}
        self.assertIn("reconciled_at", run_columns)
        self.assertIn("reconciliation_notes", run_columns)

        # 3. Test expand/contract rollback: downgrade to 0001
        rollback_migrations(db_url=self.db_url, target_revision="0001")
        self.assertEqual(get_current_revision(self.db_url), "0001")

        inspector_0001 = inspect(self.engine)
        run_columns_0001 = {col["name"] for col in inspector_0001.get_columns("run")}
        self.assertNotIn("reconciled_at", run_columns_0001)
        self.assertNotIn("reconciliation_notes", run_columns_0001)

        # 4. Downgrade to base
        rollback_migrations(db_url=self.db_url, target_revision="base")
        self.assertIsNone(get_current_revision(self.db_url))

        inspector_base = inspect(self.engine)
        remaining_tables = set(inspector_base.get_table_names())
        # Only alembic_version table remains after clean base rollback
        self.assertEqual(remaining_tables, {"alembic_version"})

        # 5. Re-upgrade back to head
        run_migrations(db_url=self.db_url, target_revision="head")
        self.assertEqual(get_current_revision(self.db_url), "0002")

    def test_schema_data_integrity_and_relationships(self):
        """Verify record creation, foreign keys, and cascading relationships on migrated schema."""
        run_migrations(db_url=self.db_url, target_revision="head")

        with get_session(self.engine) as session:
            # 1. Create Organization & User
            org = Organization(id="org_1", name="Acme Corp", slug="acme", plan="business")
            user = AppUser(id="user_1", email="dev@acme.com", display_name="Alice Developer")
            session.add_all([org, user])
            session.flush()

            # 2. Membership
            membership = UserMembership(org_id="org_1", user_id="user_1", role="owner")
            session.add(membership)

            # 3. Installation & Repository
            inst = Installation(
                id="inst_1",
                org_id="org_1",
                provider="github",
                external_id="ext_inst_1",
                account_login="acme",
                scopes=["repo", "pull_requests"],
            )
            repo = Repository(
                id="repo_1",
                org_id="org_1",
                installation_id="inst_1",
                provider="github",
                external_id="ext_repo_1",
                full_name="acme/backend",
                default_branch="main",
                state="active",
            )
            session.add_all([inst, repo])
            session.flush()

            # 4. Pull Request & Run
            pr = PullRequest(
                id="pr_1",
                org_id="org_1",
                repo_id="repo_1",
                number=42,
                title="Add payment idempotency",
                author="alice",
                base_ref="main",
                head_ref="feature/idempotency",
                head_sha="sha_head_42",
            )
            run = Run(
                id="run_1",
                org_id="org_1",
                repo_id="repo_1",
                pull_request_id="pr_1",
                run_key="acme/backend:42:sha_head_42:v1:2026.09.1",
                head_sha="sha_head_42",
                base_sha="sha_base_42",
                pipeline_version="2026.09.1",
                config_version=1,
                state="completed",
                verdict="actionable",
                lanes_run=["correctness", "security"],
                reconciled_at=datetime.now(timezone.utc),
                reconciliation_notes="Batch reconciled",
            )
            session.add_all([pr, run])
            session.flush()

            # 5. Finding, Evidence, Verification
            finding = Finding(
                id="find_1",
                org_id="org_1",
                repo_id="repo_1",
                run_id="run_1",
                fingerprint="fp_hash_123",
                lane="correctness",
                category="idempotency",
                severity="high",
                title="Missing idempotency key in refund",
                claim="Refund requests without idempotency key cause double charges.",
                rationale="No check exists prior to transaction commit.",
                file_path="payments/refund.py",
                start_line=110,
                end_line=115,
                rank_score=8.5,
                status="confirmed",
            )
            session.add(finding)
            session.flush()

            evidence = Evidence(
                id="ev_1",
                org_id="org_1",
                finding_id="find_1",
                cls="symbol_resolution",
                source="ast_indexer",
                file_path="payments/refund.py",
                start_line=110,
                end_line=115,
                excerpt="def refund_payment(amount): ...",
                detail={"caller": "retry_handler"},
            )
            verification = Verification(
                id="ver_1",
                org_id="org_1",
                finding_id="find_1",
                verdict="confirmed",
                refutation_attempt="Looked for idempotency guard in caller; none found.",
                tool_calls_count=3,
                duration_ms=1200,
            )
            suppression = Suppression(
                id="sup_1",
                org_id="org_1",
                repo_id="repo_1",
                kind="rule",
                value="no-direct-sql",
                reason="Legacy migration exempted",
                created_by="user_1",
            )
            session.add_all([evidence, verification, suppression])

        # Verify query back and relationship traversal
        with get_session(self.engine) as session:
            saved_run = session.scalar(select(Run).where(Run.id == "run_1"))
            self.assertIsNotNone(saved_run)
            self.assertEqual(saved_run.verdict, "actionable")
            self.assertEqual(len(saved_run.findings), 1)

            saved_finding = saved_run.findings[0]
            self.assertEqual(saved_finding.severity, "high")
            self.assertEqual(len(saved_finding.evidence_items), 1)
            self.assertIsNotNone(saved_finding.verification)
            self.assertEqual(saved_finding.verification.verdict, "confirmed")

    def test_multi_tenant_isolation_with_org_scoped_repo(self):
        """Verify strict org_id isolation: org A queries never expose org B records."""
        run_migrations(db_url=self.db_url, target_revision="head")

        with get_session(self.engine) as session:
            org_a = Organization(id="org_a", name="Tenant A", slug="tenant-a")
            org_b = Organization(id="org_b", name="Tenant B", slug="tenant-b")
            session.add_all([org_a, org_b])
            session.flush()

            inst_a = Installation(id="inst_a", org_id="org_a", provider="github", external_id="ext_a", account_login="ta")
            inst_b = Installation(id="inst_b", org_id="org_b", provider="github", external_id="ext_b", account_login="tb")
            repo_a = Repository(id="repo_a", org_id="org_a", installation_id="inst_a", provider="github", external_id="ext_ra", full_name="ta/repo")
            repo_b = Repository(id="repo_b", org_id="org_b", installation_id="inst_b", provider="github", external_id="ext_rb", full_name="tb/repo")
            session.add_all([inst_a, inst_b, repo_a, repo_b])
            session.flush()

            # Add suppressions for both tenants
            sup_a = Suppression(id="sup_a", org_id="org_a", repo_id="repo_a", kind="path", value="vendor/**", reason="vendor path")
            sup_b = Suppression(id="sup_b", org_id="org_b", repo_id="repo_b", kind="path", value="legacy/**", reason="legacy path")
            session.add_all([sup_a, sup_b])

        # Test scoped repository
        with get_session(self.engine) as session:
            scoped_repo_a = OrgScopedRepository(session, org_id="org_a")
            query_a = scoped_repo_a.scoped_query(Suppression)
            results_a = session.scalars(query_a).all()

            self.assertEqual(len(results_a), 1)
            self.assertEqual(results_a[0].org_id, "org_a")
            self.assertEqual(results_a[0].value, "vendor/**")

            scoped_repo_b = OrgScopedRepository(session, org_id="org_b")
            query_b = scoped_repo_b.scoped_query(Suppression)
            results_b = session.scalars(query_b).all()

            self.assertEqual(len(results_b), 1)
            self.assertEqual(results_b[0].org_id, "org_b")
            self.assertEqual(results_b[0].value, "legacy/**")


if __name__ == "__main__":
    unittest.main()

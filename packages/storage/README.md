# `quorum_storage`

Persistence, migrations, caching, and object storage for Quorum.

> **Architecture Boundary (Rule 3 in `16_REPO_STRUCTURE.md`):** `quorum_storage` is the **only** layer in the codebase permitted to import database drivers, SQLAlchemy, or ORM components. All other packages and services interact with data through storage repositories or domain models.

---

## Package Overview

- **`models.py`**: SQLAlchemy 2.0 Declarative ORM models representing the complete schema specified in [`05_DATA_MODEL.md`](../../quorum_build_package/05_DATA_MODEL.md). All tenant entities enforce mandatory `org_id` scoping. Also provides backward-compatible dataclass aliases.
- **`db.py`**: Database engine and session management (`get_engine`, `get_session`, `init_db`), programmatic Alembic migration execution, and `OrgScopedRepository` base class guaranteeing tenant isolation.
- **`cache.py`**: Redis client providing tenant namespacing (`org_id:key`), TTL expiration, and in-memory fallback for local development and offline environments.
- **`objects.py`**: S3/MinIO-compatible object storage client for trace payloads, artifacts, and exports.
- **`migrations/`**: Alembic migration environment and versioned migration scripts.

---

## Database Schema (24 Core Tables)

1. **Tenancy & Identity**: `organization`, `app_user`, `user_membership`
2. **Git Host & Configurations**: `installation`, `repository`, `repo_config_version`, `policy`, `rule`, `rule_spec_case`, `learning`
3. **Pipeline Work & Reviews**: `webhook_event`, `pull_request`, `run`, `run_node`, `finding`, `evidence`, `verification`, `feedback`, `suppression`, `audit_event`, `usage_record`
4. **Billing & Subscriptions**: `subscription`
5. **Code Graph & Retrieval Index**: `code_chunk`, `symbol_edge`

---

## Database Migrations (Alembic)

Migrations follow the **expand/contract discipline** specified in `05_DATA_MODEL.md §7`:
1. **Expand**: Add nullable columns, new tables, or concurrent indexes without breaking active writes.
2. **Backfill**: Backfill data asynchronously in batches.
3. **Contract**: Switch application reads and remove deprecated columns in a subsequent release.

### Migration Commands

```bash
# Apply migrations to head
make migrate
# or:
python3 -m quorum_storage.db upgrade head

# Roll back the most recent migration
make migrate-rollback
# or:
python3 -m quorum_storage.db downgrade -1

# Run the complete migration test suite (lifecycle upgrade/downgrade/re-upgrade & isolation)
make test-migrations
```

### Configuration

Alembic configuration is driven by `alembic.ini` at the root of the repository, targeting `packages/storage/quorum_storage/migrations`. Database connection strings can be overridden using:
- `QUORUM_DATABASE_URL`
- `DATABASE_URL`
Defaults to `sqlite:///quorum_dev.db` for local execution or `sqlite:///:memory:` in transient tests.

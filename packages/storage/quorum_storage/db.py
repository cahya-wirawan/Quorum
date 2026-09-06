"""Database engine, session management, and migration execution utilities.

Enforces multi-tenant org_id scoping across queries and provides programmatic
Alembic migration runners for CI and production operations.
"""
from __future__ import annotations

import os
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator, Optional

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from quorum_storage.models import Base


# Default to local SQLite dev file, or environment database URL
DEFAULT_DB_URL = os.getenv("QUORUM_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///quorum_dev.db"


def get_engine(db_url: Optional[str] = None) -> Engine:
    """Create a SQLAlchemy Engine with sensible connection defaults."""
    url = db_url or DEFAULT_DB_URL
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(url, connect_args=connect_args, future=True)


def get_session_factory(engine: Optional[Engine] = None) -> sessionmaker[Session]:
    """Create a thread-safe Session factory bound to the given engine."""
    eng = engine or get_engine()
    return sessionmaker(bind=eng, expire_on_commit=False, future=True)


@contextmanager
def get_session(engine: Optional[Engine] = None) -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations."""
    factory = get_session_factory(engine)
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db(engine: Optional[Engine] = None) -> None:
    """Create all tables directly via SQLAlchemy metadata (for test / ephemeral use)."""
    eng = engine or get_engine()
    Base.metadata.create_all(bind=eng)


# ---------------------------------------------------------------------------
# Alembic Migration Utilities
# ---------------------------------------------------------------------------

def get_alembic_config(db_url: Optional[str] = None) -> Config:
    """Load and configure Alembic configuration object."""
    storage_dir = Path(__file__).parent
    # Check for alembic.ini in root or storage package
    root_ini = storage_dir.parent.parent.parent / "alembic.ini"
    pkg_ini = storage_dir / "alembic.ini"

    ini_path = root_ini if root_ini.exists() else pkg_ini
    cfg = Config(str(ini_path))

    # Point script_location directly to migrations package dir
    migrations_dir = storage_dir / "migrations"
    cfg.set_main_option("script_location", str(migrations_dir))

    url = db_url or DEFAULT_DB_URL
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def run_migrations(db_url: Optional[str] = None, target_revision: str = "head") -> None:
    """Apply database migrations up to target_revision (defaults to 'head')."""
    cfg = get_alembic_config(db_url)
    command.upgrade(cfg, target_revision)


def rollback_migrations(db_url: Optional[str] = None, target_revision: str = "-1") -> None:
    """Roll back database migrations down to target_revision (defaults to -1)."""
    cfg = get_alembic_config(db_url)
    command.downgrade(cfg, target_revision)


def get_current_revision(db_url: Optional[str] = None) -> Optional[str]:
    """Return the current database revision ID, or None if at base."""
    eng = get_engine(db_url)
    with eng.connect() as conn:
        from sqlalchemy import inspect, text
        inspector = inspect(conn)
        if not inspector.has_table("alembic_version"):
            return None
        result = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        return str(result) if result else None


# ---------------------------------------------------------------------------
# Tenant-Scoped Repository Base
# ---------------------------------------------------------------------------

class OrgScopedRepository:
    """Base repository that strictly guarantees org_id isolation for queries."""

    def __init__(self, session: Session, org_id: str):
        if not org_id:
            raise ValueError("org_id must not be empty")
        self.session = session
        self.org_id = org_id

    def scoped_query(self, model_cls: Any) -> Any:
        """Create a select query pre-filtered on org_id."""
        if not hasattr(model_cls, "org_id"):
            raise AttributeError(f"Model {model_cls.__name__} does not have an org_id column")
        return select(model_cls).where(model_cls.org_id == self.org_id)


def main() -> None:
    """CLI runner for database migrations."""
    action = sys.argv[1] if len(sys.argv) > 1 else "upgrade"
    db_url = os.getenv("QUORUM_DATABASE_URL")

    if action == "upgrade":
        rev = sys.argv[2] if len(sys.argv) > 2 else "head"
        print(f"Running database upgrade to {rev}...")
        run_migrations(db_url=db_url, target_revision=rev)
        print(f"Database upgraded successfully. Current revision: {get_current_revision(db_url)}")
    elif action == "downgrade":
        rev = sys.argv[2] if len(sys.argv) > 2 else "-1"
        print(f"Running database downgrade to {rev}...")
        rollback_migrations(db_url=db_url, target_revision=rev)
        print(f"Database downgraded successfully. Current revision: {get_current_revision(db_url)}")
    elif action == "status":
        print(f"Current revision: {get_current_revision(db_url)}")
    else:
        print(f"Unknown command '{action}'. Use upgrade, downgrade, or status.")
        sys.exit(1)


if __name__ == "__main__":
    main()

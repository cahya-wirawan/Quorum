"""Expand/contract discipline: add run reconciliation columns (05_DATA_MODEL.md)

Demonstrates safe expand/contract discipline:
- Step 1: Add nullable columns without locking existing writes.
- Step 2: Create index for reconciliation lookups.
- Step 3: Clean reversible downgrade.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-06 16:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for compatibility with SQLite and PostgreSQL
    with op.batch_alter_table("run") as batch_op:
        batch_op.add_column(
            sa.Column("reconciled_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column("reconciliation_notes", sa.Text(), nullable=True)
        )
        batch_op.create_index("ix_run_reconciled", ["reconciled_at"])


def downgrade() -> None:
    with op.batch_alter_table("run") as batch_op:
        batch_op.drop_index("ix_run_reconciled")
        batch_op.drop_column("reconciliation_notes")
        batch_op.drop_column("reconciled_at")

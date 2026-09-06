"""Git-host abstraction protocol and types."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
from quorum_core.models import CheckResult, PRMeta


@runtime_checkable
class PullRequestHost(Protocol):
    """Protocol for VCS platforms (GitHub, GitLab, Fake)."""

    async def get_pr_metadata(self, repo_id: str, pr_number: int) -> PRMeta:
        ...

    async def get_diff(self, repo_id: str, pr_number: int) -> str:
        ...

    async def post_review(
        self,
        repo_id: str,
        pr_number: int,
        commit_sha: str,
        body: str,
        event: str = "COMMENT",
        comments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Post review comments batched in a single API call (AC-042)."""
        ...

    async def create_or_update_check_run(
        self,
        repo_id: str,
        name: str,
        head_sha: str,
        status: str,
        conclusion: Optional[str] = None,
        summary: str = "",
    ) -> CheckResult:
        ...

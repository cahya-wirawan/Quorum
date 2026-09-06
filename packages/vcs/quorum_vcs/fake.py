"""Deterministic fake VCS host for unit and integration testing."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from quorum_core.models import CheckResult, PRMeta
from quorum_vcs.base import PullRequestHost


class FakeHost(PullRequestHost):
    """Deterministic in-memory Git host."""

    def __init__(
        self,
        mock_diff: str = "",
        mock_pr_meta: Optional[PRMeta] = None,
    ):
        self.mock_diff = mock_diff
        self.mock_pr_meta = mock_pr_meta or PRMeta(
            title="Update user authentication",
            body="Adds bcrypt password validation and token refreshes.",
            author="cahya",
            author_is_bot=False,
            labels=["backend"],
        )
        self.posted_reviews: List[Dict[str, Any]] = []
        self.check_runs: List[CheckResult] = []

    async def get_pr_metadata(self, repo_id: str, pr_number: int) -> PRMeta:
        return self.mock_pr_meta

    async def get_diff(self, repo_id: str, pr_number: int) -> str:
        return self.mock_diff

    async def post_review(
        self,
        repo_id: str,
        pr_number: int,
        commit_sha: str,
        body: str,
        event: str = "COMMENT",
        comments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        review = {
            "id": f"review_{len(self.posted_reviews) + 1}",
            "repo_id": repo_id,
            "pr_number": pr_number,
            "commit_sha": commit_sha,
            "body": body,
            "event": event,
            "comments": comments or [],
        }
        self.posted_reviews.append(review)
        return review

    async def create_or_update_check_run(
        self,
        repo_id: str,
        name: str,
        head_sha: str,
        status: str,
        conclusion: Optional[str] = None,
        summary: str = "",
    ) -> CheckResult:
        cr = CheckResult(
            name=name,
            status=status,
            conclusion=conclusion,
            output={"summary": summary},
        )
        self.check_runs.append(cr)
        return cr

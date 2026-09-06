"""GitHub App REST API client implementation (AC-042)."""
from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional
from quorum_core.models import CheckResult, PRMeta
from quorum_vcs.base import PullRequestHost


class GitHubHost(PullRequestHost):
    """Production GitHub client using GitHub App installation tokens."""

    def __init__(
        self,
        token: Optional[str] = None,
        base_url: str = "https://api.github.com",
    ):
        self.token = token or os.getenv("GITHUB_TOKEN", "")
        self.base_url = base_url.rstrip("/")

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Quorum-Reviewer/1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        data = json.dumps(payload).encode("utf-8") if payload else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            raise RuntimeError(f"GitHub API Error {e.code}: {body[:500]}") from e

    async def get_pr_metadata(self, repo_id: str, pr_number: int) -> PRMeta:
        res = await asyncio.to_thread(self._request, "GET", f"repos/{repo_id}/pulls/{pr_number}")
        user = res.get("user", {})
        return PRMeta(
            title=res.get("title", ""),
            body=res.get("body", "") or "",
            author=user.get("login", "unknown"),
            author_is_bot=user.get("type") == "Bot",
            labels=[lbl.get("name", "") for lbl in res.get("labels", [])],
            draft=res.get("draft", False),
        )

    async def get_diff(self, repo_id: str, pr_number: int) -> str:
        # In real GitHub App, accept header application/vnd.github.v3.diff returns text
        res = await asyncio.to_thread(self._request, "GET", f"repos/{repo_id}/pulls/{pr_number}/files")
        # Generate diff representation
        hunks = []
        for file in res:
            patch = file.get("patch", "")
            filename = file.get("filename", "")
            hunks.append(f"diff --git a/{filename} b/{filename}\n{patch}")
        return "\n".join(hunks)

    async def post_review(
        self,
        repo_id: str,
        pr_number: int,
        commit_sha: str,
        body: str,
        event: str = "COMMENT",
        comments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Post a single review that batches all inline comments (AC-042)."""
        payload: Dict[str, Any] = {
            "commit_id": commit_sha,
            "body": body,
            "event": event,
            "comments": comments or [],
        }
        return await asyncio.to_thread(
            self._request, "POST", f"repos/{repo_id}/pulls/{pr_number}/reviews", payload
        )

    async def create_or_update_check_run(
        self,
        repo_id: str,
        name: str,
        head_sha: str,
        status: str,
        conclusion: Optional[str] = None,
        summary: str = "",
    ) -> CheckResult:
        payload: Dict[str, Any] = {
            "name": name,
            "head_sha": head_sha,
            "status": status,
        }
        if conclusion:
            payload["conclusion"] = conclusion
        if summary:
            payload["output"] = {"title": name, "summary": summary}

        res = await asyncio.to_thread(self._request, "POST", f"repos/{repo_id}/check-runs", payload)
        return CheckResult(
            name=name,
            status=status,
            conclusion=conclusion,
            output=res.get("output", {}),
        )

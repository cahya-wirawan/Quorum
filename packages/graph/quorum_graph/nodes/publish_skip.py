"""Publish skip node: handles skipped review runs (AC-014)."""
from __future__ import annotations

from typing import Any, Dict
from quorum_graph.state import ReviewState
from quorum_vcs.base import PullRequestHost


async def publish_skip_node(state: ReviewState, vcs: PullRequestHost) -> Dict[str, Any]:
    """Publish neutral check run and summary explaining why review was skipped."""
    triage = state["triage"]
    repo_id = state["repo_id"]
    pr_number = state["pr_number"]
    head_sha = state["head_sha"]
    config = state["config"]

    summary_md = f"### Quorum Review: Skipped\n\n**Reason:** {triage.reason}\n\n*No model review lanes were executed.*"

    if config.mode != "observe":
        await vcs.post_review(
            repo_id=repo_id,
            pr_number=pr_number,
            commit_sha=head_sha,
            body=summary_md,
            event="COMMENT",
            comments=[],
        )

    await vcs.create_or_update_check_run(
        repo_id=repo_id,
        name="quorum/review",
        head_sha=head_sha,
        status="completed",
        conclusion="neutral",
        summary=summary_md,
    )

    return {
        "summary_markdown": summary_md,
        "check_conclusion": "neutral",
        "posted": [],
    }

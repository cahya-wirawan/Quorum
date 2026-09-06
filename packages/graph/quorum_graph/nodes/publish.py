"""Publish node: batches inline comments and summary into a single review (AC-042)."""
from __future__ import annotations

import json
from typing import Any, Dict, List
from quorum_core.models import PostedComment
from quorum_graph.state import ReviewState
from quorum_prompts.registry import load_prompt, render_prompt
from quorum_providers.base import ModelProvider
from quorum_vcs.base import PullRequestHost


async def publish_node(
    state: ReviewState,
    vcs: PullRequestHost,
    provider: ModelProvider,
) -> Dict[str, Any]:
    """Post single batched review to Git host and update check run."""
    ranked = state.get("ranked", [])
    held = state.get("held", [])
    lanes_run = state.get("lanes_run", [])
    lanes_degraded = state.get("lanes_degraded", [])
    check_conclusion = state.get("check_conclusion", "success")
    repo_id = state["repo_id"]
    pr_number = state["pr_number"]
    head_sha = state["head_sha"]
    config = state["config"]

    # 1. Format inline review comments
    comments: List[Dict[str, Any]] = []
    posted_records: List[PostedComment] = []

    for i, f in enumerate(ranked):
        body = f"**[{f.severity.value.upper()}] {f.title}**\n\n{f.claim}"
        if f.proposed_fix:
            body += f"\n\n**Suggested fix:**\n```suggestion\n{f.proposed_fix}\n```"

        comment_dict = {
            "path": f.path,
            "line": f.line_end,
            "side": f.side,
            "body": body,
        }
        comments.append(comment_dict)
        posted_records.append(
            PostedComment(
                comment_id=f"c_{i+1}",
                finding_id=f.id,
                path=f.path,
                line=f.line_end,
                side=f.side,
                body=body,
            )
        )

    # 2. Build summary markdown
    prompt_asset = load_prompt("summarise", "v2")
    rendered = render_prompt(
        "summarise",
        "v2",
        {
            "lanes_run": ", ".join(lanes_run) or "none",
            "lanes_degraded": ", ".join(lanes_degraded) or "none",
            "candidate_count": len(state.get("candidates", [])),
            "confirmed_count": len(ranked),
            "published_count": len(ranked),
            "held_count": len(held),
            "suppressed_count": 0,
        },
    )

    res = await provider.generate(
        system_prompt="You are the Quorum summary generator.",
        user_prompt=rendered,
        model="deepseek-v4-flash",
        temperature=0.0,
        json_schema=prompt_asset.schema,
    )

    try:
        data = json.loads(res.content)
        summary_md = data.get("markdown_body", res.content)
    except Exception:
        summary_md = f"### Quorum Review Summary\n\n- Posted findings: {len(ranked)}\n- Held findings: {len(held)}"

    if lanes_degraded:
        summary_md += f"\n\n> ⚠️ **Degraded lanes:** {', '.join(lanes_degraded)}"

    # 3. Post batched review if not in observe mode
    if config.mode != "observe":
        event = "REQUEST_CHANGES" if check_conclusion == "failure" else "COMMENT"
        await vcs.post_review(
            repo_id=repo_id,
            pr_number=pr_number,
            commit_sha=head_sha,
            body=summary_md,
            event=event,
            comments=comments,
        )

    # 4. Update check run
    await vcs.create_or_update_check_run(
        repo_id=repo_id,
        name="quorum/review",
        head_sha=head_sha,
        status="completed",
        conclusion=check_conclusion,
        summary=summary_md,
    )

    return {
        "posted": posted_records,
        "summary_markdown": summary_md,
    }

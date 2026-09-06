"""Triage node: assigns attention budget and review mode (AC-014)."""
from __future__ import annotations

import json
from typing import Any, Dict
from quorum_core.models import TriageDecision, TriageMode
from quorum_core.policy import check_sensitive_paths
from quorum_graph.state import ReviewState
from quorum_prompts.registry import load_prompt, render_prompt
from quorum_providers.base import ModelProvider


async def triage_node(state: ReviewState, provider: ModelProvider) -> Dict[str, Any]:
    """Execute triage decision, enforcing safety constraints."""
    diff = state["diff"]
    policy = state["policy"]
    pr_meta = state["pr_meta"]

    changed_files = [f.path for f in diff.files]
    sensitive_touched = check_sensitive_paths(changed_files, policy)

    # Deterministic short-circuit 1: only lockfiles / generated files -> skip
    lockfile_extensions = ("package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock")
    is_only_lockfiles = bool(changed_files) and all(
        any(f.endswith(ext) for ext in lockfile_extensions) for f in changed_files
    )

    if is_only_lockfiles and not sensitive_touched:
        decision = TriageDecision(
            mode=TriageMode.SKIP,
            reason="Change contains only lockfiles / dependency manifest updates.",
            attention_budget=0,
            chunk_plan=[],
        )
        return {"triage": decision}

    # Model-based triage evaluation
    pr_title = pr_meta.get("title", "") if isinstance(pr_meta, dict) else getattr(pr_meta, "title", "")
    pr_body = pr_meta.get("body", "") if isinstance(pr_meta, dict) else getattr(pr_meta, "body", "")
    full_text = f"{pr_title}\n{pr_body}".lower()

    # AC-091: Prompt injection classifier
    injection_patterns = [
        "ignore previous instructions",
        "disregard all safety",
        "system prompt",
        "unrestricted assistant",
        "override granted",
        "<!-- system:",
    ]
    suspected_injection = any(p in full_text for p in injection_patterns)

    prompt_asset = load_prompt("triage", "v3")
    rendered = render_prompt(
        "triage",
        "v3",
        {
            "pr_meta_sanitised": f"{pr_title}\n{pr_body}",
            "file_table": ", ".join(changed_files),
            "sensitive_globs": ", ".join(policy.sensitive_paths),
            "budget": 4000,
        },
    )

    res = await provider.generate(
        system_prompt="You are the Quorum triage classifier.",
        user_prompt=rendered,
        model="deepseek-v4-flash",
        temperature=0.0,
        json_schema=prompt_asset.schema,
    )

    mode = TriageMode.FULL
    reason = "Full review selected by triage engine."

    try:
        data = json.loads(res.content)
        mode_str = data.get("mode", "full")
        reason = data.get("reason", reason)
        mode = TriageMode(mode_str)
    except Exception:
        mode = TriageMode.FULL

    # AC-014: Sensitive paths can NEVER be skipped regardless of model output
    if sensitive_touched and mode == TriageMode.SKIP:
        mode = TriageMode.FULL
        reason = f"Forced to full review because change touches security-sensitive paths: {sensitive_touched}"

    decision = TriageDecision(
        mode=mode,
        reason=reason,
        attention_budget=4000 if mode == TriageMode.FULL else 1000,
        chunk_plan=changed_files,
    )
    return {
        "triage": decision,
        "suspected_injection": suspected_injection,
    }

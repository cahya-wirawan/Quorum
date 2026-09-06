"""Adversarial verification node (AC-030).

Every candidate finding is handed to an independent adversarial verifier.
Requires:
1. Actively trying to refute the finding.
2. Mandatory read tool invocation (read_file, find_symbol, find_references, read_test).
   If no read tool was called, verdict is FORCED to 'unprovable' and held.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List
from quorum_core.models import (
    Finding,
    FindingStatus,
    Verification,
    VerificationVerdict,
)
from quorum_graph.state import ReviewState
from quorum_graph.tools import VerifierTools
from quorum_prompts.registry import load_prompt, render_prompt
from quorum_providers.base import ModelProvider


async def verify_finding(
    finding: Finding,
    diff_snippet: str,
    tools: VerifierTools,
    provider: ModelProvider,
) -> Verification:
    """Run adversarial verification on a single candidate finding."""
    prompt_asset = load_prompt("verify", "v4")
    rendered = render_prompt(
        "verify",
        "v4",
        {
            "path": finding.path,
            "line_start": finding.line_start,
            "line_end": finding.line_end,
            "claim": finding.claim,
            "severity": finding.severity.value,
            "diff_snippet": diff_snippet[:3000],
        },
    )

    initial_tool_calls_count = len(tools.call_history)

    res = await provider.generate(
        system_prompt="You are the independent Quorum adversarial verifier.",
        user_prompt=rendered,
        model="claude-opus-5",
        temperature=0.0,
        json_schema=prompt_asset.schema,
    )

    try:
        data = json.loads(res.content)
        verdict_str = data.get("verdict", "unprovable")
        refutation = data.get("refutation_hypothesis", "")
        reasoning = data.get("reasoning", "")
        verdict = VerificationVerdict(verdict_str)
        requested_tools = data.get("tools_called", [])
    except Exception:
        verdict = VerificationVerdict.UNPROVABLE
        refutation = "Failed to parse verifier response"
        reasoning = res.content
        requested_tools = []

    # Execute requested tools
    for tool_name in requested_tools:
        if tool_name == "read_file":
            tools.read_file(finding.path, finding.line_start, finding.line_end)
        elif tool_name == "find_symbol":
            tools.find_symbol(finding.path)
        elif tool_name == "find_references":
            tools.find_references(finding.path)
        elif tool_name == "read_test":
            tools.read_test(finding.path)

    tools_called = [h["tool"] for h in tools.call_history[initial_tool_calls_count:]]

    # AC-030: If verifier returns without calling a read tool, verdict is forced to unprovable
    if not tools_called:
        verdict = VerificationVerdict.UNPROVABLE
        reasoning = "Forced to unprovable: verifier completed without calling a read tool."

    # Update finding status based on verdict
    if verdict == VerificationVerdict.CONFIRMED:
        finding.status = FindingStatus.CONFIRMED
    elif verdict == VerificationVerdict.REFUTED:
        finding.status = FindingStatus.REFUTED
    else:
        finding.status = FindingStatus.UNPROVABLE

    return Verification(
        finding_id=finding.id,
        verdict=verdict,
        refutation_hypothesis=refutation,
        tools_called=tools_called,
        evidence_ids=finding.evidence_ids,
        reasoning=reasoning,
    )


async def verify_node(
    state: ReviewState,
    tools: VerifierTools,
    provider: ModelProvider,
) -> Dict[str, Any]:
    """Verify all candidate findings in state."""
    candidates = state.get("candidates", [])
    raw_diff = state.get("raw_diff", "")

    verifications: Dict[str, Verification] = {}
    for finding in candidates:
        ver = await verify_finding(finding, raw_diff, tools, provider)
        verifications[finding.id] = ver

    return {"verifications": verifications}

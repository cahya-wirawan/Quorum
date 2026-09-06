"""Lane node: runs specialized review lanes with timeout and isolation guards (AC-022, AC-023)."""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List
from quorum_core.fingerprint import compute_fingerprint
from quorum_core.models import (
    Evidence,
    EvidenceClass,
    Finding,
    FindingCategory,
    FindingStatus,
    Severity,
    SourceType,
)
from quorum_graph.state import ReviewState
from quorum_prompts.registry import load_prompt, render_prompt
from quorum_providers.base import ModelProvider


from quorum_providers.adaptive import RouteSignals, route
from quorum_providers.routing import RoutingPolicy


async def execute_lane(
    lane_name: str,
    state: ReviewState,
    provider: ModelProvider,
    timeout_seconds: int = 30,
) -> Dict[str, Any]:
    """Execute a single lane with strict isolation and error containment (AC-023)."""
    diff = state.get("raw_diff", "")
    context = state.get("context")
    context_chunks = (
        "\n".join(f"{c.path}:{c.line_start}-{c.line_end}\n{c.content}" for c in context.chunks)
        if context
        else ""
    )

    prompt_name = f"lane.{lane_name}" if lane_name in ("correctness", "security") else "lane.correctness"
    version = "v5" if prompt_name == "lane.correctness" else "v4"

    try:
        prompt_asset = load_prompt(prompt_name, version)
        rendered = render_prompt(
            prompt_name,
            version,
            {
                "diff_hunks": diff[:6000],
                "context_chunks": context_chunks[:4000],
                "analyzer_summary": "None",
                "active_rules": "None",
            },
        )

        # Adaptive routing selection (AC-084)
        policy = RoutingPolicy()
        route_sel = route(RouteSignals(node_class=f"lane.{lane_name}"), policy)

        async with asyncio.timeout(timeout_seconds):
            res = await provider.generate(
                system_prompt=f"You are the Quorum {lane_name.upper()} reviewer.",
                user_prompt=rendered,
                model=route_sel.model,
                temperature=0.0,
                json_schema=prompt_asset.schema,
            )

        data = json.loads(res.content)
        raw_findings = data.get("findings", [])

        findings: List[Finding] = []
        for i, item in enumerate(raw_findings):
            path = item.get("path", "unknown")
            line_start = item.get("line_start", 1)
            line_end = item.get("line_end", line_start)
            claim = item.get("claim", "")
            sev_str = item.get("severity", "medium").lower()
            try:
                severity = Severity(sev_str)
            except ValueError:
                severity = Severity.MEDIUM

            # Map category
            cat_map = {
                "correctness": FindingCategory.CORRECTNESS,
                "security": FindingCategory.SECURITY,
                "api_contract": FindingCategory.API_CONTRACT,
                "tests": FindingCategory.TESTS,
                "style": FindingCategory.STYLE,
            }
            category = cat_map.get(lane_name, FindingCategory.CORRECTNESS)

            fp = compute_fingerprint(path, category.value, claim)
            ev = Evidence(
                id=f"ev_{lane_name}_{i+1}",
                evidence_class=EvidenceClass.STRONGLY_INFERRED,
                source_type=SourceType.STATIC_TOOL,
                path=path,
                line_start=line_start,
                line_end=line_end,
                content_snippet=claim,
                tool_name=f"lane_{lane_name}",
            )

            finding = Finding(
                id=f"cand_{lane_name}_{i+1}_{fp[:8]}",
                fingerprint=fp,
                title=f"[{lane_name.title()}] {claim[:60]}",
                claim=claim,
                severity=severity,
                category=category,
                path=path,
                line_start=line_start,
                line_end=line_end,
                evidence_ids=[ev.id],
                evidences=[ev],
                proposed_fix=item.get("proposed_fix"),
                confidence=float(item.get("confidence", 0.8)),
                calibrated_confidence=float(item.get("confidence", 0.8)),
                status=FindingStatus.CANDIDATE,
                lane=lane_name,
                model_provider=res.provider,
                model_name=res.model,
            )
            findings.append(finding)

        # AC-084: Adaptive escalation retry on ambiguous confidence
        has_ambiguous = any(
            0.35 <= f.confidence <= 0.70 and f.severity in (Severity.CRITICAL, Severity.HIGH)
            for f in findings
        )
        if has_ambiguous and not route_sel.escalated:
            esc_sel = route(
                RouteSignals(
                    node_class=f"lane.{lane_name}",
                    confidence=0.5,
                    severity="critical",
                ),
                policy,
            )
            if esc_sel.escalated:
                try:
                    async with asyncio.timeout(timeout_seconds):
                        res_esc = await provider.generate(
                            system_prompt=f"You are the Quorum {lane_name.upper()} escalation reviewer.",
                            user_prompt=rendered,
                            model=esc_sel.model,
                            temperature=0.0,
                            json_schema=prompt_asset.schema,
                        )
                    data_esc = json.loads(res_esc.content)
                    raw_esc = data_esc.get("findings", [])
                    if raw_esc:
                        findings = []
                        for i, item in enumerate(raw_esc):
                            path = item.get("path", "unknown")
                            line_start = item.get("line_start", 1)
                            line_end = item.get("line_end", line_start)
                            claim = item.get("claim", "")
                            sev_str = item.get("severity", "medium").lower()
                            try:
                                severity = Severity(sev_str)
                            except ValueError:
                                severity = Severity.MEDIUM
                            fp = compute_fingerprint(path, category.value, claim)
                            ev = Evidence(
                                id=f"ev_{lane_name}_esc_{i+1}",
                                evidence_class=EvidenceClass.STRONGLY_INFERRED,
                                source_type=SourceType.STATIC_TOOL,
                                path=path,
                                line_start=line_start,
                                line_end=line_end,
                                content_snippet=claim,
                                tool_name=f"lane_{lane_name}_escalated",
                            )
                            finding = Finding(
                                id=f"cand_{lane_name}_esc_{i+1}_{fp[:8]}",
                                fingerprint=fp,
                                title=f"[{lane_name.title()}] {claim[:60]}",
                                claim=claim,
                                severity=severity,
                                category=category,
                                path=path,
                                line_start=line_start,
                                line_end=line_end,
                                evidence_ids=[ev.id],
                                evidences=[ev],
                                proposed_fix=item.get("proposed_fix"),
                                confidence=float(item.get("confidence", 0.9)),
                                calibrated_confidence=float(item.get("confidence", 0.9)),
                                status=FindingStatus.CANDIDATE,
                                lane=lane_name,
                                model_provider=res_esc.provider,
                                model_name=res_esc.model,
                            )
                            findings.append(finding)
                except Exception:
                    pass

        return {
            "candidates": findings,
            "lanes_run": [lane_name],
            "lanes_degraded": [],
        }

    except Exception as e:
        # AC-023: Isolation guard: degraded lane does not stop other lanes
        return {
            "candidates": [],
            "lanes_run": [],
            "lanes_degraded": [lane_name],
        }

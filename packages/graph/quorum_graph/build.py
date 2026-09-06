"""StateGraph assembly and execution engine (07_AI_OR_AUTOMATION_PIPELINE.md)."""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
from quorum_analysis.runner import AnalyzerRunner
from quorum_core.models import (
    Policy,
    RepoConfig,
    RetrievedChunk,
    RetrievedContext,
    TriageMode,
)
from quorum_graph.checkpointing import (
    CheckpointSaver,
    compute_run_key,
    default_checkpointer,
)
from quorum_graph.nodes.approval import approval_node
from quorum_graph.nodes.dedupe_merge import dedupe_merge_node
from quorum_graph.nodes.deterministic import deterministic_node
from quorum_graph.nodes.ingest import ingest_node
from quorum_graph.nodes.lane import execute_lane
from quorum_graph.nodes.learn import learn_node
from quorum_graph.nodes.policy import policy_node
from quorum_graph.nodes.publish import publish_node
from quorum_graph.nodes.publish_skip import publish_skip_node
from quorum_graph.nodes.rank import rank_node
from quorum_graph.nodes.triage import triage_node
from quorum_graph.nodes.verify import verify_node
from quorum_graph.state import ReviewState, merge_dicts, merge_findings
from quorum_graph.tools import VerifierTools
from quorum_indexing.search import HybridCodeSearch
from quorum_providers.base import ModelProvider
from quorum_providers.local import LocalStubProvider
from quorum_vcs.base import PullRequestHost
from quorum_vcs.fake import FakeHost


class ReviewPipeline:
    """Orchestrates the Quorum LangGraph State Machine execution."""

    def __init__(
        self,
        provider: Optional[ModelProvider] = None,
        vcs: Optional[PullRequestHost] = None,
        analyzer_runner: Optional[AnalyzerRunner] = None,
        search_engine: Optional[HybridCodeSearch] = None,
        checkpointer: Optional[CheckpointSaver] = None,
    ):
        self.provider = provider or LocalStubProvider()
        self.vcs = vcs or FakeHost()
        self.analyzer_runner = analyzer_runner or AnalyzerRunner()
        self.search_engine = search_engine or HybridCodeSearch()
        self.tools = VerifierTools(self.search_engine)
        self.checkpointer = checkpointer or default_checkpointer

    async def run(self, initial_state: ReviewState) -> ReviewState:
        """Execute the review pipeline graph from ingest to publish."""
        state = dict(initial_state)
        run_key = compute_run_key(
            repo_id=state.get("repo_id", "default/repo"),
            pr_number=state.get("pr_number", 1),
            head_sha=state.get("head_sha", "HEAD"),
            config_version=state.get("config", RepoConfig()).config_version,
            pipeline_version=state.get("pipeline_version", "1.0.0"),
        )

        # 1. Ingest node
        ingest_res = await ingest_node(state)
        state.update(ingest_res)
        self.checkpointer.save_checkpoint(run_key, state)

        # 2. Triage node
        triage_res = await triage_node(state, self.provider)
        state.update(triage_res)
        self.checkpointer.save_checkpoint(run_key, state)

        # Check skip branch
        if state["triage"].mode == TriageMode.SKIP:
            skip_res = await publish_skip_node(state, self.vcs)
            state.update(skip_res)
            self.checkpointer.save_checkpoint(run_key, state)
            return state

        # 3. Deterministic analyzers
        det_res = await deterministic_node(state, self.analyzer_runner)
        state["analyzers"] = det_res["analyzers"]
        state["candidates"] = merge_findings(state.get("candidates", []), det_res["candidates"])
        self.checkpointer.save_checkpoint(run_key, state)

        # 4. Retrieval context assembly
        raw_diff = state.get("raw_diff", "")
        # Populate mock retrieval context
        state["context"] = RetrievedContext(
            chunks=[
                RetrievedChunk(
                    path="main.py",
                    line_start=1,
                    line_end=20,
                    content=raw_diff[:1000],
                    score=1.0,
                )
            ],
            symbols=["main", "auth"],
            token_count=500,
        )

        # 5. Lane Fan-out
        cfg = state.get("config", RepoConfig())
        enabled_lanes = cfg.enabled_lanes
        if state["triage"].mode == TriageMode.LIGHT:
            enabled_lanes = ["correctness"]

        lane_tasks = [
            execute_lane(lane, state, self.provider) for lane in enabled_lanes
        ]
        lane_results = await asyncio.gather(*lane_tasks)

        for res in lane_results:
            state["candidates"] = merge_findings(state["candidates"], res["candidates"])
            state["lanes_run"].extend(res["lanes_run"])
            state["lanes_degraded"].extend(res["lanes_degraded"])
        self.checkpointer.save_checkpoint(run_key, state)

        # 6. Dedupe merge
        dedupe_res = await dedupe_merge_node(state)
        state.update(dedupe_res)

        # 7. Adversarial Verification Fan-out
        verify_res = await verify_node(state, self.tools, self.provider)
        state["verifications"] = merge_dicts(state.get("verifications", {}), verify_res["verifications"])
        self.checkpointer.save_checkpoint(run_key, state)

        # 8. Calibrate, Rank, and Budget
        rank_res = await rank_node(state)
        state.update(rank_res)

        # 9. Policy evaluation
        policy_res = await policy_node(state)
        state.update(policy_res)

        # 10. Approval gate if auto-fix pending (AC-045)
        if state.get("auto_fix_pending"):
            approval_res = await approval_node(state)
            state.update(approval_res)
            state["run_status"] = "awaiting_human"
            self.checkpointer.save_checkpoint(run_key, state)
            return state

        # 11. Publish node
        pub_res = await publish_node(state, self.vcs, self.provider)
        state.update(pub_res)

        # 12. Learn node
        learn_res = await learn_node(state)
        state.update(learn_res)

        state["run_status"] = "completed"
        self.checkpointer.save_checkpoint(run_key, state)
        return state

    async def resume(self, run_key: str, approved: bool = True) -> ReviewState:
        """Resume pipeline from awaiting_human checkpoint upon approval (AC-045)."""
        cached = self.checkpointer.load_checkpoint(run_key)
        if not cached:
            raise RuntimeError(f"No checkpoint found for thread {run_key}")

        state = dict(cached)
        state["auto_fix_pending"] = False

        if approved:
            pub_res = await publish_node(state, self.vcs, self.provider)
            state.update(pub_res)
            learn_res = await learn_node(state)
            state.update(learn_res)
            state["run_status"] = "completed"
        else:
            state["run_status"] = "rejected"

        self.checkpointer.save_checkpoint(run_key, state)
        return state


def compile_review_graph(
    provider: Optional[ModelProvider] = None,
    vcs: Optional[PullRequestHost] = None,
    analyzer_runner: Optional[AnalyzerRunner] = None,
    search_engine: Optional[HybridCodeSearch] = None,
    checkpointer: Optional[CheckpointSaver] = None,
) -> ReviewPipeline:
    """Compile and return executable review pipeline."""
    return ReviewPipeline(
        provider=provider,
        vcs=vcs,
        analyzer_runner=analyzer_runner,
        search_engine=search_engine,
        checkpointer=checkpointer,
    )

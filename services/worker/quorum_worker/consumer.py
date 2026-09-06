"""Background queue worker and run coordinator (AC-012, AC-040)."""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional
from quorum_graph.build import ReviewPipeline
from quorum_graph.checkpointing import CheckpointSaver, compute_run_key
from quorum_graph.state import ReviewState
from quorum_storage.models import RunRecord
from quorum_storage.repositories import StorageRepository


class ReviewWorker:
    """Worker claiming jobs, managing PR leases, and running the review pipeline."""

    def __init__(
        self,
        pipeline: ReviewPipeline,
        storage: StorageRepository,
        checkpointer: CheckpointSaver,
    ):
        self.pipeline = pipeline
        self.storage = storage
        self.checkpointer = checkpointer
        self.active_runs: Dict[str, asyncio.Task] = {}  # pr_key -> task

    async def handle_supersede(self, repo_id: str, pr_number: int, new_head_sha: str) -> None:
        """Cancel existing in-flight run when new commit is pushed (AC-012)."""
        pr_key = f"{repo_id}:{pr_number}"
        task = self.active_runs.get(pr_key)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def execute_run(self, state: ReviewState) -> ReviewState:
        """Execute review run, supporting resumption from existing checkpoint (AC-040)."""
        run_key = compute_run_key(
            repo_id=state["repo_id"],
            pr_number=state["pr_number"],
            head_sha=state["head_sha"],
        )

        # Check if resuming from previous checkpoint
        cached_state = self.checkpointer.load_checkpoint(run_key)
        initial = cached_state or state

        # Record run start in storage
        self.storage.save_run(
            RunRecord(
                run_id=initial["run_id"],
                org_id=initial["org_id"],
                repo_id=initial["repo_id"],
                pr_number=initial["pr_number"],
                head_sha=initial["head_sha"],
                base_sha=initial["base_sha"],
                status="running",
                mode=initial["config"].mode,
            )
        )

        # Run pipeline
        final_state = await self.pipeline.run(initial)

        # Record completion
        self.storage.save_run(
            RunRecord(
                run_id=final_state["run_id"],
                org_id=final_state["org_id"],
                repo_id=final_state["repo_id"],
                pr_number=final_state["pr_number"],
                head_sha=final_state["head_sha"],
                base_sha=final_state["base_sha"],
                status="completed",
                mode=final_state["config"].mode,
                verdict=final_state.get("check_conclusion", "success"),
                lanes_run=final_state.get("lanes_run", []),
                lanes_degraded=final_state.get("lanes_degraded", []),
                summary_markdown=final_state.get("summary_markdown"),
            )
        )

        return final_state

"""Ingest node: initializes run state, freezes configuration and policy."""
from __future__ import annotations

import re
from typing import Any, Dict, List
from quorum_core.models import (
    DiffFile,
    DiffHunk,
    DiffSummary,
    Policy,
    RepoConfig,
)
from quorum_graph.state import ReviewState


def parse_unified_diff(raw_diff: str) -> DiffSummary:
    """Parse raw git diff string into DiffSummary structure."""
    files: List[DiffFile] = []
    current_file: DiffFile | None = None
    additions = 0
    deletions = 0

    for line in raw_diff.splitlines():
        if line.startswith("diff --git"):
            parts = line.split()
            path = parts[-1].lstrip("b/") if len(parts) >= 4 else "unknown"
            current_file = DiffFile(path=path)
            files.append(current_file)
        elif line.startswith("@@ ") and current_file:
            m = re.search(r"@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@", line)
            if m:
                old_start = int(m.group(1))
                old_lines = int(m.group(2) or "1")
                new_start = int(m.group(3))
                new_lines = int(m.group(4) or "1")
                hunk = DiffHunk(
                    old_start=old_start,
                    old_lines=old_lines,
                    new_start=new_start,
                    new_lines=new_lines,
                )
                current_file.hunks.append(hunk)
        elif current_file and current_file.hunks:
            if line.startswith("+") and not line.startswith("+++"):
                additions += 1
                current_file.hunks[-1].lines.append(line)
            elif line.startswith("-") and not line.startswith("---"):
                deletions += 1
                current_file.hunks[-1].lines.append(line)
            else:
                current_file.hunks[-1].lines.append(line)

    risk_score = round(min(1.0, (additions + deletions) / 500.0), 2)
    return DiffSummary(
        files=files,
        additions=additions,
        deletions=deletions,
        total_files=len(files),
        risk_score=risk_score,
    )


async def ingest_node(state: ReviewState) -> Dict[str, Any]:
    """Ingest run payload, parse diffs, and initialize tracking lists."""
    raw_diff = state.get("raw_diff", "")
    diff_summary = parse_unified_diff(raw_diff)

    return {
        "diff": diff_summary,
        "lanes_run": [],
        "lanes_degraded": [],
        "candidates": [],
        "verifications": {},
        "analyzers": [],
        "ranked": [],
        "held": [],
        "posted": [],
    }

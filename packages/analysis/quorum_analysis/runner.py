"""Analyzer runner and execution registry (AC-020)."""
from __future__ import annotations

import asyncio
import json
import shutil
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
from quorum_core.models import AnalyzerResult
from quorum_analysis.sarif import parse_sarif_json


@dataclass
class AnalyzerSpec:
    name: str
    command: List[str]
    sarif_flag: Optional[str] = None
    enabled_by_default: bool = True


class AnalyzerRegistry:
    """Registry of deterministic analyzers."""

    def __init__(self):
        self._specs: Dict[str, AnalyzerSpec] = {
            "ruff": AnalyzerSpec(name="ruff", command=["ruff", "check", "--output-format", "sarif"]),
            "mypy": AnalyzerSpec(name="mypy", command=["mypy", "--output-format", "sarif"]),
            "semgrep": AnalyzerSpec(name="semgrep", command=["semgrep", "scan", "--sarif"]),
            "gitleaks": AnalyzerSpec(name="gitleaks", command=["gitleaks", "detect", "--report-format", "sarif"]),
        }

    def register(self, spec: AnalyzerSpec) -> None:
        self._specs[spec.name] = spec

    def get_all(self) -> List[AnalyzerSpec]:
        return list(self._specs.values())


class AnalyzerRunner:
    """Runs analyzers and collects results, ensuring one failing analyzer doesn't abort run (AC-020)."""

    def __init__(self, registry: Optional[AnalyzerRegistry] = None):
        self.registry = registry or AnalyzerRegistry()

    async def run_analyzer(self, spec: AnalyzerSpec, target_path: str) -> AnalyzerResult:
        """Execute a single analyzer against target path."""
        exe = shutil.which(spec.command[0])
        if not exe:
            # Analyzer not installed in environment; return clean skipped result
            return AnalyzerResult(
                tool_name=spec.name,
                exit_code=0,
                findings=[],
                raw_output=f"Analyzer '{spec.name}' not present in environment; skipped.",
            )

        cmd = [exe] + spec.command[1:] + [target_path]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            exit_code = proc.returncode or 0
            raw_out = stdout.decode("utf-8", "replace")

            findings = []
            if raw_out.strip().startswith("{"):
                try:
                    data = json.loads(raw_out)
                    findings = parse_sarif_json(data, spec.name)
                except Exception:
                    pass

            return AnalyzerResult(
                tool_name=spec.name,
                exit_code=exit_code,
                findings=findings,
                raw_output=raw_out or stderr.decode("utf-8", "replace"),
            )
        except Exception as e:
            # AC-020: A failing analyzer marks only that analyzer as failed while run continues
            return AnalyzerResult(
                tool_name=spec.name,
                exit_code=1,
                findings=[],
                raw_output=f"Execution error: {e}",
            )

    async def run_all(self, target_path: str) -> List[AnalyzerResult]:
        specs = self.registry.get_all()
        tasks = [self.run_analyzer(spec, target_path) for spec in specs]
        return await asyncio.gather(*tasks)

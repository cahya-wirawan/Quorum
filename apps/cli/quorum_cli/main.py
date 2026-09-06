"""Quorum CLI tool (AC-094).

Usage:
  quorum review --diff <path> [--format sarif|text] [--budget N]
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict, List
from quorum_core.models import (
    Finding,
    Policy,
    PRMeta,
    RepoConfig,
    Severity,
)
from quorum_core.version import __version__
from quorum_graph.build import compile_review_graph


def format_sarif(findings: List[Finding]) -> Dict[str, Any]:
    """Convert findings to SARIF 2.1.0 payload."""
    results = []
    for f in findings:
        level = "error" if f.severity in (Severity.CRITICAL, Severity.HIGH) else "warning"
        results.append({
            "ruleId": f.category.value,
            "level": level,
            "message": {"text": f.claim},
            "locations": [
                {
                    "physicalLocation": {
                        "artifactLocation": {"uri": f.path},
                        "region": {"startLine": f.line_start, "endLine": f.line_end},
                    }
                }
            ],
        })

    return {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {"driver": {"name": "Quorum", "version": __version__}},
                "results": results,
            }
        ],
    }


async def run_cli_review(diff_content: str, output_format: str = "sarif") -> int:
    """Run local review and return exit code (1 if blocking findings exist, 0 otherwise)."""
    pipe = compile_review_graph()
    state = {
        "run_id": "cli_run",
        "org_id": "cli_org",
        "repo_id": "local/repo",
        "pr_number": 0,
        "head_sha": "HEAD",
        "base_sha": "BASE",
        "pipeline_version": __version__,
        "config": RepoConfig(comment_budget=8),
        "policy": Policy(block_on_critical=True),
        "raw_diff": diff_content,
        "pr_meta": PRMeta(title="CLI Review", body="Local diff review", author="local", author_is_bot=False),
        "ci_signals": [],
    }

    result = await pipe.run(state)
    posted = result.get("posted", [])
    ranked = result.get("ranked", [])

    if output_format == "sarif":
        sarif_doc = format_sarif(ranked)
        sys.stdout.write(json.dumps(sarif_doc, indent=2) + "\n")
    else:
        sys.stdout.write(f"Quorum review completed. {len(posted)} findings posted.\n")
        for f in ranked:
            sys.stdout.write(f"- [{f.severity.value.upper()}] {f.path}:{f.line_start} - {f.claim}\n")

    # Exit 1 if blocking findings exist
    has_blocking = any(f.severity == Severity.CRITICAL for f in ranked)
    return 1 if has_blocking else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Quorum CLI: Autonomous PR review tool")
    parser.add_argument(
        "-v", "--version",
        action="version",
        version=f"Quorum v{__version__}",
        help="Show Quorum version and exit",
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=False)

    rev_p = subparsers.add_parser("review", help="Review a diff")
    rev_p.add_argument("--diff", required=True, help="Path to diff file or '-' for stdin")
    rev_p.add_argument("--format", choices=["sarif", "text"], default="sarif", help="Output format")

    args = parser.parse_args()

    if not args.subcommand:
        parser.print_help()
        sys.exit(0)

    if args.diff == "-":
        diff_text = sys.stdin.read()
    else:
        p = Path(args.diff)
        if not p.exists():
            sys.stderr.write(f"Error: diff file not found: {args.diff}\n")
            sys.exit(2)
        diff_text = p.read_text(encoding="utf-8")

    code = asyncio.run(run_cli_review(diff_text, output_format=args.format))
    sys.exit(code)


if __name__ == "__main__":
    main()

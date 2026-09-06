"""Read-only verifier tools (AC-030).

Strictly read-only codebase inspection utilities for adversarial verification.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from quorum_indexing.graph import CodeGraph
from quorum_indexing.search import HybridCodeSearch


class VerifierTools:
    """Read-only inspection tool suite provided to the adversarial verifier."""

    def __init__(self, search_engine: HybridCodeSearch):
        self.search = search_engine
        self.call_history: List[Dict[str, Any]] = []

    def read_file(self, path: str, line_start: int = 1, line_end: int = 50) -> str:
        """Read specific line range from a repository file."""
        self.call_history.append({"tool": "read_file", "path": path, "lines": (line_start, line_end)})
        content = self.search.files.get(path)
        if not content:
            return f"Error: File '{path}' not found in repository."
        lines = content.splitlines()
        start_idx = max(0, line_start - 1)
        end_idx = min(len(lines), line_end)
        return "\n".join(lines[start_idx:end_idx])

    def find_symbol(self, name: str) -> str:
        """Find definition and line span for a function or class."""
        self.call_history.append({"tool": "find_symbol", "symbol": name})
        chunk = self.search.expand_symbol(name)
        if not chunk:
            return f"Symbol '{name}' not found."
        return f"Symbol {name} at {chunk.path}:{chunk.line_start}-{chunk.line_end}:\n{chunk.content}"

    def find_references(self, name: str) -> str:
        """Find callers and usages of a symbol across the repository."""
        self.call_history.append({"tool": "find_references", "symbol": name})
        chunks = self.search.search_keyword(name, max_results=5)
        if not chunks:
            return f"No references found for '{name}'."
        return "\n---\n".join(f"{c.path}:{c.line_start}-{c.line_end}\n{c.content}" for c in chunks)

    def read_test(self, test_name_or_path: str) -> str:
        """Inspect test cases covering specific functions or paths."""
        self.call_history.append({"tool": "read_test", "query": test_name_or_path})
        chunks = self.search.search_keyword(f"test_{test_name_or_path}", max_results=3)
        if not chunks:
            return f"No test cases located matching '{test_name_or_path}'."
        return "\n---\n".join(f"{c.path}:{c.line_start}-{c.line_end}\n{c.content}" for c in chunks)

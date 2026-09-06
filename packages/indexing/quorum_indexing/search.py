"""Code indexing and hybrid retrieval search."""
from __future__ import annotations

import re
from typing import Dict, List, Optional
from quorum_core.models import RetrievedChunk
from quorum_indexing.graph import CodeGraph, SymbolDefinition


class HybridCodeSearch:
    """Hybrid code search combining BM25 keyword matching and symbol graph."""

    def __init__(self, code_graph: Optional[CodeGraph] = None):
        self.code_graph = code_graph or CodeGraph()
        self.files: Dict[str, str] = {}

    def add_file(self, path: str, content: str) -> None:
        self.files[path] = content
        self.code_graph.index_python_file(path, content)

    def search_keyword(self, query: str, max_results: int = 5) -> List[RetrievedChunk]:
        results: List[RetrievedChunk] = []
        q_tokens = [w.lower() for w in re.findall(r"\w+", query)]
        if not q_tokens:
            return results

        for path, content in self.files.items():
            lines = content.splitlines()
            for i, line in enumerate(lines, start=1):
                line_lower = line.lower()
                matches = sum(1 for token in q_tokens if token in line_lower)
                if matches > 0:
                    score = round(matches / len(q_tokens), 2)
                    chunk = RetrievedChunk(
                        path=path,
                        line_start=max(1, i - 2),
                        line_end=min(len(lines), i + 2),
                        content="\n".join(lines[max(0, i - 3) : min(len(lines), i + 2)]),
                        score=score,
                        source="keyword_search",
                    )
                    results.append(chunk)

        results.sort(key=lambda c: c.score, reverse=True)
        return results[:max_results]

    def expand_symbol(self, symbol_name: str) -> Optional[RetrievedChunk]:
        sym = self.code_graph.find_symbol(symbol_name)
        if not sym or sym.path not in self.files:
            return None
        content = self.files[sym.path]
        lines = content.splitlines()
        chunk_lines = lines[sym.line_start - 1 : sym.line_end]
        return RetrievedChunk(
            path=sym.path,
            line_start=sym.line_start,
            line_end=sym.line_end,
            content="\n".join(chunk_lines),
            score=1.0,
            source="symbol_expansion",
        )

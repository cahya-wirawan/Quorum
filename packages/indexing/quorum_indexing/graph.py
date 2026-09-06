"""Code symbol extraction and reference graph construction."""
from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set


@dataclass
class SymbolDefinition:
    name: str
    kind: str  # function, class, variable
    path: str
    line_start: int
    line_end: int
    docstring: Optional[str] = None
    references: Set[str] = field(default_factory=set)


class CodeGraph:
    """Symbol call, import, and reference graph."""

    def __init__(self):
        self.symbols: Dict[str, SymbolDefinition] = {}
        self.file_symbols: Dict[str, List[str]] = {}

    def index_python_file(self, path: str, content: str) -> None:
        """Extract symbols from Python file using AST."""
        try:
            tree = ast.parse(content, filename=path)
        except SyntaxError:
            # Fallback to regex symbol extraction for broken syntax or non-python
            self._index_regex(path, content)
            return

        file_syms: List[str] = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                sym = SymbolDefinition(
                    name=node.name,
                    kind="function",
                    path=path,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    docstring=ast.get_docstring(node),
                )
                self.symbols[node.name] = sym
                file_syms.append(node.name)
            elif isinstance(node, ast.ClassDef):
                sym = SymbolDefinition(
                    name=node.name,
                    kind="class",
                    path=path,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    docstring=ast.get_docstring(node),
                )
                self.symbols[node.name] = sym
                file_syms.append(node.name)

        self.file_symbols[path] = file_syms

    def _index_regex(self, path: str, content: str) -> None:
        file_syms: List[str] = []
        for i, line in enumerate(content.splitlines(), start=1):
            m = re.match(r"^\s*(def|class|function)\s+([a-zA-Z_]\w*)", line)
            if m:
                kind = "function" if m.group(1) != "class" else "class"
                name = m.group(2)
                sym = SymbolDefinition(
                    name=name,
                    kind=kind,
                    path=path,
                    line_start=i,
                    line_end=i,
                )
                self.symbols[name] = sym
                file_syms.append(name)
        self.file_symbols[path] = file_syms

    def find_symbol(self, name: str) -> Optional[SymbolDefinition]:
        return self.symbols.get(name)

    def find_references(self, name: str) -> List[SymbolDefinition]:
        return [sym for sym in self.symbols.values() if name in sym.references]

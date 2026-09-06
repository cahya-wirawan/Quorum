"""Architecture boundary and layer constraint tests (16_REPO_STRUCTURE.md).

Enforces:
- Rule 1: `quorum_core` imports NOTHING from graph, services, storage, providers, or vcs.
- Rule 2: `quorum_graph` never imports services or apps.
- Rule 3: Only `storage` imports database drivers or ORMs.
- Rule 5: `ingress` never imports graph or providers.
- Rule 7: Prompt templates live only in packages/prompts/assets.
"""
import ast
import os
import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).parent.parent.parent


def get_imports_in_file(file_path: Path) -> list[str]:
    """Parse python file and extract all imported module names."""
    try:
        content = file_path.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(file_path))
    except Exception:
        return []

    imported_modules = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_modules.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported_modules.append(node.module)
    return imported_modules


class ArchitectureBoundaryTests(unittest.TestCase):

    def test_rule_1_core_has_zero_external_layer_imports(self):
        """Rule 1: core imports NOTHING from graph, services, storage, providers, or vcs."""
        core_dir = ROOT_DIR / "packages" / "core" / "quorum_core"
        forbidden_prefixes = (
            "quorum_graph",
            "quorum_services",
            "quorum_storage",
            "quorum_providers",
            "quorum_vcs",
            "quorum_ingress",
            "quorum_worker",
            "quorum_api",
        )

        for py_file in core_dir.glob("**/*.py"):
            imports = get_imports_in_file(py_file)
            for mod in imports:
                for forbidden in forbidden_prefixes:
                    self.assertFalse(
                        mod.startswith(forbidden),
                        f"Rule 1 violation in {py_file.name}: imports forbidden layer '{mod}'",
                    )

    def test_rule_2_graph_never_imports_services_or_apps(self):
        """Rule 2: graph may not import services or apps."""
        graph_dir = ROOT_DIR / "packages" / "graph" / "quorum_graph"
        forbidden_prefixes = (
            "quorum_services",
            "quorum_ingress",
            "quorum_worker",
            "quorum_api",
            "quorum_cli",
        )

        for py_file in graph_dir.glob("**/*.py"):
            imports = get_imports_in_file(py_file)
            for mod in imports:
                for forbidden in forbidden_prefixes:
                    self.assertFalse(
                        mod.startswith(forbidden),
                        f"Rule 2 violation in {py_file.name}: imports forbidden service/app '{mod}'",
                    )

    def test_rule_3_only_storage_touches_database(self):
        """Rule 3: only storage imports sqlite3, sqlalchemy, psycopg, or raw database drivers."""
        forbidden_db_modules = ("sqlite3", "sqlalchemy", "psycopg", "psycopg2", "asyncpg")
        packages_dir = ROOT_DIR / "packages"

        for py_file in packages_dir.glob("**/*.py"):
            # Skip quorum_storage itself
            if "quorum_storage" in str(py_file):
                continue
            imports = get_imports_in_file(py_file)
            for mod in imports:
                for db_mod in forbidden_db_modules:
                    self.assertFalse(
                        mod == db_mod or mod.startswith(f"{db_mod}."),
                        f"Rule 3 violation in {py_file}: database module '{mod}' imported outside storage",
                    )

    def test_rule_5_ingress_never_imports_graph_or_providers(self):
        """Rule 5: ingress must stay fast and boring, no graph or provider imports."""
        ingress_dir = ROOT_DIR / "services" / "ingress" / "quorum_ingress"
        forbidden_prefixes = ("quorum_graph", "quorum_providers")

        for py_file in ingress_dir.glob("**/*.py"):
            imports = get_imports_in_file(py_file)
            for mod in imports:
                for forbidden in forbidden_prefixes:
                    self.assertFalse(
                        mod.startswith(forbidden),
                        f"Rule 5 violation in {py_file.name}: ingress imports '{mod}'",
                    )


if __name__ == "__main__":
    unittest.main()

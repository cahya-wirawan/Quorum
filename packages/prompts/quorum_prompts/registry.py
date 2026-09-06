"""Prompt Registry and Versioned Asset Loader.

Prompts are versioned assets in packages/prompts/quorum_prompts/assets/<prompt_id>/<version>.md
with a sibling schema.json.
Enforces that prompt text is loaded from assets rather than hardcoded in Python.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


ASSETS_DIR = Path(__file__).parent / "assets"


@dataclass
class PromptAsset:
    prompt_id: str
    version: str
    text: str
    content_hash: str
    schema: Dict[str, Any]

    def render(self, variables: Optional[Dict[str, Any]] = None) -> str:
        """Render prompt template with {{ variable }} replacements."""
        if not variables:
            return self.text
        rendered = self.text
        for k, v in variables.items():
            val_str = str(v) if not isinstance(v, (dict, list)) else json.dumps(v, indent=2)
            rendered = rendered.replace(f"{{{{ {k} }}}}", val_str)
            rendered = rendered.replace(f"{{{{{k}}}}}", val_str)
        return rendered


class PromptRegistry:
    """Registry caching and validating versioned prompt assets."""

    def __init__(self, assets_path: Optional[Path] = None):
        self.assets_path = assets_path or ASSETS_DIR
        self._cache: Dict[str, PromptAsset] = {}

    def get(self, prompt_id: str, version: str) -> PromptAsset:
        cache_key = f"{prompt_id}:{version}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        prompt_file = self.assets_path / prompt_id / f"{version}.md"
        schema_file = self.assets_path / prompt_id / f"{version}.schema.json"
        # Fallback to schema.json if version-specific not found
        if not schema_file.exists():
            schema_file = self.assets_path / prompt_id / "schema.json"

        if not prompt_file.exists():
            raise FileNotFoundError(f"Prompt asset not found: {prompt_file}")

        text = prompt_file.read_text(encoding="utf-8")
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

        schema: Dict[str, Any] = {}
        if schema_file.exists():
            schema = json.loads(schema_file.read_text(encoding="utf-8"))

        asset = PromptAsset(
            prompt_id=prompt_id,
            version=version,
            text=text,
            content_hash=content_hash,
            schema=schema,
        )
        self._cache[cache_key] = asset
        return asset


# Global registry instance
default_registry = PromptRegistry()


def load_prompt(prompt_id: str, version: str) -> PromptAsset:
    return default_registry.get(prompt_id, version)


def render_prompt(prompt_id: str, version: str, variables: Optional[Dict[str, Any]] = None) -> str:
    return default_registry.get(prompt_id, version).render(variables)

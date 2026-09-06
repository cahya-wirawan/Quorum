"""Deterministic mock/stub provider for unit tests, offline CLI, and eval gates."""
from __future__ import annotations

import json
import time
from typing import Any, Callable, Dict, List, Optional
from quorum_providers.base import ModelProvider, ModelResult
from quorum_providers.cost import estimate_tokens, calculate_cost_cents


class LocalStubProvider(ModelProvider):
    """Deterministic local provider that can mock node responses."""

    def __init__(self, canned_responses: Optional[Dict[str, Any]] = None):
        self.canned_responses: Dict[str, Any] = canned_responses or {}
        self.calls_made: List[Dict[str, Any]] = []

    def set_response_for_node(self, node_or_prompt_keyword: str, response_payload: Any) -> None:
        self.canned_responses[node_or_prompt_keyword] = response_payload

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.0,
        timeout: int = 60,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> ModelResult:
        model_name = model or "local-stub"
        call_record = {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "model": model_name,
            "json_schema": json_schema,
            "timestamp": time.time(),
        }
        self.calls_made.append(call_record)

        # Match canned response by keyword in prompt or system
        content_obj = None
        for keyword, resp in self.canned_responses.items():
            if keyword in system_prompt or keyword in user_prompt:
                content_obj = resp
                break

        if content_obj is None:
            # Generate sensible default structure matching schema if available
            if "triage" in system_prompt.lower():
                content_obj = {
                    "mode": "full",
                    "reason": "Default local triage: full review mode",
                    "attention_budget_lines": 4000,
                    "chunks": [{"files": ["main.py"], "risk": 0.5, "why": "Core entrypoint"}],
                }
            elif "adversarial verifier" in system_prompt.lower():
                # Default verifier confirms finding with mock read_file tool call
                content_obj = {
                    "verdict": "confirmed",
                    "refutation_hypothesis": "Checked bounds and discovered no protective guard in calling code.",
                    "tools_called": ["read_file"],
                    "reasoning": "Inspected file lines, confirmed hypothesis of missing nil check.",
                }
            elif "correctness" in system_prompt.lower():
                # If prompt specifies clean evaluation or clean changes, report zero findings
                if "clean" in user_prompt.lower() or "docs/" in user_prompt.lower() or "# calculate" in user_prompt.lower():
                    content_obj = {"findings": []}
                else:
                    content_obj = {
                        "findings": [
                            {
                                "path": "sample.py",
                                "line_start": 10,
                                "line_end": 12,
                                "claim": "Unhandled None dereference when user record is absent.",
                                "severity": "high",
                                "confidence": 0.9,
                                "proposed_fix": "Add 'if user is None: return None'",
                            }
                        ]
                    }
            elif "security" in system_prompt.lower():
                if "clean" in user_prompt.lower() or "docs/" in user_prompt.lower():
                    content_obj = {"findings": []}
                else:
                    content_obj = {
                        "findings": [
                            {
                                "path": "auth.py",
                                "line_start": 42,
                                "line_end": 45,
                                "claim": "Timing attack vulnerability in string token comparison.",
                            "severity": "high",
                            "confidence": 0.85,
                            "attack_vector": "Remote timing measurement on bearer tokens",
                            "proposed_fix": "Use hmac.compare_digest",
                        }
                    ]
                }
            elif "summarise" in system_prompt.lower():
                content_obj = {
                    "markdown_body": "### Quorum Review Summary\n\nAll review lanes completed. 1 finding posted, 0 held.",
                    "verdict": "action_required",
                }
            elif "fix" in system_prompt.lower():
                content_obj = {
                    "patch": "--- a/sample.py\n+++ b/sample.py\n@@ -10,2 +10,4 @@\n+    if user is None:\n+        return None\n",
                    "explanation": "Safely guard against None dereference.",
                }
            else:
                content_obj = {"status": "ok", "message": "Local stub response"}

        content_str = json.dumps(content_obj) if not isinstance(content_obj, str) else content_obj
        tokens_in = estimate_tokens(system_prompt + user_prompt)
        tokens_out = estimate_tokens(content_str)
        cost = calculate_cost_cents(model_name, tokens_in, tokens_out)

        return ModelResult(
            content=content_str,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cached=False,
            provider="local",
            model=model_name,
            latency_ms=1.5,
            cost_cents=cost,
            raw_response={"raw": content_obj},
        )

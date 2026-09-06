"""Anthropic and Anthropic-compatible API provider."""
from __future__ import annotations

import asyncio
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional
from quorum_providers.base import ModelProvider, ModelResult
from quorum_providers.cost import estimate_tokens, calculate_cost_cents


class AnthropicProvider(ModelProvider):
    """Anthropic messages API adapter."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: str = "claude-sonnet-5",
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        base = (base_url or os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")).rstrip("/")
        if base.endswith("/messages"):
            self.endpoint = base
        elif base.endswith("/v1"):
            self.endpoint = f"{base}/messages"
        else:
            self.endpoint = f"{base}/v1/messages"
        self.default_model = default_model

    def _sync_request(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        timeout: int,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": model,
            "max_tokens": 4096,
            "temperature": temperature,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.endpoint, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            raise RuntimeError(f"Anthropic HTTP {e.code}: {body[:1000]}") from e

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.0,
        timeout: int = 60,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> ModelResult:
        model_name = model or self.default_model
        t0 = time.time()
        res = await asyncio.to_thread(
            self._sync_request,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model_name,
            temperature=temperature,
            timeout=timeout,
        )
        latency_ms = round((time.time() - t0) * 1000, 2)

        # Extract text blocks
        content_chunks = []
        for block in res.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text":
                content_chunks.append(block.get("text", ""))
        text = "\n".join(content_chunks)

        usage = res.get("usage", {})
        tokens_in = usage.get("input_tokens", estimate_tokens(system_prompt + user_prompt))
        tokens_out = usage.get("output_tokens", estimate_tokens(text))
        cost = calculate_cost_cents(model_name, tokens_in, tokens_out)

        return ModelResult(
            content=text,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cached=False,
            provider="anthropic",
            model=model_name,
            latency_ms=latency_ms,
            cost_cents=cost,
            raw_response=res,
        )

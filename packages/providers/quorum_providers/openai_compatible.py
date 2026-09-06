"""OpenAI and OpenAI-compatible API provider (Local vLLM, Ollama, OpenAI)."""
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


class OpenAICompatibleProvider(ModelProvider):
    """OpenAI /chat/completions API adapter."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: str = "gpt-5.6-terra",
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        base = (base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")).rstrip("/")
        if base.endswith("/chat/completions"):
            self.endpoint = base
        else:
            self.endpoint = f"{base}/chat/completions"
        self.default_model = default_model

    def _sync_request(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        timeout: int,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        if json_schema:
            payload["response_format"] = {"type": "json_object"}

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(self.endpoint, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            raise RuntimeError(f"OpenAI HTTP {e.code}: {body[:1000]}") from e

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
            json_schema=json_schema,
        )
        latency_ms = round((time.time() - t0) * 1000, 2)

        choices = res.get("choices", [])
        text = ""
        if choices:
            msg = choices[0].get("message", {})
            text = msg.get("content", "") or ""

        usage = res.get("usage", {})
        tokens_in = usage.get("prompt_tokens", estimate_tokens(system_prompt + user_prompt))
        tokens_out = usage.get("completion_tokens", estimate_tokens(text))
        cost = calculate_cost_cents(model_name, tokens_in, tokens_out)

        return ModelResult(
            content=text,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cached=False,
            provider="openai",
            model=model_name,
            latency_ms=latency_ms,
            cost_cents=cost,
            raw_response=res,
        )

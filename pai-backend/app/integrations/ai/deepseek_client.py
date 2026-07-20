"""Async DeepSeek client.

Replaces the legacy synchronous `call_deepseek()` helper. Features required by
CLAUDE.md section 15:

- Uses the shared `httpx.AsyncClient` (connection reuse).
- Non-streaming JSON completions and token streaming (SSE).
- Structured JSON output via ``response_format={"type": "json_object"}``.
- Timeouts and bounded retries for transient failures.
- Model name from configuration (never hard-coded at call sites).
- Logs latency and token usage; never logs the API key.
"""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator, Sequence

import httpx

from app.core.exceptions import ExternalProviderError
from app.core.logging import get_logger
from app.integrations.ai.schemas import ChatCompletion, ChatMessage, ChatUsage

logger = get_logger(__name__)

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class DeepSeekClient:
    def __init__(
        self,
        *,
        api_key: str | None,
        base_url: str,
        model: str,
        http_client: httpx.AsyncClient,
        timeout_seconds: float = 60.0,
        max_retries: int = 2,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._http = http_client
        self._timeout = timeout_seconds
        self._max_retries = max_retries

    @property
    def model(self) -> str:
        return self._model

    def _headers(self) -> dict[str, str]:
        if not self._api_key:
            raise ExternalProviderError(
                "DEEPSEEK_API_KEY is not configured.", error_code="deepseek_not_configured"
            )
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._api_key}",
        }

    @staticmethod
    def _to_payload_messages(messages: Sequence[ChatMessage] | Sequence[dict]) -> list[dict]:
        payload: list[dict] = []
        for msg in messages:
            if isinstance(msg, ChatMessage):
                payload.append({"role": msg.role, "content": msg.content})
            else:
                payload.append({"role": msg["role"], "content": msg["content"]})
        return payload

    async def complete(
        self,
        messages: Sequence[ChatMessage] | Sequence[dict],
        *,
        temperature: float = 0.3,
        json_mode: bool = False,
        model: str | None = None,
    ) -> ChatCompletion:
        """Run a non-streaming chat completion."""
        body: dict = {
            "model": model or self._model,
            "messages": self._to_payload_messages(messages),
            "temperature": temperature,
            "stream": False,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        started = time.perf_counter()
        data = await self._post_with_retry("/chat/completions", body)
        latency_ms = (time.perf_counter() - started) * 1000

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ExternalProviderError(
                "Unexpected DeepSeek response shape.", error_code="deepseek_bad_response"
            ) from exc

        usage = ChatUsage(**(data.get("usage") or {}))
        logger.info(
            "deepseek_completion",
            extra={
                "model": body["model"],
                "latency_ms": round(latency_ms, 1),
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "json_mode": json_mode,
            },
        )
        return ChatCompletion(
            content=content, model=body["model"], usage=usage, latency_ms=latency_ms
        )

    async def complete_json(
        self,
        messages: Sequence[ChatMessage] | Sequence[dict],
        *,
        temperature: float = 0.1,
        model: str | None = None,
    ) -> dict:
        """Run a completion in JSON mode and parse the result into a dict."""
        result = await self.complete(
            messages, temperature=temperature, json_mode=True, model=model
        )
        try:
            return json.loads(result.content)
        except json.JSONDecodeError:
            # Defensive fallback if the provider ignored json mode and wrapped
            # the object in prose or markdown fences.
            cleaned = _strip_json_fence(result.content)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as exc:
                raise ExternalProviderError(
                    "DeepSeek did not return valid JSON.",
                    error_code="deepseek_invalid_json",
                ) from exc

    async def stream(
        self,
        messages: Sequence[ChatMessage] | Sequence[dict],
        *,
        temperature: float = 0.3,
        model: str | None = None,
    ) -> AsyncIterator[str]:
        """Yield content tokens as they arrive (Server-Sent Events)."""
        body: dict = {
            "model": model or self._model,
            "messages": self._to_payload_messages(messages),
            "temperature": temperature,
            "stream": True,
        }
        url = f"{self._base_url}/chat/completions"
        try:
            async with self._http.stream(
                "POST", url, json=body, headers=self._headers(), timeout=self._timeout
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[len("data:") :].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0]["delta"].get("content")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except httpx.HTTPError as exc:
            raise ExternalProviderError(
                "DeepSeek streaming request failed.", error_code="deepseek_stream_error"
            ) from exc

    async def _post_with_retry(self, path: str, body: dict) -> dict:
        url = f"{self._base_url}{path}"
        last_exc: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                response = await self._http.post(
                    url, json=body, headers=self._headers(), timeout=self._timeout
                )
                if response.status_code in _RETRYABLE_STATUS:
                    raise httpx.HTTPStatusError(
                        f"Retryable status {response.status_code}",
                        request=response.request,
                        response=response,
                    )
                response.raise_for_status()
                return response.json()
            except (httpx.TransportError, httpx.HTTPStatusError) as exc:
                last_exc = exc
                if attempt < self._max_retries:
                    backoff = 0.5 * (2**attempt)
                    logger.warning(
                        "deepseek_retry",
                        extra={"attempt": attempt + 1, "backoff_s": backoff},
                    )
                    await asyncio.sleep(backoff)
                    continue
                break
        raise ExternalProviderError(
            "DeepSeek request failed after retries.", error_code="deepseek_unavailable"
        ) from last_exc


def _strip_json_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    return cleaned

"""Shared test fixtures and fakes.

DeepSeek and SerpAPI are always mocked — tests never make real paid API calls
(CLAUDE.md section 27).
"""

from __future__ import annotations

from typing import Any

import pytest

from app.prompts.registry import PromptRegistry


class FakeDeepSeek:
    """Stand-in for DeepSeekClient. Returns a fixed JSON payload."""

    def __init__(self, payload: dict[str, Any] | None = None) -> None:
        self.payload = payload or {}
        self.calls = 0
        self.last_messages: list[dict] | None = None

    async def complete_json(self, messages, **kwargs):  # noqa: ANN001
        self.calls += 1
        self.last_messages = list(messages)
        return self.payload


@pytest.fixture(scope="session")
def prompts() -> PromptRegistry:
    registry = PromptRegistry()
    registry.load()
    return registry


@pytest.fixture
def fake_deepseek() -> FakeDeepSeek:
    return FakeDeepSeek()

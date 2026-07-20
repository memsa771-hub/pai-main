"""Pydantic schemas for AI requests and responses.

Validating provider payloads through Pydantic (rather than trusting raw dicts)
keeps the rest of the codebase type-safe and makes structured extraction
reliable.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["system", "user", "assistant"]


class ChatMessage(BaseModel):
    role: Role
    content: str


class ChatUsage(BaseModel):
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class ChatCompletion(BaseModel):
    """Normalized result of a non-streaming completion."""

    content: str
    model: str
    usage: ChatUsage = Field(default_factory=ChatUsage)
    latency_ms: float | None = None

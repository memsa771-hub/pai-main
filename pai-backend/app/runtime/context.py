"""The shared per-request context (CLAUDE.md section 12).

`RequestContext` is a dependency-free data structure built once per request by
the context builder and passed to a single primary agent. It carries only the
task-relevant slice of the student's data so agents never reload the same state
and DeepSeek never receives the full private profile (CLAUDE.md sections 6.8, 12).

This module is a leaf: it imports nothing from other app packages, so both the
runtime and agents layers can depend on it without creating an import cycle.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class RequestContext:
    user_id: str
    session_id: str
    message: str
    language_style: str = "en"
    intent: str | None = None
    profile: dict[str, Any] = field(default_factory=dict)
    goals: list[dict[str, Any]] = field(default_factory=list)
    preferences: dict[str, Any] = field(default_factory=dict)
    recent_messages: list[dict[str, Any]] = field(default_factory=list)
    conversation_summary: str | None = None
    document_ids: list[str] = field(default_factory=list)
    cached_data: dict[str, Any] = field(default_factory=dict)

"""Builds the shared `RequestContext` once per request (CLAUDE.md section 12).

Profile, goals, preferences, recent messages and summary are loaded through a
`ContextSource`. Loads run **sequentially** because SQLAlchemy ``AsyncSession``
forbids concurrent operations on the same session (NullPool / pgbouncer).
"""

from __future__ import annotations

import re
from typing import Any, Protocol

from app.core.logging import get_logger
from app.runtime.context import RequestContext

logger = get_logger(__name__)

# Common Roman Urdu tokens used to distinguish Roman Urdu from plain English.
_ROMAN_URDU_TOKENS = {
    "main", "mein", "hai", "hain", "chahta", "chahti", "chahiye", "karna", "karni",
    "mujhe", "mera", "meri", "mere", "kya", "kyun", "ke", "ka", "ki", "ko", "jana",
    "parhun", "parhna", "batao", "acha", "theek", "yar", "yaar", "bhi", "nahi",
    "kaise", "kahan", "kaunsa", "wala", "hoga", "raha", "rahi", "kar", "lena",
}
_URDU_SCRIPT = re.compile(r"[\u0600-\u06FF]")


def detect_language_style(text: str) -> str:
    """Return 'ur' (Urdu script), 'roman_ur' (Roman Urdu), or 'en'."""
    if _URDU_SCRIPT.search(text):
        return "ur"
    words = re.findall(r"[a-zA-Z']+", text.lower())
    if words:
        roman_hits = sum(1 for w in words if w in _ROMAN_URDU_TOKENS)
        if roman_hits >= 2 or (roman_hits / len(words)) >= 0.25:
            return "roman_ur"
    return "en"


class ContextSource(Protocol):
    """Data access needed to assemble a request context.

    Implementations typically share one AsyncSession per request — do not call
    these methods concurrently on the same session.
    """

    async def load_profile(self, user_id: str) -> dict[str, Any]: ...
    async def load_goals(self, user_id: str) -> list[dict[str, Any]]: ...
    async def load_preferences(self, user_id: str) -> dict[str, Any]: ...
    async def load_recent_messages(self, session_id: str, limit: int) -> list[dict[str, Any]]: ...
    async def load_summary(self, session_id: str) -> str | None: ...
    async def load_document_ids(self, user_id: str) -> list[str]: ...


class EmptyContextSource:
    """Default source returning empty data (used until modules are migrated)."""

    async def load_profile(self, user_id: str) -> dict[str, Any]:
        return {}

    async def load_goals(self, user_id: str) -> list[dict[str, Any]]:
        return []

    async def load_preferences(self, user_id: str) -> dict[str, Any]:
        return {}

    async def load_recent_messages(self, session_id: str, limit: int) -> list[dict[str, Any]]:
        return []

    async def load_summary(self, session_id: str) -> str | None:
        return None

    async def load_document_ids(self, user_id: str) -> list[str]:
        return []


class ContextBuilder:
    def __init__(self, source: ContextSource | None = None, *, recent_messages_limit: int = 10) -> None:
        self._source = source or EmptyContextSource()
        self._recent_limit = recent_messages_limit

    async def build(
        self,
        *,
        user_id: str,
        session_id: str,
        message: str,
        intent: str | None = None,
        source: ContextSource | None = None,
    ) -> RequestContext:
        src = source or self._source
        # Sequential on purpose — AsyncSession is not safe for asyncio.gather.
        profile = await src.load_profile(user_id)
        goals = await src.load_goals(user_id)
        preferences = await src.load_preferences(user_id)
        recent_messages = await src.load_recent_messages(session_id, self._recent_limit)
        summary = await src.load_summary(session_id)
        document_ids = await src.load_document_ids(user_id)
        return RequestContext(
            user_id=user_id,
            session_id=session_id,
            message=message,
            language_style=detect_language_style(message),
            intent=intent,
            profile=profile,
            goals=goals,
            preferences=preferences,
            recent_messages=recent_messages,
            conversation_summary=summary,
            document_ids=document_ids,
        )

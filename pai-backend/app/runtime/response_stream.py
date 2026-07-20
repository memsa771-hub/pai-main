"""SSE response streaming helpers (CLAUDE.md section 22).

Formats orchestrator progress into Server-Sent Events with the documented event
types: ``status``, ``token``, ``metadata``, ``complete`` and ``error``. The user
sees useful progress quickly (status events are emitted before the slow AI call),
then the reply is delivered progressively as ``token`` events.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any, Literal

StreamEventName = Literal["status", "token", "metadata", "complete", "error"]


@dataclass(slots=True)
class StreamEvent:
    event: StreamEventName
    data: dict[str, Any] = field(default_factory=dict)


def format_sse(event: StreamEvent) -> str:
    """Serialize a StreamEvent into the SSE wire format."""
    payload = json.dumps(event.data, ensure_ascii=False)
    return f"event: {event.event}\ndata: {payload}\n\n"


def chunk_reply(text: str, *, words_per_chunk: int = 4) -> Iterator[str]:
    """Yield the reply in small chunks so the client can render it progressively.

    Whitespace is preserved by splitting on it and re-attaching, so concatenating
    all chunks reproduces the original text exactly.
    """
    if not text:
        return
    tokens = text.split(" ")
    buffer: list[str] = []
    for i, token in enumerate(tokens):
        buffer.append(token)
        if len(buffer) >= words_per_chunk:
            # Re-add the separating spaces; append a trailing space except at end.
            piece = " ".join(buffer)
            if i != len(tokens) - 1:
                piece += " "
            yield piece
            buffer = []
    if buffer:
        yield " ".join(buffer)


# Status messages shown per intent while the primary agent works.
STATUS_BY_INTENT: dict[str, str] = {
    "university_research": "Reviewing verified university information",
    "scholarship_research": "Checking official scholarship sources",
    "tracker_request": "Reviewing your tracked universities",
    "local_admission": "Calculating your merit from published criteria",
    "international_admission": "Reviewing admission requirements",
    "matching_request": "Scoring your best-fit programs",
    "career_guidance": "Thinking about your options",
    "general_counselling": "Thinking it through",
    "casual": "Typing",
}


def status_for_intent(intent: str | None) -> str:
    return STATUS_BY_INTENT.get(intent or "", "Thinking it through")

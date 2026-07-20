"""Research result schemas (CLAUDE.md sections 10.5, 16).

Every important fact carries its provenance so nothing is presented as fact
without a traceable source: ``source_url``, ``source_type``, ``last_verified_at``,
``valid_for_intake``, ``confidence`` and ``expires_at``.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ResearchKind = Literal["university", "scholarship"]


class SourceMeta(BaseModel):
    source_url: str
    source_type: str
    last_verified_at: str
    valid_for_intake: str | None = None
    confidence: float = 0.5
    expires_at: str | None = None
    title: str | None = None


class ResearchResult(BaseModel):
    """A researched answer: a natural summary plus structured, sourced facts."""

    model_config = ConfigDict(extra="ignore")

    kind: ResearchKind
    subject: str
    summary: str
    facts: dict[str, Any] = Field(default_factory=dict)
    sources: list[SourceMeta] = Field(default_factory=list)
    confidence: float = 0.0
    status: Literal["verified", "unverified", "unavailable"] = "unavailable"

    def cache_payload(self) -> str:
        return self.model_dump_json()

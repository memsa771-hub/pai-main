"""Standard agent contract (CLAUDE.md section 9).

Defines the single result schema every agent returns and the protocol every
agent implements. A single agent response carries everything the frontend
needs — the reply, structured data, quick replies, profile/goal updates,
sources and the next action — so there is never a separate AI call just to
produce quick replies, and never a separate "response agent".
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Literal, Protocol, runtime_checkable

from pydantic import BaseModel, Field

from app.runtime.context import RequestContext

AgentStatus = Literal["success", "needs_input", "failed"]


class QuickReply(BaseModel):
    label: str
    value: str


class SourceReference(BaseModel):
    title: str
    url: str
    source_type: str
    verified_at: str | None = None


class AgentResult(BaseModel):
    agent: str
    intent: str
    status: AgentStatus
    reply: str
    data: dict[str, Any] = Field(default_factory=dict)
    profile_updates: dict[str, Any] = Field(default_factory=dict)
    goal_updates: list[dict[str, Any]] = Field(default_factory=list)
    quick_replies: list[QuickReply] = Field(default_factory=list)
    sources: list[SourceReference] = Field(default_factory=list)
    next_action: str | None = None
    error_code: str | None = None


@runtime_checkable
class Agent(Protocol):
    """Structural type every agent satisfies."""

    name: str

    async def run(self, context: RequestContext) -> AgentResult: ...


class BaseAgent(ABC):
    """Convenience base class for concrete agents.

    Provides the agent `name` and small helpers for building consistent
    `AgentResult` objects. Agents must never call other agents directly
    (CLAUDE.md section 6.4); coordination belongs to the orchestrator.
    """

    #: Stable identifier used by the registry and logs (override in subclasses).
    name: str = "base"

    @abstractmethod
    async def run(self, context: RequestContext) -> AgentResult:  # pragma: no cover - interface
        ...

    def _result(
        self,
        *,
        intent: str,
        reply: str,
        status: AgentStatus = "success",
        data: dict[str, Any] | None = None,
        profile_updates: dict[str, Any] | None = None,
        goal_updates: list[dict[str, Any]] | None = None,
        quick_replies: list[QuickReply] | None = None,
        sources: list[SourceReference] | None = None,
        next_action: str | None = None,
        error_code: str | None = None,
    ) -> AgentResult:
        """Build an AgentResult already stamped with this agent's name."""
        return AgentResult(
            agent=self.name,
            intent=intent,
            status=status,
            reply=reply,
            data=data or {},
            profile_updates=profile_updates or {},
            goal_updates=goal_updates or [],
            quick_replies=quick_replies or [],
            sources=sources or [],
            next_action=next_action,
            error_code=error_code,
        )

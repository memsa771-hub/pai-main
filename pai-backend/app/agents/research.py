"""Research agent (CLAUDE.md section 10.5).

Handles university / program / scholarship research. It does not talk to SerpAPI
directly — it delegates to the ResearchService (cache-first, official-source
first) and shapes the verified, sourced result into a single AgentResult. Every
fact returned to the student carries its source metadata.
"""

from __future__ import annotations

from app.agents.base import AgentResult, BaseAgent, SourceReference
from app.core.logging import get_logger
from app.modules.research.service import ResearchService
from app.runtime.context import RequestContext

logger = get_logger(__name__)


class ResearchAgent(BaseAgent):
    name = "research"

    def __init__(self, *, research_service: ResearchService) -> None:
        self._research = research_service

    async def run(self, context: RequestContext) -> AgentResult:
        kind = "scholarship" if context.intent == "scholarship_research" else "university"
        profile = context.profile or {}
        hints = {
            "target_country": profile.get("intended_destination"),
            "preferred_field": profile.get("preferred_field"),
        }

        result = await self._research.research(kind, context.message, profile_hints=hints)

        sources = [
            SourceReference(
                title=s.title or s.source_url,
                url=s.source_url,
                source_type=s.source_type,
                verified_at=s.last_verified_at,
            )
            for s in result.sources
        ]

        status = "needs_input" if result.status == "unavailable" else "success"
        return self._result(
            intent=context.intent or f"{kind}_research",
            reply=result.summary,
            status=status,
            data={
                "facts": result.facts,
                "confidence": result.confidence,
                "verification": result.status,
            },
            sources=sources,
        )

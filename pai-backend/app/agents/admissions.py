"""Admissions agent (CLAUDE.md section 10.4).

Handles local/international admissions and merit. For local-admission merit it
delegates to the deterministic `AdmissionsService` (Python merit engine) and
shapes the explainable result into a single AgentResult. It asks for a missing
score instead of inventing one (status="needs_input").
"""

from __future__ import annotations

from app.agents.base import AgentResult, BaseAgent, QuickReply, SourceReference
from app.core.logging import get_logger
from app.modules.admissions.service import AdmissionsService
from app.runtime.context import RequestContext

logger = get_logger(__name__)


class AdmissionsAgent(BaseAgent):
    name = "admissions"

    def __init__(self, *, admissions_service: AdmissionsService) -> None:
        self._admissions = admissions_service

    async def run(self, context: RequestContext) -> AgentResult:
        result = await self._admissions.calculate_local_merit(
            message=context.message, profile=context.profile or {}
        )

        if result.status == "unknown_university":
            return self._result(
                intent=context.intent or "local_admission",
                reply=(
                    "Which university's merit would you like me to calculate? "
                    "I currently have verified formulas for FAST NUCES, NUST, GIKI and UET."
                ),
                status="needs_input",
                quick_replies=[
                    QuickReply(label="FAST NUCES", value="Calculate my FAST NUCES merit"),
                    QuickReply(label="NUST", value="Calculate my NUST merit"),
                    QuickReply(label="GIKI", value="Calculate my GIKI merit"),
                    QuickReply(label="UET", value="Calculate my UET merit"),
                ],
            )

        status = "needs_input" if result.status in ("needs_input", "no_formula") else "success"
        sources = []
        if result.formula and result.formula.source_url:
            sources.append(
                SourceReference(
                    title=f"{result.university} merit criteria",
                    url=result.formula.source_url,
                    source_type="official_university",
                    verified_at=result.formula.verified_at,
                )
            )

        return self._result(
            intent=context.intent or "local_admission",
            reply=result.explanation,
            status=status,
            data={
                "university": result.university,
                "program_group": result.program_group,
                "aggregate": result.aggregate,
                "breakdown": [b.model_dump() for b in result.breakdown],
                "missing_components": result.missing_components,
                "assumptions": result.assumptions,
            },
            sources=sources,
        )

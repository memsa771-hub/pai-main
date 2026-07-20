"""Matching agent (CLAUDE.md sections 10.6, 18).

Produces ranked university/program recommendations using the deterministic
matching engine. The reply is composed in Python from the explainable scores —
the LLM never assigns match scores or admission probability.

Candidate programs are provided per-request via ``context.cached_data
["match_candidates"]`` (today from the student's tracked universities).
"""

from __future__ import annotations

from app.agents.base import AgentResult, BaseAgent, QuickReply
from app.core.logging import get_logger
from app.modules.recommendations.schemas import CandidateProgram
from app.modules.recommendations.service import MatchingService
from app.runtime.context import RequestContext

logger = get_logger(__name__)

_CATEGORY_LABEL = {
    "safe": "Safe",
    "strong_match": "Strong match",
    "ambitious": "Ambitious",
    "not_currently_eligible": "Not yet eligible",
}


class MatchingAgent(BaseAgent):
    name = "matching"

    def __init__(self, *, matching_service: MatchingService) -> None:
        self._matching = matching_service

    async def run(self, context: RequestContext) -> AgentResult:
        raw_candidates = context.cached_data.get("match_candidates") or []
        candidates = [
            c if isinstance(c, CandidateProgram) else CandidateProgram.model_validate(c)
            for c in raw_candidates
            if isinstance(c, (CandidateProgram, dict))
        ]

        if not candidates:
            return self._result(
                intent=context.intent or "matching_request",
                reply=(
                    "I don't have any target programs to compare yet. Add a few "
                    "universities to your tracker (or tell me which ones you're "
                    "considering) and I'll rank how well each fits your profile."
                ),
                status="needs_input",
                quick_replies=[QuickReply(label="Suggest destinations", value="Which countries suit my profile?")],
            )

        recommendations = self._matching.recommend(context.profile or {}, candidates)
        reply = _compose_reply(recommendations)

        return self._result(
            intent=context.intent or "matching_request",
            reply=reply,
            data={
                "recommendations": [r.model_dump() for r in recommendations],
                "scoring_version": _scoring_version(),
            },
        )


def _compose_reply(recommendations) -> str:  # type: ignore[no-untyped-def]
    if not recommendations:
        return "I couldn't score any of your target programs yet."
    lines = ["Here's how your target programs rank for your profile:\n"]
    for i, r in enumerate(recommendations, 1):
        label = _CATEGORY_LABEL.get(r.category, r.category)
        top_reason = r.reasons[0] if r.reasons else ""
        line = f"{i}. {r.university} — {r.match_score}/100 ({label})"
        if top_reason:
            line += f" — {top_reason}"
        lines.append(line)
        if r.missing_requirements:
            lines.append(f"   To improve: {r.missing_requirements[0]}")
    lines.append("\nScores are computed deterministically from your academics, fit, budget and funding.")
    return "\n".join(lines)


def _scoring_version() -> str:
    from app.modules.recommendations import config

    return config.SCORING_VERSION

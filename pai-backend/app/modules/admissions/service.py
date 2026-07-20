"""Admissions service (CLAUDE.md section 17).

Implements the required flow:

    extract university -> resolve aliases -> check saved verified formula ->
    research official formula if missing -> convert to structured components ->
    validate components -> get actual student marks -> calculate merit in Python
    -> explain result

The calculation itself is 100% deterministic Python (`merit_engine`). AI is used
only to parse an *unknown* university's researched formula text into structured
components — never to compute the merit and never to invent scores.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.exceptions import PAIError
from app.core.logging import get_logger
from app.integrations.ai.deepseek_client import DeepSeekClient
from app.modules.admissions import formulas as formula_store
from app.modules.admissions.aliases import resolve_alias
from app.modules.admissions.merit_engine import (
    calculate_merit,
    collect_marks_from_profile,
    validate_formula,
)
from app.modules.admissions.schemas import FormulaComponent, MeritFormula, MeritResult
from app.modules.research.service import ResearchService
from app.prompts.registry import PromptRegistry

logger = get_logger(__name__)

_COMPONENT_LABELS = {
    "admission_test": "entry-test score",
    "hssc": "HSSC / FSc / A-Level percentage",
    "ssc": "SSC / Matric / O-Level percentage",
    "bachelors": "bachelor's percentage/CGPA",
    "interview": "interview score",
}


class AdmissionsService:
    def __init__(
        self,
        *,
        deepseek: DeepSeekClient,
        prompts: PromptRegistry,
        research_service: ResearchService | None = None,
    ) -> None:
        self._deepseek = deepseek
        self._prompts = prompts
        self._research = research_service

    async def calculate_local_merit(
        self, *, message: str, profile: dict[str, Any]
    ) -> MeritResult:
        # 1-2. Extract + resolve the target university.
        university = resolve_alias(message) or self._university_from_profile(profile)
        if not university:
            return MeritResult(status="unknown_university")

        # 3. Saved verified formula first; 4. research + parse if missing.
        formula = formula_store.get_saved_formula(university)
        if formula is None:
            formula = await self._research_formula(university)
        if formula is None:
            result = MeritResult(status="no_formula", university=university)
            result.explanation = (
                f"I couldn't find a verified merit formula for {university} yet."
            )
            return result

        # 5. Validate components before use.
        problems = validate_formula(formula)
        if problems:
            logger.warning(
                "merit_formula_invalid",
                extra={"university": university, "problems": problems},
            )
            return MeritResult(
                status="no_formula",
                university=university,
                explanation=f"The merit formula for {university} needs verification.",
            )

        # 6. Gather the student's actual marks (never invent test scores).
        marks, assumptions = collect_marks_from_profile(profile)

        # 7. Deterministic calculation in Python.
        result = calculate_merit(formula, marks)
        result.assumptions = assumptions

        # 8. Explain the result.
        result.explanation = self._explain(result)
        logger.info(
            "merit_calculated",
            extra={
                "university": university,
                "status": result.status,
                "aggregate": result.aggregate,
                "missing": result.missing_components,
            },
        )
        return result

    async def _research_formula(self, university: str) -> MeritFormula | None:
        if self._research is None:
            return None
        research = await self._research.research(
            "university", f"{university} admission merit aggregate formula weightage"
        )
        if research.status == "unavailable" or not research.summary:
            return None
        # Feed researched text to the parser (single AI call).
        research_text = research.summary
        facts = research.facts or {}
        if facts:
            research_text += "\n" + "\n".join(f"{k}: {v}" for k, v in facts.items())
        try:
            data = await self._deepseek.complete_json(
                [
                    {
                        "role": "system",
                        "content": self._prompts.render(
                            "admissions/parse_formula",
                            university=university,
                            research_text=research_text,
                        ),
                    }
                ],
                temperature=0.1,
            )
        except PAIError:
            return None

        raw_components = data.get("components") if isinstance(data.get("components"), list) else []
        components: list[FormulaComponent] = []
        for item in raw_components:
            if isinstance(item, dict):
                try:
                    components.append(FormulaComponent.model_validate(item))
                except Exception:  # noqa: BLE001
                    continue
        if not components:
            return None

        source = research.sources[0] if research.sources else None
        return MeritFormula(
            university=university,
            program_group=str(data.get("program_group") or "General"),
            components=components,
            valid_for_intake=str(data.get("valid_for_intake") or "") or None,
            source_url=source.source_url if source else None,
            verified_at=datetime.now(timezone.utc).isoformat(),
            confidence=float(data.get("confidence") or 0.5),
            verified=bool(source and source.source_type != "secondary"),
        )

    @staticmethod
    def _university_from_profile(profile: dict[str, Any]) -> str | None:
        dest = profile.get("intended_destination")
        return resolve_alias(str(dest)) if dest else None

    @staticmethod
    def _explain(result: MeritResult) -> str:
        if result.status == "needs_input":
            needs = ", ".join(
                _COMPONENT_LABELS.get(name, name) for name in result.missing_components
            )
            uni = result.university or "this university"
            return (
                f"To calculate your {uni} aggregate I still need your {needs}. "
                "Share it (as a percentage) and I'll compute your merit instantly — "
                "I won't guess your test score."
            )
        if result.status == "calculated" and result.formula is not None:
            parts = [
                f"{b.name} {b.mark}% × {int(b.weight * 100)}% = {round(b.contribution, 2)}"
                for b in result.breakdown
            ]
            formula_desc = " + ".join(parts)
            src = f" (source: {result.formula.source_url})" if result.formula.source_url else ""
            note = ""
            if result.assumptions:
                note = " Note: " + "; ".join(result.assumptions) + "."
            return (
                f"Your estimated {result.university} aggregate is "
                f"**{result.aggregate}%** for {result.program_group}.\n"
                f"Formula: {formula_desc}.{note}\n"
                f"Based on {result.university}'s published weightage{src}. "
                "Final merit depends on the year's closing merit."
            )
        return result.explanation or "I couldn't complete the merit calculation."

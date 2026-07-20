"""Document extraction service (CLAUDE.md sections 10.3, 24).

A single AI call turns raw document text into structured data, which is then
applied through the SAME validated, conflict-aware enrichment pipeline used for
conversation (`ProfileEnrichmentService`). This guarantees:

- one AI call per document,
- extracted data is validated before it touches the database,
- existing verified data is never silently overwritten (conflicts recorded),
- profile + goals are enriched transactionally.

Persistent `document_extractions` storage arrives with the async DB migration
(Step 20); for now the extraction summary is logged and returned to the caller.
"""

from __future__ import annotations

from typing import Any

from app.core.exceptions import PAIError
from app.core.logging import get_logger
from app.integrations.ai.deepseek_client import DeepSeekClient
from app.modules.documents.schemas import ExtractionSummary, TestScore
from app.modules.profiles.service import ProfileEnrichmentService
from app.prompts.registry import PromptRegistry

logger = get_logger(__name__)

# Cap the text sent to the model so a huge document can't blow the context/cost.
_MAX_TEXT_CHARS = 16000


class DocumentExtractionService:
    def __init__(
        self,
        *,
        deepseek: DeepSeekClient,
        prompts: PromptRegistry,
        enrichment: ProfileEnrichmentService,
    ) -> None:
        self._deepseek = deepseek
        self._prompts = prompts
        self._enrichment = enrichment

    async def extract_and_apply(
        self, *, user_id: str, raw_text: str, declared_type: str
    ) -> ExtractionSummary:
        if not raw_text or not raw_text.strip():
            logger.info("document_extract_skipped_empty", extra={"user_id": user_id})
            return ExtractionSummary(status="draft")

        prompt = self._prompts.render(
            "documents/extract_profile",
            raw_text=raw_text[:_MAX_TEXT_CHARS],
            declared_type=declared_type,
        )

        try:
            data = await self._deepseek.complete_json(
                [{"role": "system", "content": prompt}], temperature=0.1
            )
        except PAIError as exc:
            logger.warning(
                "document_extract_ai_failed",
                extra={"user_id": user_id, "error_code": getattr(exc, "error_code", None)},
            )
            return ExtractionSummary(status="draft")

        if not isinstance(data, dict):
            return ExtractionSummary(status="draft")

        profile_updates = data.get("profile") if isinstance(data.get("profile"), dict) else {}
        goal_updates = [g for g in data.get("goals") or [] if isinstance(g, dict)]

        # Validation + conflict-aware persistence happen inside the enrichment
        # service (it defensively drops malformed fields/goals).
        result = await self._enrichment.apply(user_id, profile_updates, goal_updates)

        summary = ExtractionSummary(
            document_class=_as_str(data.get("document_class")),
            confidence=_as_float(data.get("confidence"), default=0.5),
            applied_fields=result.applied_fields,
            added_goals=result.added_goals,
            enriched_goals=result.enriched_goals,
            conflicts=len(result.conflicts),
            test_scores=_parse_test_scores(data.get("test_scores")),
            status="completed",
        )
        logger.info(
            "document_extracted",
            extra={
                "user_id": user_id,
                "document_class": summary.document_class,
                "confidence": summary.confidence,
                "applied": summary.applied_fields,
                "added_goals": summary.added_goals,
                "conflicts": summary.conflicts,
            },
        )
        return summary


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_float(value: Any, *, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_test_scores(raw: Any) -> list[TestScore]:
    if not isinstance(raw, list):
        return []
    scores: list[TestScore] = []
    for item in raw:
        if isinstance(item, dict):
            try:
                scores.append(TestScore.model_validate(item))
            except Exception:  # noqa: BLE001
                continue
    return scores

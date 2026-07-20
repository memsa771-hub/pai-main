"""Profile & goal enrichment service (CLAUDE.md sections 8, 13).

Business rules for applying profile/goal updates:

- Validate every update through Pydantic.
- Fill empty fields; NEVER silently overwrite existing non-empty data — record a
  conflict instead (section 8, section 24).
- Merge list fields (skills/languages) as unions; de-duplicate education, work
  and projects by signature.
- Store goals as structured records, enriching existing goals and adding new
  ones, with timestamps/status/source.
- Persist everything in a single transaction via the repository.

Implements the orchestrator's `ProfileWriter` port: `apply(user_id, ...)`.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from app.core.logging import get_logger
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.schemas import (
    SCALAR_FIELDS,
    EnrichmentResult,
    FieldConflict,
    GoalUpdate,
    ProfileUpdate,
)

logger = get_logger(__name__)

_GOAL_MATCH_FIELDS = ("goal_type", "target_country", "target_degree_level")
_GOAL_ENRICH_FIELDS = (
    "target_country",
    "target_city",
    "target_university",
    "target_program",
    "target_degree_level",
    "career_target",
    "funding_preference",
    "budget",
    "preferred_intake",
    "status",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm(value: Any) -> str:
    return str(value or "").strip().lower()


def _merge_unique(existing: list[str], incoming: list[str]) -> list[str]:
    seen = {_norm(x) for x in existing}
    merged = list(existing)
    for item in incoming:
        if item and _norm(item) not in seen:
            merged.append(item)
            seen.add(_norm(item))
    return merged


class ProfileEnrichmentService:
    def __init__(self, repository: ProfileRepository) -> None:
        self._repo = repository

    async def apply(
        self,
        user_id: str,
        profile_updates: dict[str, Any] | None,
        goal_updates: list[dict[str, Any]] | None,
    ) -> EnrichmentResult:
        try:
            pu = ProfileUpdate.model_validate(profile_updates or {})
        except ValidationError:
            logger.warning("invalid_profile_updates", extra={"user_id": user_id})
            pu = ProfileUpdate()

        goals_in: list[GoalUpdate] = []
        for raw in goal_updates or []:
            if not isinstance(raw, dict):
                continue
            try:
                goals_in.append(GoalUpdate.model_validate(raw))
            except ValidationError:
                # Skip malformed goals (e.g. unknown goal_type) rather than fail.
                continue

        snap = await self._repo.snapshot()
        result = EnrichmentResult()

        # --- Scalars: fill-empty, else record conflict ---
        scalar_changes: dict[str, str] = {}
        for field in SCALAR_FIELDS:
            incoming = getattr(pu, field, None)
            if incoming is None or str(incoming).strip() == "":
                continue
            existing = snap["scalars"].get(field)
            if not existing or str(existing).strip() == "":
                scalar_changes[field] = str(incoming).strip()
                result.applied_fields.append(field)
            elif _norm(existing) != _norm(incoming):
                result.conflicts.append(
                    FieldConflict(
                        scope="profile",
                        field=field,
                        existing=str(existing),
                        incoming=str(incoming),
                    )
                )

        # --- List fields: union merge ---
        skills_final: list[str] | None = None
        if pu.skills:
            merged = _merge_unique(snap["skills"], pu.skills)
            if merged != snap["skills"]:
                skills_final = merged
                result.applied_fields.append("skills")

        languages_final: list[str] | None = None
        if pu.languages:
            merged = _merge_unique(snap["languages"], pu.languages)
            if merged != snap["languages"]:
                languages_final = merged
                result.applied_fields.append("languages")

        # --- Education / work / projects: de-dupe and add ---
        new_education = [
            e.model_dump()
            for e in pu.education
            if e.degree and e.school and (_norm(e.degree), _norm(e.school)) not in snap["education_sigs"]
        ]
        new_work = [
            w.model_dump()
            for w in pu.work_experience
            if w.role and w.company and (_norm(w.role), _norm(w.company)) not in snap["work_sigs"]
        ]
        new_projects = [
            p.model_dump()
            for p in pu.projects
            if p.name and _norm(p.name) not in snap["project_names"]
        ]
        if new_education:
            result.applied_fields.append(f"education(+{len(new_education)})")
        if new_work:
            result.applied_fields.append(f"work_experience(+{len(new_work)})")
        if new_projects:
            result.applied_fields.append(f"projects(+{len(new_projects)})")

        # --- Goals: structured merge ---
        goals_final, goals_changed = self._merge_goals(snap["goals"], goals_in, result)

        changed = bool(
            scalar_changes
            or skills_final is not None
            or languages_final is not None
            or new_education
            or new_work
            or new_projects
            or goals_changed
        )
        if changed:
            await self._repo.save(
                scalars=scalar_changes,
                skills=skills_final,
                languages=languages_final,
                goals=goals_final if goals_changed else None,
                new_education=new_education,
                new_work=new_work,
                new_projects=new_projects,
            )

        logger.info(
            "profile_enriched",
            extra={
                "user_id": user_id,
                "applied": result.applied_fields,
                "added_goals": result.added_goals,
                "enriched_goals": result.enriched_goals,
                "conflicts": len(result.conflicts),
            },
        )
        return result

    def _merge_goals(
        self,
        existing_raw: list[Any],
        incoming: list[GoalUpdate],
        result: EnrichmentResult,
    ) -> tuple[list[dict[str, Any]], bool]:
        # Preserve any legacy string goals untouched; only structured dicts merge.
        goals: list[dict[str, Any]] = [g for g in existing_raw if isinstance(g, dict)]
        legacy_strings = [g for g in existing_raw if not isinstance(g, dict)]
        changed = False

        for goal in incoming:
            if goal.goal_type is None:
                continue
            data = goal.model_dump(exclude_none=True)
            match = self._find_matching_goal(goals, data)
            if match is None:
                data.setdefault("status", "active")
                data.setdefault("confidence", 0.7)
                data.setdefault("source", "conversation")
                data["created_at"] = _now()
                data["updated_at"] = _now()
                goals.append(data)
                result.added_goals += 1
                changed = True
            else:
                if self._enrich_goal(match, data, result):
                    result.enriched_goals += 1
                    changed = True

        return goals + legacy_strings, changed

    @staticmethod
    def _find_matching_goal(
        goals: list[dict[str, Any]], incoming: dict[str, Any]
    ) -> dict[str, Any] | None:
        for goal in goals:
            if all(_norm(goal.get(f)) == _norm(incoming.get(f)) for f in _GOAL_MATCH_FIELDS):
                return goal
        return None

    @staticmethod
    def _enrich_goal(
        existing: dict[str, Any], incoming: dict[str, Any], result: EnrichmentResult
    ) -> bool:
        changed = False
        for field in _GOAL_ENRICH_FIELDS:
            new_val = incoming.get(field)
            if not new_val:
                continue
            cur_val = existing.get(field)
            if not cur_val:
                existing[field] = new_val
                changed = True
            elif _norm(cur_val) != _norm(new_val):
                result.conflicts.append(
                    FieldConflict(
                        scope="goal",
                        field=field,
                        existing=str(cur_val),
                        incoming=str(new_val),
                    )
                )
        if changed:
            existing["updated_at"] = _now()
        return changed

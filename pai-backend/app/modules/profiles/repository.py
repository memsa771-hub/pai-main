"""Profile repository backed by AsyncSession (SQLAlchemy 2 + asyncpg).

Reads a snapshot of the student's current profile and persists all staged
changes in a single transaction (one commit per enrichment, per CLAUDE.md
section 20).
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app import models


def _parse_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
        return value if isinstance(value, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


class ProfileRepository:
    def __init__(self, db: AsyncSession, user: models.User) -> None:
        self._db = db
        self._user = user

    async def snapshot(self) -> dict[str, Any]:
        from app.modules.profiles.schemas import SCALAR_FIELDS

        u = self._user
        return {
            "scalars": {field: getattr(u, field, None) for field in SCALAR_FIELDS},
            "skills": _parse_list(u.skills),
            "languages": _parse_list(u.languages),
            "goals": _parse_list(u.goals),
            "education_sigs": {
                (str(e.degree or "").lower(), str(e.school or "").lower())
                for e in (u.education or [])
            },
            "work_sigs": {
                (str(w.role or "").lower(), str(w.company or "").lower())
                for w in (u.work_experience or [])
            },
            "project_names": {str(p.name or "").lower() for p in (u.projects or [])},
        }

    async def save(
        self,
        *,
        scalars: dict[str, str],
        skills: list[str] | None,
        languages: list[str] | None,
        goals: list[dict[str, Any]] | None,
        new_education: list[dict[str, Any]],
        new_work: list[dict[str, Any]],
        new_projects: list[dict[str, Any]],
    ) -> None:
        db, u = self._db, self._user

        for field, value in scalars.items():
            setattr(u, field, value)
        if skills is not None:
            u.skills = json.dumps(skills)
        if languages is not None:
            u.languages = json.dumps(languages)
        if goals is not None:
            u.goals = json.dumps(goals)

        for edu in new_education:
            db.add(
                models.Education(
                    user_id=u.id,
                    degree=edu.get("degree"),
                    school=edu.get("school"),
                    major=edu.get("major"),
                    period=edu.get("period"),
                    graduation_year=edu.get("graduation_year"),
                    gpa=edu.get("gpa"),
                    details=edu.get("details"),
                )
            )
        for work in new_work:
            achievements = work.get("achievements") or []
            db.add(
                models.WorkExperience(
                    user_id=u.id,
                    role=work.get("role"),
                    company=work.get("company"),
                    period=work.get("period"),
                    start_date=work.get("start_date"),
                    end_date=work.get("end_date") or "Present",
                    description=work.get("description"),
                    achievements=json.dumps(achievements) if achievements else "[]",
                )
            )
        for proj in new_projects:
            db.add(
                models.Project(
                    user_id=u.id,
                    name=proj.get("name"),
                    description=proj.get("description"),
                    link_or_credential=proj.get("link_or_credential"),
                )
            )

        await db.commit()
        await db.refresh(u)

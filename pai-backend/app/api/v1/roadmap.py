"""Student roadmap router — migrated onto the async (asyncpg) data layer.

Uses `AsyncSession` + SQLAlchemy 2.0 `select()` with `selectinload` for the
section→steps relationship (no lazy loading under async). Response shapes are
unchanged so the frontend contract is preserved.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import models, schemas
from app.infrastructure.database import get_async_db
from app.core.security import get_current_user_async

router = APIRouter(prefix="/api/roadmap", tags=["Student Roadmap"])


class StepToggleRequest(BaseModel):
    university: str
    section_index: int
    step_id: str


@router.get("", response_model=List[schemas.UniversityRoadmapResponse])
async def get_roadmaps(
    current_user: models.User = Depends(get_current_user_async),
    session: AsyncSession = Depends(get_async_db),
):
    result = await session.execute(
        select(models.RoadmapSection)
        .where(models.RoadmapSection.user_id == current_user.id)
        .order_by(models.RoadmapSection.university, models.RoadmapSection.number.asc())
        .options(selectinload(models.RoadmapSection.steps))
    )
    sections = result.scalars().all()

    roadmaps_dict: dict = {}
    for sec in sections:
        uni = sec.university
        if uni not in roadmaps_dict:
            roadmaps_dict[uni] = {
                "university": uni,
                "degree": sec.degree,
                "term": sec.term,
                "progress": sec.progress,
                "sections": [],
            }
        steps_sorted = sorted(sec.steps, key=lambda s: s.id)
        roadmaps_dict[uni]["sections"].append(
            {
                "number": sec.number,
                "title": sec.title,
                "steps": [
                    {
                        "id": step.id,
                        "title": step.title,
                        "description": step.description,
                        "status": step.status,
                        "priority": step.priority,
                        "type": step.type,
                    }
                    for step in steps_sorted
                ],
            }
        )

    return list(roadmaps_dict.values())


async def _section(session: AsyncSession, user_id: int, university: str, number: int):
    result = await session.execute(
        select(models.RoadmapSection)
        .where(
            models.RoadmapSection.user_id == user_id,
            models.RoadmapSection.university == university,
            models.RoadmapSection.number == number,
        )
        .options(selectinload(models.RoadmapSection.steps))
    )
    return result.scalar_one_or_none()


@router.post("/step/toggle")
async def toggle_step(
    payload: StepToggleRequest,
    current_user: models.User = Depends(get_current_user_async),
    session: AsyncSession = Depends(get_async_db),
):
    section = await _section(session, current_user.id, payload.university, payload.section_index + 1)
    if not section:
        raise HTTPException(status_code=404, detail="Roadmap section not found")

    step = next((s for s in section.steps if s.id == payload.step_id), None)
    if not step:
        raise HTTPException(status_code=404, detail="Roadmap step not found")

    # State transitions: not_started -> started -> completed.
    if step.status == "not_started":
        step.status = "started"
        await session.commit()
    elif step.status == "started":
        step.status = "completed"
        await session.commit()

        # Unlock the next step in this section, or the first step of the next one.
        all_steps = sorted(section.steps, key=lambda s: s.id)
        step_idx = next((i for i, s in enumerate(all_steps) if s.id == step.id), -1)
        if 0 <= step_idx and step_idx + 1 < len(all_steps):
            nxt = all_steps[step_idx + 1]
            if nxt.status == "locked":
                nxt.status = "not_started"
                await session.commit()
        else:
            next_section = await _section(
                session, current_user.id, payload.university, section.number + 1
            )
            if next_section:
                nxt_steps = sorted(next_section.steps, key=lambda s: s.id)
                if nxt_steps and nxt_steps[0].status == "locked":
                    nxt_steps[0].status = "not_started"
                    await session.commit()

    # Recalculate progress across all sections of this university.
    result = await session.execute(
        select(models.RoadmapSection)
        .where(
            models.RoadmapSection.user_id == current_user.id,
            models.RoadmapSection.university == payload.university,
        )
        .options(selectinload(models.RoadmapSection.steps))
    )
    all_sections = result.scalars().all()

    total_steps = sum(len(sec.steps) for sec in all_sections)
    completed_steps = sum(
        1 for sec in all_sections for st in sec.steps if st.status == "completed"
    )
    progress = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0

    for sec in all_sections:
        sec.progress = progress
    await session.commit()

    return {"status": "success", "progress": progress}

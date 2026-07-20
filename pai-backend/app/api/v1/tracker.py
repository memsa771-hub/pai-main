"""University tracker — AsyncSession; no invented admissions stats (CLAUDE.md §6.7)."""

from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas
from app.infrastructure.database import get_async_db
from app.core.security import get_current_user_async

router = APIRouter(prefix="/api/tracker/universities", tags=["University Tracker"])


@router.get("", response_model=List[schemas.TrackedUniversityResponse])
async def get_tracked_universities(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.TrackedUniversity).where(
            models.TrackedUniversity.user_id == current_user.id
        )
    )
    return result.scalars().all()


@router.post("", response_model=schemas.TrackedUniversityResponse)
async def add_tracked_university(
    payload: schemas.TrackedUniversityCreate,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.TrackedUniversity).where(
            models.TrackedUniversity.user_id == current_user.id,
            models.TrackedUniversity.name == payload.name,
        )
    )
    dup = result.scalar_one_or_none()
    if dup:
        dup.status = payload.status
        await db.commit()
        await db.refresh(dup)
        return dup

    # Store only what the client provided — never invent GPA/GRE/acceptance rate.
    new_uni = models.TrackedUniversity(
        user_id=current_user.id,
        name=payload.name,
        location=payload.location,
        avg_gpa=payload.avg_gpa,
        avg_gre=payload.avg_gre,
        deadlines=payload.deadlines,
        status=payload.status,
        acceptance_rate=payload.acceptance_rate,
        reqs=json.dumps(payload.reqs) if payload.reqs else "[]",
    )
    db.add(new_uni)
    await db.commit()
    await db.refresh(new_uni)
    return new_uni


@router.delete("/{uni_id}")
async def delete_tracked_university(
    uni_id: int,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.TrackedUniversity).where(
            models.TrackedUniversity.id == uni_id,
            models.TrackedUniversity.user_id == current_user.id,
        )
    )
    uni = result.scalar_one_or_none()
    if not uni:
        raise HTTPException(status_code=404, detail="Tracked university not found")
    await db.delete(uni)
    await db.commit()
    return {"detail": "University track removed"}

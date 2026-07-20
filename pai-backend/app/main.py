import json

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.lifespan import lifespan
from app.core.security import get_current_user_async
from app.database import engine
from app.infrastructure.database import get_async_db

# Bootstrap tables on first boot (Alembic is the long-term source of truth).
models.Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Placement AI API Server!"}


async def _build_notifications(db: AsyncSession, user: models.User) -> list[dict]:
    """Deterministic dashboard alerts — no AI, no invented facts."""
    notifications: list[dict] = []
    missing: list[str] = []
    if not user.phone:
        missing.append("Phone Number")
    if not user.linkedin:
        missing.append("LinkedIn Profile")
    if not user.summary:
        missing.append("Professional Summary")
    skills: list = []
    try:
        if user.skills:
            skills = json.loads(user.skills)
    except Exception:  # noqa: BLE001
        pass
    if not skills:
        missing.append("Skills & Interests")
    if missing:
        notifications.append(
            {
                "id": f"notif-completeness-{len(missing)}",
                "text": (
                    f"Complete your profile: Missing {', '.join(missing[:2])} "
                    "to reach 100% completeness."
                ),
                "time": "Just now",
                "type": "warning",
            }
        )

    result = await db.execute(
        select(models.TrackedUniversity).where(
            models.TrackedUniversity.user_id == user.id
        )
    )
    for uni in result.scalars().all():
        if uni.deadlines:
            notifications.append(
                {
                    "id": f"notif-uni-deadline-{uni.id}",
                    "text": f"Upcoming application deadline for {uni.name}: {uni.deadlines}.",
                    "time": "Today",
                    "type": "info",
                }
            )

    pending = await db.execute(
        select(models.Document).where(
            models.Document.user_id == user.id,
            models.Document.status == "pending",
        )
    )
    for doc in pending.scalars().all():
        notifications.append(
            {
                "id": f"notif-doc-{doc.id}",
                "text": f"Document still processing: {doc.name}.",
                "time": "Today",
                "type": "info",
            }
        )
    return notifications


@app.get("/api/dashboard/summary")
async def get_dashboard_summary(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    fields_to_check = [
        current_user.full_name,
        current_user.phone,
        current_user.dob,
        current_user.gender,
        current_user.nationality,
        current_user.country,
        current_user.city,
        current_user.linkedin,
        current_user.current_education,
        current_user.current_status,
        current_user.summary,
    ]

    filled = sum(1 for f in fields_to_check if f and str(f).strip() != "")
    total = len(fields_to_check)

    skills_list = []
    try:
        if current_user.skills:
            skills_list = json.loads(current_user.skills)
    except Exception:  # noqa: BLE001
        pass
    if skills_list:
        filled += 1
    total += 1

    if current_user.education:
        filled += 1
    total += 1
    if current_user.work_experience:
        filled += 1
    total += 1

    completion_percentage = int((filled / total) * 100)

    saved_unis_count = (
        await db.execute(
            select(func.count())
            .select_from(models.TrackedUniversity)
            .where(models.TrackedUniversity.user_id == current_user.id)
        )
    ).scalar_one()

    uploaded_docs_count = (
        await db.execute(
            select(func.count())
            .select_from(models.Document)
            .where(models.Document.user_id == current_user.id)
        )
    ).scalar_one()

    recent_result = await db.execute(
        select(models.ChatSession)
        .where(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.updated_at.desc())
        .limit(3)
    )
    recent_chats = [
        {
            "id": s.id,
            "title": s.title,
            "time": s.updated_at.strftime("%I:%M %p") if s.updated_at else "",
        }
        for s in recent_result.scalars().all()
    ]

    return {
        "completion_percentage": completion_percentage,
        "saved_unis_count": saved_unis_count,
        "uploaded_docs_count": uploaded_docs_count,
        "recent_chats": recent_chats,
        "recent_activity": await _build_notifications(db, current_user),
    }

"""Consultant chat router — AsyncSession + modules/conversations (CLAUDE.md §4).

All intents use the new single-call runtime. Public routes/shapes unchanged.
"""

from __future__ import annotations

import datetime
import json
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas
from app.core.security import get_current_user_async
from app.infrastructure.database import get_async_db
from app.modules.conversations.repository import ConversationRepository
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.service import ProfileEnrichmentService
from app.modules.recommendations.service import MatchingService
from app.runtime.intent_router import RouteDecision, classify_rules
from app.runtime.response_stream import StreamEvent, format_sse

router = APIRouter(prefix="/api/chat", tags=["Consultant Chat"])


def _ensure_registered_agent(rule: RouteDecision, registry) -> RouteDecision:
    if registry.has(rule.agent):
        return rule
    return RouteDecision(
        intent="general_counselling",
        agent="conversation",
        confidence=rule.confidence,
        method=rule.method,
    )


async def _build_extra_context(
    rule, db: AsyncSession, user: models.User
) -> dict | None:
    if rule.agent != "matching":
        return None
    result = await db.execute(
        select(models.TrackedUniversity).where(
            models.TrackedUniversity.user_id == user.id
        )
    )
    candidates: list[dict] = []
    for r in result.scalars().all():
        try:
            reqs = json.loads(r.reqs) if r.reqs else []
        except (json.JSONDecodeError, TypeError):
            reqs = []
        candidates.append(
            {
                "id": str(r.id),
                "name": r.name,
                "location": r.location,
                "avg_gpa": r.avg_gpa,
                "deadlines": r.deadlines,
                "scholarships": reqs if isinstance(reqs, list) else [],
            }
        )
    return {
        "match_candidates": [
            c.model_dump() for c in MatchingService.candidates_from_tracked(candidates)
        ]
    }


@router.get("/sessions", response_model=List[schemas.ChatSessionListResponse])
async def get_sessions(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.ChatSession)
        .where(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}/messages", response_model=List[schemas.ChatMessageResponse])
async def get_session_messages(
    session_id: str,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.ChatSession).where(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Chat session not found")

    msgs = await db.execute(
        select(models.ChatMessage)
        .where(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.timestamp.asc())
    )
    return msgs.scalars().all()


@router.post("/message")
async def post_chat_message(
    payload: schemas.ChatMessageCreate,
    request: Request,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    try:
        orchestrator = getattr(request.app.state, "orchestrator", None)
        registry = getattr(request.app.state, "agent_registry", None)
        if orchestrator is None or registry is None:
            raise HTTPException(status_code=503, detail="Chat runtime is not ready")

        rule = _ensure_registered_agent(classify_rules(payload.text), registry)

        conv = ConversationRepository(db, current_user)
        profile_writer = ProfileEnrichmentService(ProfileRepository(db, current_user))
        extra_context = await _build_extra_context(rule, db, current_user)
        outcome = await orchestrator.handle(
            user_id=str(current_user.id),
            message=payload.text,
            session_id=payload.session_id,
            context_source=conv,
            message_store=conv,
            profile_writer=profile_writer,
            extra_context=extra_context,
            use_ai_routing=False,
        )
        result = outcome.result
        suggested = [q.label for q in result.quick_replies]
        assistant_msg = conv.last_assistant_message or {
            "id": f"msg-{uuid.uuid4().hex[:8]}",
            "sender": "ai",
            "text": result.reply,
            "timestamp": datetime.datetime.now().strftime("%I:%M %p"),
        }
        return {
            "session_id": outcome.session_id,
            "session_title": conv.last_session_title,
            "reply": result.reply,
            "message": assistant_msg,
            "recommendations": result.data.get("recommendations"),
            "requires_profile_data": len(suggested) > 0,
            "suggested_options": suggested,
            "sources": [s.model_dump() for s in result.sources],
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Chat API] Error processing message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing chat message. Please try again.",
        )


@router.post("/stream")
async def stream_chat_message(
    payload: schemas.ChatMessageCreate,
    request: Request,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    orchestrator = getattr(request.app.state, "orchestrator", None)
    registry = getattr(request.app.state, "agent_registry", None)
    if orchestrator is None or registry is None:
        raise HTTPException(status_code=503, detail="Chat runtime is not ready")

    rule = _ensure_registered_agent(classify_rules(payload.text), registry)

    conv = ConversationRepository(db, current_user)
    profile_writer = ProfileEnrichmentService(ProfileRepository(db, current_user))
    extra_context = await _build_extra_context(rule, db, current_user)

    async def event_source():
        try:
            async for event in orchestrator.stream(
                user_id=str(current_user.id),
                message=payload.text,
                session_id=payload.session_id,
                context_source=conv,
                message_store=conv,
                profile_writer=profile_writer,
                extra_context=extra_context,
                use_ai_routing=False,
            ):
                yield format_sse(event)
        except Exception as exc:  # noqa: BLE001
            print(f"[Chat Stream] Error: {exc}")
            yield format_sse(
                StreamEvent(
                    "error",
                    {"message": "Something went wrong. Please try again."},
                )
            )

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

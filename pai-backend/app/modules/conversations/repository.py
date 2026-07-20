"""Conversations module — async chat persistence + request context loading.

Target layout (CLAUDE.md §4): ``modules/conversations/{repository,service}``.
Uses the shared legacy ORM tables (``chat_sessions`` / ``chat_messages``) via
``AsyncSession`` until dedicated module models land with Alembic.
"""

from __future__ import annotations

import datetime
import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import models
from app.agents.base import AgentResult


def _parse_json_list(raw: str | None) -> list[Any]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
        return value if isinstance(value, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _now_label() -> str:
    return datetime.datetime.now().strftime("%I:%M %p")


class ConversationRepository:
    """Async chat store + context source for the orchestrator.

    Implements both the ``MessageStore`` and ``ContextSource`` surfaces used by
    ``runtime/orchestrator`` so the chat router no longer needs the sync
    ``LegacyChatStore`` / ``LegacyContextSource`` bridge.
    """

    def __init__(self, db: AsyncSession, user: models.User) -> None:
        self._db = db
        self._user = user
        self.last_session_title: str | None = None
        self.last_assistant_message: dict[str, Any] | None = None

    # --- MessageStore -------------------------------------------------------

    async def ensure_session(
        self, user_id: str, session_id: str | None, first_message: str
    ) -> str:
        db_session = None
        if session_id and session_id != "session-empty":
            result = await self._db.execute(
                select(models.ChatSession).where(
                    models.ChatSession.id == session_id,
                    models.ChatSession.user_id == self._user.id,
                )
            )
            db_session = result.scalar_one_or_none()

        if db_session is None:
            session_id = f"session-{uuid.uuid4().hex[:8]}"
            title = first_message[:22] + "..." if len(first_message) > 22 else first_message
            db_session = models.ChatSession(
                id=session_id, user_id=self._user.id, title=title
            )
            self._db.add(db_session)
            await self._db.commit()

        self.last_session_title = db_session.title
        return db_session.id

    async def save_user_message(self, session_id: str, text: str) -> None:
        await self._save_message(session_id, "user", text)

    async def save_assistant_message(self, session_id: str, result: AgentResult) -> None:
        self.last_assistant_message = await self._save_message(
            session_id, "ai", result.reply
        )

    async def _save_message(
        self, session_id: str, sender: str, text: str
    ) -> dict[str, Any]:
        msg_id = f"msg-{uuid.uuid4().hex[:8]}"
        timestamp = _now_label()
        self._db.add(
            models.ChatMessage(
                id=msg_id,
                session_id=session_id,
                sender=sender,
                text=text,
                timestamp=timestamp,
            )
        )
        # Bump session updated_at so the sessions list stays ordered.
        result = await self._db.execute(
            select(models.ChatSession).where(models.ChatSession.id == session_id)
        )
        sess = result.scalar_one_or_none()
        if sess is not None:
            sess.updated_at = datetime.datetime.utcnow()
        await self._db.commit()
        return {"id": msg_id, "sender": sender, "text": text, "timestamp": timestamp}

    # --- ContextSource ------------------------------------------------------

    async def load_profile(self, user_id: str) -> dict[str, Any]:
        user = await self._reload_user()
        return {
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "nationality": user.nationality,
            "country": user.country,
            "city": user.city,
            "current_education": user.current_education,
            "current_status": user.current_status,
            "intended_destination": user.intended_destination,
            "intended_degree": user.intended_degree,
            "preferred_field": user.preferred_field,
            "summary": user.summary,
            "skills": _parse_json_list(user.skills),
            "languages": _parse_json_list(user.languages),
            "goals": _parse_json_list(user.goals),
            "education": [
                {
                    "degree": e.degree,
                    "school": e.school,
                    "major": e.major,
                    "gpa": e.gpa,
                    "graduation_year": e.graduation_year,
                }
                for e in (user.education or [])
            ],
            "work_experience": [
                {"role": w.role, "company": w.company, "period": w.period}
                for w in (user.work_experience or [])
            ],
            "projects": [{"name": p.name} for p in (user.projects or [])],
            "uploaded_documents": [
                {"name": d.name, "type": d.type, "status": d.status}
                for d in (user.documents or [])
            ],
        }

    async def load_goals(self, user_id: str) -> list[dict[str, Any]]:
        return _parse_json_list(self._user.goals)

    async def load_preferences(self, user_id: str) -> dict[str, Any]:
        return {}

    async def load_recent_messages(self, session_id: str, limit: int) -> list[dict[str, Any]]:
        result = await self._db.execute(
            select(models.ChatMessage)
            .where(models.ChatMessage.session_id == session_id)
            .order_by(models.ChatMessage.timestamp.asc())
        )
        rows = result.scalars().all()
        return [{"sender": m.sender, "text": m.text} for m in rows[-limit:]]

    async def load_summary(self, session_id: str) -> str | None:
        return None

    async def load_document_ids(self, user_id: str) -> list[str]:
        # Prefer already-loaded relations from load_profile when available.
        docs = getattr(self._user, "documents", None)
        if docs is not None and not isinstance(docs, list):
            # InstrumentedList after selectinload
            try:
                return [d.id for d in docs]
            except Exception:  # noqa: BLE001
                pass
        if isinstance(docs, list):
            return [d.id if hasattr(d, "id") else str(d.get("id", "")) for d in docs]
        result = await self._db.execute(
            select(models.Document.id).where(models.Document.user_id == self._user.id)
        )
        return list(result.scalars().all())

    async def _reload_user(self) -> models.User:
        """Fresh load with relations so profile context never hits lazy IO."""
        result = await self._db.execute(
            select(models.User)
            .where(models.User.id == self._user.id)
            .options(
                selectinload(models.User.education),
                selectinload(models.User.work_experience),
                selectinload(models.User.projects),
                selectinload(models.User.documents),
            )
        )
        user = result.scalar_one()
        self._user = user
        return user

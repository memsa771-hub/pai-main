"""Unit tests for modules/conversations async repository (mocked session)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.agents.base import AgentResult
from app.modules.conversations.repository import ConversationRepository


@pytest.fixture
def user():
    return SimpleNamespace(
        id=1,
        full_name="Test",
        email="t@example.com",
        phone=None,
        nationality=None,
        country="PK",
        city=None,
        current_education=None,
        current_status=None,
        intended_destination=None,
        intended_degree=None,
        preferred_field="CS",
        summary=None,
        skills='["Python"]',
        languages="[]",
        goals='[{"goal_type":"international_admission"}]',
        education=[],
        work_experience=[],
        projects=[],
        documents=[],
    )


async def test_ensure_session_creates_new(user):
    db = AsyncMock()
    db.add = MagicMock()
    result_empty = MagicMock()
    result_empty.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result_empty)
    db.commit = AsyncMock()

    repo = ConversationRepository(db, user)
    sid = await repo.ensure_session("1", None, "Hello there friend")
    assert sid.startswith("session-")
    assert repo.last_session_title.startswith("Hello there")
    db.add.assert_called_once()
    db.commit.assert_awaited()


async def test_save_assistant_message(user):
    db = AsyncMock()
    db.add = MagicMock()
    sess = SimpleNamespace(id="session-1", updated_at=None)
    result = MagicMock()
    result.scalar_one_or_none.return_value = sess
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()

    repo = ConversationRepository(db, user)
    await repo.save_assistant_message(
        "session-1",
        AgentResult(agent="conversation", intent="casual", status="success", reply="Hi"),
    )
    assert repo.last_assistant_message["sender"] == "ai"
    assert repo.last_assistant_message["text"] == "Hi"
    db.add.assert_called_once()
    db.commit.assert_awaited()

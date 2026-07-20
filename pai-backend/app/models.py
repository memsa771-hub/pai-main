"""Compatibility re-export of ORM models (CLAUDE.md Âsection 4 module homes).

Prefer importing from ``app.modules.*.models``. This module keeps existing
``from app import models`` imports working.
"""

from app.modules.conversations.models import ChatMessage, ChatSession
from app.modules.documents.models import Document
from app.modules.universities.models import TrackedUniversity
from app.modules.users.models import (
    Education,
    Project,
    RoadmapSection,
    RoadmapStep,
    User,
    WorkExperience,
)
from app.infrastructure.database import Base

__all__ = [
    "Base",
    "User",
    "Education",
    "WorkExperience",
    "Project",
    "Document",
    "TrackedUniversity",
    "RoadmapSection",
    "RoadmapStep",
    "ChatSession",
    "ChatMessage",
]

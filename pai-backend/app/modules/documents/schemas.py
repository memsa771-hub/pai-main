"""Validation schemas for document ingestion (CLAUDE.md sections 10.3, 24).

The document extraction produces a single structured payload that reuses the
profiles module's `ProfileUpdate` / `GoalUpdate` contracts, so extracted data
flows through the exact same validated, conflict-aware enrichment pipeline as
conversation-detected data.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.profiles.schemas import GoalUpdate, ProfileUpdate

DocumentClass = Literal[
    "cv",
    "resume",
    "transcript",
    "degree",
    "certificate",
    "ielts",
    "toefl",
    "experience_letter",
    "recommendation_letter",
    "research",
    "other",
]


class TestScore(BaseModel):
    """A standardized-test result (IELTS/TOEFL/GRE/etc.)."""

    model_config = ConfigDict(extra="ignore")

    test_name: str | None = None
    score: str | None = None
    date: str | None = None


class DocumentExtraction(BaseModel):
    """Structured result of a single document extraction AI call."""

    model_config = ConfigDict(extra="ignore")

    document_class: DocumentClass | None = None
    confidence: float = 0.5
    profile: ProfileUpdate = Field(default_factory=ProfileUpdate)
    goals: list[GoalUpdate] = Field(default_factory=list)
    test_scores: list[TestScore] = Field(default_factory=list)
    issue_date: str | None = None
    expiry_date: str | None = None
    summary: str | None = None


class ExtractionSummary(BaseModel):
    """What the pipeline extracted and applied (returned/logged, not persisted)."""

    document_class: str | None = None
    confidence: float = 0.0
    applied_fields: list[str] = Field(default_factory=list)
    added_goals: int = 0
    enriched_goals: int = 0
    conflicts: int = 0
    test_scores: list[TestScore] = Field(default_factory=list)
    status: Literal["completed", "draft"] = "completed"

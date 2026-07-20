"""Matching schemas (CLAUDE.md section 18)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

MatchCategory = Literal["ambitious", "strong_match", "safe", "not_currently_eligible"]


class MatchProfile(BaseModel):
    """The student inputs relevant to matching, derived from their profile."""

    model_config = ConfigDict(extra="ignore")

    gpa_percentage: float | None = None
    preferred_field: str | None = None
    intended_destination: str | None = None
    budget: str | None = None
    languages: list[str] = Field(default_factory=list)
    has_language_test: bool = False
    career_target: str | None = None


class CandidateProgram(BaseModel):
    """A program/university to score against the student."""

    model_config = ConfigDict(extra="ignore")

    program_id: str
    university: str
    program_name: str | None = None
    country: str | None = None
    field: str | None = None
    avg_gpa: str | None = None
    tuition_annual: str | None = None
    currency: str | None = None
    scholarships: list[str] = Field(default_factory=list)
    language_requirement: str | None = None
    deadline: str | None = None
    sources: list[dict[str, Any]] = Field(default_factory=list)


class Recommendation(BaseModel):
    program_id: str
    university: str
    program_name: str | None = None
    eligible: bool
    match_score: int
    category: MatchCategory
    reasons: list[str] = Field(default_factory=list)
    missing_requirements: list[str] = Field(default_factory=list)
    estimated_cost: dict[str, Any] = Field(default_factory=dict)
    scholarship_options: list[str] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    component_scores: dict[str, float] = Field(default_factory=dict)

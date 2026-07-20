"""Validation schemas for profile and goal enrichment (CLAUDE.md section 8).

All updates extracted from conversation or documents pass through these models so
data is validated before it ever touches the database. Unknown keys are ignored
so a noisy LLM payload can never inject unexpected fields.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

GoalType = Literal[
    "local_admission",
    "international_admission",
    "scholarship",
    "career_guidance",
    "job_search",
    "skill_development",
    "document_preparation",
    "university_comparison",
]

# Scalar user fields that may be enriched from conversation/documents.
SCALAR_FIELDS: tuple[str, ...] = (
    "phone",
    "dob",
    "gender",
    "nationality",
    "country",
    "city",
    "linkedin",
    "current_education",
    "current_status",
    "intended_destination",
    "intended_degree",
    "preferred_field",
    "summary",
)


class EducationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    degree: str | None = None
    school: str | None = None
    major: str | None = None
    period: str | None = None
    graduation_year: str | None = None
    gpa: str | None = None
    details: str | None = None


class WorkItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: str | None = None
    company: str | None = None
    period: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    achievements: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    description: str | None = None
    link_or_credential: str | None = None


class ProfileUpdate(BaseModel):
    """New profile information detected in a message or document."""

    model_config = ConfigDict(extra="ignore")

    phone: str | None = None
    dob: str | None = None
    gender: str | None = None
    nationality: str | None = None
    country: str | None = None
    city: str | None = None
    linkedin: str | None = None
    current_education: str | None = None
    current_status: str | None = None
    intended_destination: str | None = None
    intended_degree: str | None = None
    preferred_field: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    work_experience: list[WorkItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)


class GoalUpdate(BaseModel):
    """A structured student goal (CLAUDE.md section 8)."""

    model_config = ConfigDict(extra="ignore")

    goal_type: GoalType | None = None
    target_country: str | None = None
    target_city: str | None = None
    target_university: str | None = None
    target_program: str | None = None
    target_degree_level: str | None = None
    career_target: str | None = None
    funding_preference: str | None = None
    budget: str | None = None
    preferred_intake: str | None = None
    status: str | None = None
    confidence: float | None = None
    source: str | None = None


class FieldConflict(BaseModel):
    """A detected conflict between stored and incoming data (not overwritten)."""

    scope: str  # "profile" | "goal"
    field: str
    existing: str
    incoming: str


class EnrichmentResult(BaseModel):
    applied_fields: list[str] = Field(default_factory=list)
    added_goals: int = 0
    enriched_goals: int = 0
    conflicts: list[FieldConflict] = Field(default_factory=list)

    @property
    def changed(self) -> bool:
        return bool(self.applied_fields or self.added_goals or self.enriched_goals)

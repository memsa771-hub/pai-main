"""Admissions schemas (CLAUDE.md section 17).

A merit formula is a set of weighted components (e.g. admission_test 0.50,
hssc 0.40, ssc 0.10) with provenance. The merit result is produced by a
deterministic Python engine — never by the LLM.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Canonical component names used across formulas and student marks.
ComponentName = Literal["admission_test", "hssc", "ssc", "bachelors", "interview"]


class FormulaComponent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: ComponentName
    weight: float  # fraction of the aggregate (components should sum to ~1.0)
    label: str | None = None


class MeritFormula(BaseModel):
    model_config = ConfigDict(extra="ignore")

    university: str
    program_group: str = "General"
    components: list[FormulaComponent]
    valid_for_intake: str | None = None
    source_url: str | None = None
    verified_at: str | None = None
    confidence: float = 0.6
    verified: bool = False

    def weight_sum(self) -> float:
        return round(sum(c.weight for c in self.components), 4)


class MeritBreakdownItem(BaseModel):
    name: str
    weight: float
    mark: float
    contribution: float


class MeritResult(BaseModel):
    status: Literal["calculated", "needs_input", "no_formula", "unknown_university"]
    university: str | None = None
    program_group: str | None = None
    aggregate: float | None = None
    breakdown: list[MeritBreakdownItem] = Field(default_factory=list)
    missing_components: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    formula: MeritFormula | None = None
    explanation: str = ""

"""Saved merit formulas (CLAUDE.md section 17: "Check saved verified merit formula").

These are well-documented public aggregate formulas for common Pakistani
universities, used as the saved-formula store. They are seeded defaults
(``verified=False``): the service can refresh any of them from the official
source via research. Weights are fractions that sum to 1.0.

When the async DB migration lands (Step 20) this dict is replaced by a
`merit_formulas` table with per-intake verified rows.
"""

from __future__ import annotations

from app.modules.admissions.schemas import FormulaComponent, MeritFormula

_SEED: dict[str, MeritFormula] = {
    "FAST NUCES": MeritFormula(
        university="FAST NUCES",
        program_group="BS Computing/Engineering",
        components=[
            FormulaComponent(name="admission_test", weight=0.50, label="NU Entry Test"),
            FormulaComponent(name="hssc", weight=0.40, label="HSSC / FSc / A-Level"),
            FormulaComponent(name="ssc", weight=0.10, label="SSC / Matric / O-Level"),
        ],
        valid_for_intake="Fall 2026",
        source_url="https://www.nu.edu.pk/Admissions/MeritCriteria",
        confidence=0.6,
        verified=False,
    ),
    "NUST": MeritFormula(
        university="NUST",
        program_group="BE/BS",
        components=[
            FormulaComponent(name="admission_test", weight=0.75, label="NET"),
            FormulaComponent(name="hssc", weight=0.15, label="FSc / HSSC"),
            FormulaComponent(name="ssc", weight=0.10, label="Matric / SSC"),
        ],
        valid_for_intake="Fall 2026",
        source_url="https://nust.edu.pk/admissions/undergraduates/",
        confidence=0.6,
        verified=False,
    ),
    "GIKI": MeritFormula(
        university="GIKI",
        program_group="BS Engineering",
        components=[
            FormulaComponent(name="admission_test", weight=0.85, label="GIKI Test / SAT"),
            FormulaComponent(name="hssc", weight=0.15, label="HSSC / FSc"),
        ],
        valid_for_intake="Fall 2026",
        source_url="https://giki.edu.pk/admissions/",
        confidence=0.6,
        verified=False,
    ),
    "UET": MeritFormula(
        university="UET",
        program_group="BSc Engineering",
        components=[
            FormulaComponent(name="admission_test", weight=0.30, label="ECAT"),
            FormulaComponent(name="hssc", weight=0.70, label="FSc / HSSC"),
        ],
        valid_for_intake="Fall 2026",
        source_url="https://uet.edu.pk/admissions/",
        confidence=0.6,
        verified=False,
    ),
}


def get_saved_formula(university: str) -> MeritFormula | None:
    """Return a copy of the saved formula for a canonical university name."""
    formula = _SEED.get(university)
    return formula.model_copy(deep=True) if formula else None


def has_saved_formula(university: str) -> bool:
    return university in _SEED

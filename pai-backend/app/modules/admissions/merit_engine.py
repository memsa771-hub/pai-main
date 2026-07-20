"""Deterministic merit engine (CLAUDE.md section 17).

Pure Python, no AI and no I/O. Given a structured `MeritFormula` and the
student's marks (percentages), it computes a weighted aggregate and an
explainable breakdown. If a required component's mark is missing it returns
``needs_input`` — it NEVER invents a test score.

`collect_marks_from_profile` derives HSSC/SSC percentages from the student's
education history where possible; admission-test scores are never inferred.
"""

from __future__ import annotations

import re
from typing import Any

from app.modules.admissions.schemas import (
    FormulaComponent,
    MeritBreakdownItem,
    MeritFormula,
    MeritResult,
)

_LEVEL_KEYWORDS: dict[str, tuple[str, ...]] = {
    "ssc": ("matric", "ssc", "o-level", "o level", "olevel", "secondary school", "10th"),
    "hssc": (
        "fsc", "f.sc", "hssc", "intermediate", "a-level", "a level", "alevel",
        "higher secondary", "12th", "pre-engineering", "pre-medical",
    ),
    "bachelors": ("bachelor", "bs ", "bsc", "b.sc", "be ", "b.e", "undergrad"),
}


def validate_formula(formula: MeritFormula) -> list[str]:
    """Return a list of validation problems (empty means valid)."""
    problems: list[str] = []
    if not formula.components:
        problems.append("formula has no components")
    total = formula.weight_sum()
    if abs(total - 1.0) > 0.02:
        problems.append(f"component weights sum to {total}, expected ~1.0")
    for c in formula.components:
        if not (0.0 <= c.weight <= 1.0):
            problems.append(f"component {c.name} has invalid weight {c.weight}")
    return problems


def calculate_merit(formula: MeritFormula, marks: dict[str, float]) -> MeritResult:
    """Compute the weighted aggregate deterministically."""
    problems = validate_formula(formula)
    if problems:
        return MeritResult(
            status="no_formula",
            university=formula.university,
            program_group=formula.program_group,
            formula=formula,
            explanation="; ".join(problems),
        )

    missing = [c.name for c in formula.components if _mark_for(c, marks) is None]
    if missing:
        return MeritResult(
            status="needs_input",
            university=formula.university,
            program_group=formula.program_group,
            missing_components=missing,
            formula=formula,
        )

    breakdown: list[MeritBreakdownItem] = []
    aggregate = 0.0
    for c in formula.components:
        mark = float(_mark_for(c, marks))  # type: ignore[arg-type]
        contribution = round(c.weight * mark, 3)
        aggregate += contribution
        breakdown.append(
            MeritBreakdownItem(
                name=c.name, weight=c.weight, mark=round(mark, 2), contribution=contribution
            )
        )

    return MeritResult(
        status="calculated",
        university=formula.university,
        program_group=formula.program_group,
        aggregate=round(aggregate, 2),
        breakdown=breakdown,
        formula=formula,
    )


def _mark_for(component: FormulaComponent, marks: dict[str, float]) -> float | None:
    value = marks.get(component.name)
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def collect_marks_from_profile(profile: dict[str, Any]) -> tuple[dict[str, float], list[str]]:
    """Derive available academic percentages from the profile.

    Returns (marks, assumptions). Admission-test scores are intentionally never
    inferred and must be supplied by the student.
    """
    marks: dict[str, float] = {}
    assumptions: list[str] = []

    for edu in profile.get("education") or []:
        if not isinstance(edu, dict):
            continue
        level = _classify_level(f"{edu.get('degree', '')} {edu.get('major', '')}")
        if level is None:
            continue
        pct, note = _to_percentage(edu.get("gpa"))
        if pct is None:
            continue
        # Keep the strongest (first-seen) mark for each level.
        if level not in marks:
            marks[level] = pct
            if note:
                assumptions.append(f"{level.upper()}: {note}")

    return marks, assumptions


def _classify_level(text: str) -> str | None:
    low = text.lower()
    for level, keywords in _LEVEL_KEYWORDS.items():
        if any(kw in low for kw in keywords):
            return level
    return None


_PCT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%")
_FRACTION_RE = re.compile(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)")
_NUM_RE = re.compile(r"(\d+(?:\.\d+)?)")


def _to_percentage(raw: Any) -> tuple[float | None, str | None]:
    """Best-effort conversion of a stored grade into a percentage (0-100)."""
    if raw is None:
        return None, None
    text = str(raw).strip()
    if not text:
        return None, None

    m = _PCT_RE.search(text)
    if m:
        return _clamp(float(m.group(1))), None

    m = _FRACTION_RE.search(text)
    if m:
        num, den = float(m.group(1)), float(m.group(2))
        if den > 0:
            if den <= 5:  # GPA scale like 3.5/4.0
                return _clamp(num / den * 100), f"converted GPA {text} to percentage"
            return _clamp(num / den * 100), None

    m = _NUM_RE.search(text)
    if m:
        val = float(m.group(1))
        if val <= 4:  # bare GPA on a 4.0 scale
            return _clamp(val / 4.0 * 100), f"assumed {val} is a 4.0-scale GPA"
        if val <= 5:  # bare GPA on a 5.0 scale
            return _clamp(val / 5.0 * 100), f"assumed {val} is a 5.0-scale GPA"
        return _clamp(val), None  # already a percentage
    return None, None


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))

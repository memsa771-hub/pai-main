"""Deterministic matching engine (CLAUDE.md section 18).

Pure Python, no AI and no I/O. Scores a `CandidateProgram` against a
`MatchProfile` using the central weight configuration, producing an explainable
`Recommendation` (per-component scores, reasons, missing requirements, category).
The LLM never assigns scores or admission probability.
"""

from __future__ import annotations

import re

from app.modules.recommendations import config
from app.modules.recommendations.schemas import (
    CandidateProgram,
    MatchCategory,
    MatchProfile,
    Recommendation,
)

_PCT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%")
_FRACTION_RE = re.compile(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)")
_NUM_RE = re.compile(r"(\d+(?:\.\d+)?)")
_WORD_RE = re.compile(r"[a-z0-9]+")

_STOPWORDS = {"the", "of", "and", "in", "a", "for", "study", "studies", "program", "science"}


def parse_percentage(raw: object) -> float | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    m = _PCT_RE.search(text)
    if m:
        return _clamp(float(m.group(1)))
    m = _FRACTION_RE.search(text)
    if m:
        num, den = float(m.group(1)), float(m.group(2))
        if den > 0:
            return _clamp(num / den * 100)
    m = _NUM_RE.search(text)
    if m:
        val = float(m.group(1))
        if val <= 4:
            return _clamp(val / 4.0 * 100)
        if val <= 5:
            return _clamp(val / 5.0 * 100)
        return _clamp(val)
    return None


def score_candidate(profile: MatchProfile, candidate: CandidateProgram) -> Recommendation:
    w = config.WEIGHTS
    components: dict[str, float] = {}
    reasons: list[str] = []
    missing: list[str] = []

    # --- Academic eligibility (largest weight) ---
    student_pct = profile.gpa_percentage
    avg_pct = parse_percentage(candidate.avg_gpa)
    eligible = True
    max_acad = w["academic_eligibility"]
    if student_pct is None:
        components["academic_eligibility"] = round(max_acad * config.NEUTRAL_CREDIT, 2)
        missing.append("Add your academic percentage/CGPA for an accurate match.")
    elif avg_pct is None:
        components["academic_eligibility"] = round(max_acad * config.NEUTRAL_CREDIT, 2)
        reasons.append("Program average not published; scored on your profile strength.")
    else:
        ratio = student_pct / avg_pct if avg_pct else 1.0
        eligible = student_pct >= avg_pct * config.ELIGIBILITY_GPA_RATIO
        points = _clamp_unit(ratio) * max_acad
        components["academic_eligibility"] = round(points, 2)
        if student_pct >= avg_pct:
            reasons.append(f"Your {student_pct:.0f}% meets/exceeds the ~{avg_pct:.0f}% average.")
        elif eligible:
            reasons.append(f"Your {student_pct:.0f}% is close to the ~{avg_pct:.0f}% average.")
        else:
            missing.append(f"Academics below the ~{avg_pct:.0f}% average (yours {student_pct:.0f}%).")

    # --- Program relevance ---
    rel = _token_overlap(profile.preferred_field, f"{candidate.field or ''} {candidate.program_name or ''}")
    components["program_relevance"] = round(rel * w["program_relevance"], 2)
    if rel >= 0.5:
        reasons.append("Strong fit with your preferred field.")
    elif rel > 0:
        reasons.append("Partial overlap with your preferred field.")

    # --- Budget fit ---
    budget_pct = parse_percentage(profile.budget)
    tuition_pct = parse_percentage(candidate.tuition_annual)
    if profile.budget and candidate.tuition_annual and budget_pct is not None and tuition_pct is not None:
        fit = 1.0 if tuition_pct <= budget_pct else _clamp_unit(budget_pct / tuition_pct)
        components["budget_fit"] = round(fit * w["budget_fit"], 2)
        if fit >= 0.99:
            reasons.append("Tuition is within your stated budget.")
        elif fit < 0.6:
            missing.append("Tuition likely exceeds your budget; consider funding.")
    else:
        components["budget_fit"] = round(config.NEUTRAL_CREDIT * w["budget_fit"], 2)

    # --- Destination preference ---
    dest = _token_overlap(profile.intended_destination, f"{candidate.country or ''} {candidate.university}")
    if dest > 0:
        components["destination_preference"] = float(w["destination_preference"])
        reasons.append("Matches your preferred destination.")
    else:
        components["destination_preference"] = 0.0

    # --- Language readiness ---
    if profile.has_language_test or profile.languages:
        components["language_readiness"] = float(w["language_readiness"])
    else:
        components["language_readiness"] = 0.0
        missing.append("No IELTS/TOEFL on file; most programs require proof of English.")

    # --- Scholarship availability ---
    if candidate.scholarships:
        components["scholarship_availability"] = float(w["scholarship_availability"])
        reasons.append("Scholarship/funding options available.")
    else:
        components["scholarship_availability"] = 0.0

    # --- Career alignment ---
    career = _token_overlap(
        profile.career_target or profile.preferred_field,
        f"{candidate.program_name or ''} {candidate.field or ''}",
    )
    components["career_alignment"] = round(career * w["career_alignment"], 2)

    total = int(round(sum(components.values())))
    category = _categorize(total, eligible)

    estimated_cost = {}
    if candidate.tuition_annual:
        estimated_cost = {"tuition_annual": candidate.tuition_annual, "currency": candidate.currency}

    return Recommendation(
        program_id=candidate.program_id,
        university=candidate.university,
        program_name=candidate.program_name,
        eligible=eligible,
        match_score=total,
        category=category,
        reasons=reasons,
        missing_requirements=missing,
        estimated_cost=estimated_cost,
        scholarship_options=candidate.scholarships,
        sources=candidate.sources,
        component_scores=components,
    )


def _categorize(score: int, eligible: bool) -> MatchCategory:
    if not eligible:
        return "not_currently_eligible"
    for category, threshold in config.CATEGORY_THRESHOLDS.items():
        if score >= threshold:
            return category  # type: ignore[return-value]
    return "ambitious"


def _token_overlap(a: str | None, b: str | None) -> float:
    """Jaccard-like overlap of significant tokens, in [0, 1]."""
    ta = _tokens(a)
    tb = _tokens(b)
    if not ta or not tb:
        return 0.0
    inter = ta & tb
    if not inter:
        return 0.0
    return round(len(inter) / len(ta), 3)


def _tokens(text: str | None) -> set[str]:
    if not text:
        return set()
    return {t for t in _WORD_RE.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1}


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))

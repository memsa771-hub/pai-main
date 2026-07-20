"""Engine tests: deterministic merit and matching (CLAUDE.md sections 17, 18)."""

from __future__ import annotations

import pytest

from app.modules.admissions.aliases import resolve_alias
from app.modules.admissions.formulas import get_saved_formula
from app.modules.admissions.merit_engine import (
    calculate_merit,
    collect_marks_from_profile,
    validate_formula,
)
from app.modules.recommendations.scoring_engine import parse_percentage, score_candidate
from app.modules.recommendations.schemas import CandidateProgram, MatchProfile
from app.modules.recommendations.service import MatchingService


# --- Merit engine -----------------------------------------------------------

@pytest.mark.parametrize(
    "text,expected",
    [
        ("calculate my fast nuces merit", "FAST NUCES"),
        ("what about NUST", "NUST"),
        ("i want GIKI", "GIKI"),
        ("random", None),
    ],
)
def test_alias_resolution(text, expected):
    assert resolve_alias(text) == expected


def test_seeded_formulas_valid():
    for uni in ("FAST NUCES", "NUST", "GIKI", "UET"):
        formula = get_saved_formula(uni)
        assert formula is not None
        assert validate_formula(formula) == []
        assert abs(formula.weight_sum() - 1.0) < 0.01


def test_merit_calculation_is_exact():
    formula = get_saved_formula("FAST NUCES")  # test .50 / hssc .40 / ssc .10
    res = calculate_merit(formula, {"admission_test": 80, "hssc": 90, "ssc": 95})
    assert res.status == "calculated"
    assert res.aggregate == 85.5  # 40 + 36 + 9.5
    assert len(res.breakdown) == 3


def test_merit_needs_input_when_test_missing():
    formula = get_saved_formula("NUST")
    res = calculate_merit(formula, {"hssc": 90, "ssc": 95})
    assert res.status == "needs_input"
    assert "admission_test" in res.missing_components
    assert res.aggregate is None


def test_merit_never_invents_marks():
    formula = get_saved_formula("UET")
    res = calculate_merit(formula, {})
    assert res.status == "needs_input"
    # both components required, nothing fabricated
    assert set(res.missing_components) == {"admission_test", "hssc"}


def test_collect_marks_from_profile():
    profile = {
        "education": [
            {"degree": "FSc Pre-Engineering", "gpa": "88%"},
            {"degree": "Matric", "gpa": "90%"},
            {"degree": "BS Computer Science", "gpa": "3.6/4.0"},
        ]
    }
    marks, _ = collect_marks_from_profile(profile)
    assert marks["hssc"] == 88.0
    assert marks["ssc"] == 90.0
    assert marks["bachelors"] == 90.0  # 3.6/4 -> 90%


# --- Matching engine --------------------------------------------------------

@pytest.mark.parametrize(
    "raw,expected",
    [("85%", 85.0), ("3.5/4.0", 87.5), ("3.2", 80.0), ("", None), (None, None)],
)
def test_parse_percentage(raw, expected):
    assert parse_percentage(raw) == expected


def _strong_profile():
    return MatchProfile(
        gpa_percentage=95.0, preferred_field="Computer Science",
        intended_destination="Germany", languages=["English"], has_language_test=True,
    )


def test_match_scoring_and_category():
    cand = CandidateProgram(
        program_id="p1", university="TU Munich", program_name="MSc Computer Science",
        country="Germany", field="Computer Science", avg_gpa="80%", scholarships=["DAAD"],
    )
    r = score_candidate(_strong_profile(), cand)
    assert r.eligible is True
    assert r.match_score >= 80
    assert r.category == "safe"
    assert 0 <= r.match_score <= 100


def test_match_below_average_not_eligible():
    weak = MatchProfile(gpa_percentage=50.0, preferred_field="CS",
                        intended_destination="Germany", languages=["English"], has_language_test=True)
    cand = CandidateProgram(program_id="p1", university="TUM", country="Germany",
                            field="CS", avg_gpa="80%")
    r = score_candidate(weak, cand)
    assert r.eligible is False
    assert r.category == "not_currently_eligible"


def test_match_missing_academics_flagged():
    prof = MatchProfile(preferred_field="CS", intended_destination="Germany", languages=["English"])
    cand = CandidateProgram(program_id="p1", university="TUM", country="Germany",
                            field="CS", avg_gpa="80%")
    r = score_candidate(prof, cand)
    assert any("academic" in m.lower() for m in r.missing_requirements)


def test_match_ranking_eligible_first():
    svc = MatchingService()
    profile = {
        "preferred_field": "Computer Science", "intended_destination": "Germany",
        "languages": ["English"],
        "education": [{"degree": "BS CS", "gpa": "3.8/4.0"}],
        "uploaded_documents": [{"name": "IELTS.pdf", "type": "Certificate"}],
    }
    cands = [
        CandidateProgram(program_id="a", university="Reach", country="Germany",
                         field="Computer Science", avg_gpa="99%"),
        CandidateProgram(program_id="b", university="Fit", country="Germany",
                         field="Computer Science", avg_gpa="80%", scholarships=["DAAD"]),
    ]
    recs = svc.recommend(profile, cands)
    assert recs[0].university == "Fit"
    assert len(recs) <= 5


def test_budget_fit_within_budget():
    prof = MatchProfile(gpa_percentage=90, preferred_field="CS",
                        intended_destination="Germany", budget="20000",
                        languages=["English"], has_language_test=True)
    cand = CandidateProgram(program_id="p", university="U", country="Germany",
                            field="CS", avg_gpa="80%", tuition_annual="15000")
    r = score_candidate(prof, cand)
    assert r.component_scores["budget_fit"] == 15  # full budget weight

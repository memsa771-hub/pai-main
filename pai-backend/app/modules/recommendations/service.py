"""Matching service (CLAUDE.md section 18).

Builds a `MatchProfile` from the student profile, turns candidate programs into
scored, ranked recommendations via the deterministic engine, and returns the top
N. Candidate programs are supplied by the caller (e.g. from the student's tracked
universities today; from the `programs` table after the DB migration).
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.modules.recommendations import config
from app.modules.recommendations.scoring_engine import parse_percentage, score_candidate
from app.modules.recommendations.schemas import CandidateProgram, MatchProfile, Recommendation

logger = get_logger(__name__)

_TEST_TOKENS = ("ielts", "toefl", "pte", "duolingo")


class MatchingService:
    def build_profile(self, profile: dict[str, Any]) -> MatchProfile:
        return MatchProfile(
            gpa_percentage=_best_academic_percentage(profile),
            preferred_field=profile.get("preferred_field"),
            intended_destination=profile.get("intended_destination"),
            budget=profile.get("budget"),
            languages=[str(x) for x in (profile.get("languages") or [])],
            has_language_test=_has_language_test(profile),
            career_target=profile.get("preferred_field"),
        )

    def recommend(
        self, profile: dict[str, Any], candidates: list[CandidateProgram]
    ) -> list[Recommendation]:
        match_profile = self.build_profile(profile)
        scored = [score_candidate(match_profile, c) for c in candidates]
        # Rank: eligible first, then by score.
        scored.sort(key=lambda r: (r.eligible, r.match_score), reverse=True)
        logger.info(
            "matching_scored",
            extra={"candidates": len(candidates), "returned": min(len(scored), config.TOP_N)},
        )
        return scored[: config.TOP_N]

    @staticmethod
    def candidates_from_tracked(tracked: list[dict[str, Any]]) -> list[CandidateProgram]:
        """Adapt legacy tracked-university rows into scoring candidates."""
        candidates: list[CandidateProgram] = []
        for row in tracked:
            scholarships = row.get("scholarships")
            if not isinstance(scholarships, list):
                scholarships = row.get("reqs") if isinstance(row.get("reqs"), list) else []
            candidates.append(
                CandidateProgram(
                    program_id=str(row.get("id") or row.get("name") or "unknown"),
                    university=str(row.get("name") or "Unknown"),
                    program_name=row.get("program_name"),
                    country=row.get("location"),
                    field=row.get("field"),
                    avg_gpa=row.get("avg_gpa"),
                    tuition_annual=row.get("tuition_annual") or row.get("tuition"),
                    scholarships=[str(s) for s in scholarships],
                    deadline=row.get("deadlines"),
                )
            )
        return candidates


def _best_academic_percentage(profile: dict[str, Any]) -> float | None:
    """Prefer the most advanced qualification's percentage."""
    best: float | None = None
    for edu in profile.get("education") or []:
        if not isinstance(edu, dict):
            continue
        pct = parse_percentage(edu.get("gpa"))
        if pct is not None and (best is None or pct > best):
            best = pct
    return best


def _has_language_test(profile: dict[str, Any]) -> bool:
    docs = profile.get("uploaded_documents") or []
    for d in docs:
        name = str((d or {}).get("name", "")).lower() if isinstance(d, dict) else ""
        dtype = str((d or {}).get("type", "")).lower() if isinstance(d, dict) else ""
        if any(tok in name or tok in dtype for tok in _TEST_TOKENS):
            return True
    return False

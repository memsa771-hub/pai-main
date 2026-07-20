"""Central matching configuration (CLAUDE.md section 18).

All scoring weights, thresholds and tunables live here so the recommendation
behaviour can be adjusted in one place without touching engine logic. The LLM is
never allowed to assign scores or admission probability.
"""

from __future__ import annotations

SCORING_VERSION = "1.0"

# Score components and their maximum points (sum = 100).
WEIGHTS: dict[str, int] = {
    "academic_eligibility": 35,
    "program_relevance": 20,
    "budget_fit": 15,
    "destination_preference": 10,
    "language_readiness": 5,
    "scholarship_availability": 10,
    "career_alignment": 5,
}

# Category bands, applied only when the candidate is eligible. Checked high-first.
CATEGORY_THRESHOLDS: dict[str, int] = {
    "safe": 80,
    "strong_match": 65,
    "ambitious": 0,
}

# A student is considered eligible when their academic percentage is at least
# this ratio of the program's average (when both are known).
ELIGIBILITY_GPA_RATIO = 0.9

# Fraction of a component's weight granted when a value is unknown/neutral rather
# than a confirmed match (avoids over-penalizing sparse data).
NEUTRAL_CREDIT = 0.5

# Number of ranked recommendations returned.
TOP_N = 5

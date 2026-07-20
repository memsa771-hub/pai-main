"""University alias resolution (CLAUDE.md section 17).

Maps the many ways students refer to a university to a single canonical name so
the merit engine always looks up one formula. Detection is deterministic (no AI):
it scans the message for known alias tokens, longest/most-specific first.
"""

from __future__ import annotations

import re

# canonical -> list of aliases (all lowercase). Order within value doesn't matter.
_ALIAS_MAP: dict[str, list[str]] = {
    "FAST NUCES": ["fast nuces", "fast-nuces", "fast", "nuces", "nu fast", "national university of computer"],
    "NUST": ["nust", "national university of sciences"],
    "GIKI": ["giki", "ghulam ishaq khan", "gik institute"],
    "UET": ["uet", "university of engineering and technology"],
    "COMSATS": ["comsats", "cui"],
    "PIEAS": ["pieas"],
    "Punjab University": ["punjab university", "pu lahore", "university of the punjab"],
}

# Test/exam aliases that hint at a local-admission context (not universities).
EXAM_ALIASES = {"mdcat", "ecat", "net", "nat", "sat"}

# Build a reverse lookup with regex word-boundary patterns, longest alias first
# so "fast nuces" wins over "fast".
_ALIAS_PATTERNS: list[tuple[re.Pattern[str], str]] = []
for _canonical, _aliases in _ALIAS_MAP.items():
    for _alias in sorted(_aliases, key=len, reverse=True):
        _ALIAS_PATTERNS.append((re.compile(rf"\b{re.escape(_alias)}\b", re.IGNORECASE), _canonical))
_ALIAS_PATTERNS.sort(key=lambda pair: len(pair[0].pattern), reverse=True)


def resolve_alias(text: str) -> str | None:
    """Return the canonical university name mentioned in `text`, or None."""
    if not text:
        return None
    for pattern, canonical in _ALIAS_PATTERNS:
        if pattern.search(text):
            return canonical
    return None


def known_universities() -> list[str]:
    return list(_ALIAS_MAP.keys())

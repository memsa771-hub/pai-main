"""Recommendations API surface (CLAUDE.md §4).

Matching/scoring currently runs via the chat MatchingAgent. This router is the
stable home for future recommendation endpoints.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.get("/health")
async def recommendations_module_health():
    return {"status": "ok", "module": "recommendations"}

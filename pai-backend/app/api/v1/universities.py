"""Universities API surface (CLAUDE.md §4).

Research currently flows through chat + the research module. This router is the
stable home for future university catalogue endpoints without inventing new
frontend contracts yet.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/universities", tags=["Universities"])


@router.get("/health")
async def universities_module_health():
    return {"status": "ok", "module": "universities"}

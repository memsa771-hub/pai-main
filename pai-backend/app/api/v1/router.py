"""API v1 aggregate router (CLAUDE.md §4).

Public URL prefixes remain ``/api/...`` so the existing frontend keeps working.
"""

from fastapi import APIRouter

from app.api.v1 import auth, chat, documents, profile, roadmap, tracker
from app.api.v1 import recommendations as recommendations_api
from app.api.v1 import universities as universities_api

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(tracker.router)
api_router.include_router(roadmap.router)
api_router.include_router(universities_api.router)
api_router.include_router(recommendations_api.router)

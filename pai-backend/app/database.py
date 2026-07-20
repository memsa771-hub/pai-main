"""Legacy synchronous database layer (pg8000 → Supabase pooler).

Shares the **same** Declarative ``Base`` / metadata as the async layer
(``app.infrastructure.database.Base``) so Alembic and both engines see one schema.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.infrastructure.database import Base  # single shared metadata (CLAUDE.md §4/§5)

load_dotenv()

FALLBACK_SQLITE_URL = "sqlite:///./placement_ai.db"


def _sync_database_url() -> str | None:
    raw = os.getenv("DATABASE_URL_POOLER") or os.getenv("DATABASE_URL")
    if not raw:
        return None
    for prefix in (
        "postgresql+asyncpg://",
        "postgresql+psycopg://",
        "postgresql://",
        "postgres://",
    ):
        if raw.startswith(prefix):
            return "postgresql+pg8000://" + raw[len(prefix) :]
    return raw


engine = None
SessionLocal = None

_sync_url = _sync_database_url()

try:
    if not _sync_url:
        raise ValueError("No DATABASE_URL / DATABASE_URL_POOLER configured")
    print(f"[DB] Connecting to PostgreSQL (pg8000) at: {_sync_url.split('@')[-1]}")
    engine = create_engine(_sync_url, pool_pre_ping=True)
    with engine.connect():
        pass
    print("[DB] Connected to Supabase PostgreSQL successfully.")
except Exception as e:  # noqa: BLE001
    print(f"[DB] PostgreSQL connection failed: {e}")
    print(f"[DB] Falling back to SQLite database: {FALLBACK_SQLITE_URL}")
    engine = create_engine(FALLBACK_SQLITE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


__all__ = ["Base", "SessionLocal", "engine", "get_db"]

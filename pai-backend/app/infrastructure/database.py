"""Async SQLAlchemy engine and session management for Supabase PostgreSQL.

This is the target async data layer (SQLAlchemy 2 + asyncpg). It is created
lazily and never forces a connection at import time, so the app can still boot
(and serve legacy sync routes) even if the database is temporarily unreachable.

The legacy synchronous engine in `app/database.py` remains in place until each
module is migrated onto this layer.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """Declarative base for all async ORM models (new modules)."""


_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def _build_engine() -> AsyncEngine:
    settings = get_settings()
    url = settings.runtime_database_url
    if not url:
        raise RuntimeError("DATABASE_URL is not configured.")

    # NullPool + disabled statement cache keeps us compatible with Supabase's
    # transaction-mode connection pooler (pgbouncer), which does not support
    # server-side prepared statements.
    return create_async_engine(
        url,
        echo=settings.db_echo,
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0},
    )


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = _build_engine()
        logger.info("async_db_engine_created")
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            autoflush=False,
        )
    return _sessionmaker


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding an async session.

    Callers must ``await session.commit()`` after mutating work. On unhandled
    exceptions the session is rolled back before being closed.
    """
    maker = get_sessionmaker()
    async with maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# Alias used by migrated routers (same object as ``get_session``).
get_async_db = get_session


async def check_connection() -> bool:
    """Best-effort connectivity probe used at startup; never raises."""
    from sqlalchemy import text

    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001 - startup probe must not crash the app
        logger.warning("async_db_connection_failed", extra={"error": str(exc)})
        return False


async def dispose_engine() -> None:
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
        logger.info("async_db_engine_disposed")
    _engine = None
    _sessionmaker = None

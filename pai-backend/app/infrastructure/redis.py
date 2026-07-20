"""Cache abstraction with a Redis backend and an in-memory fallback.

Redis is optional. When `REDIS_URL` is unset (or Redis is unreachable), the app
transparently uses a process-local in-memory cache so development needs no extra
services. Supabase remains the source of truth; the cache must always fail
gracefully (see CLAUDE.md section 21).

Swap the backend later by only setting `REDIS_URL` — no code changes required.
"""

from __future__ import annotations

import time
from typing import Protocol

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CacheBackend(Protocol):
    async def get(self, key: str) -> str | None: ...
    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None: ...
    async def delete(self, key: str) -> None: ...
    async def close(self) -> None: ...


class InMemoryCache:
    """Simple TTL cache. Per-process only; not shared across workers."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float | None, str]] = {}

    async def get(self, key: str) -> str | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at is not None and expires_at < time.monotonic():
            self._store.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        expires_at = time.monotonic() + ttl_seconds if ttl_seconds else None
        self._store[key] = (expires_at, value)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def close(self) -> None:
        self._store.clear()


class RedisCache:
    """Thin async Redis wrapper that degrades silently on connection errors."""

    def __init__(self, client) -> None:  # type: ignore[no-untyped-def]
        self._client = client

    async def get(self, key: str) -> str | None:
        try:
            return await self._client.get(key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache_get_failed", extra={"error": str(exc)})
            return None

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        try:
            await self._client.set(key, value, ex=ttl_seconds)
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache_set_failed", extra={"error": str(exc)})

    async def delete(self, key: str) -> None:
        try:
            await self._client.delete(key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("cache_delete_failed", extra={"error": str(exc)})

    async def close(self) -> None:
        try:
            await self._client.aclose()
        except Exception:  # noqa: BLE001
            pass


class Cache:
    """Public cache facade used by services. Holds the active backend."""

    def __init__(self, backend: CacheBackend, default_ttl: int) -> None:
        self._backend = backend
        self._default_ttl = default_ttl

    async def get(self, key: str) -> str | None:
        return await self._backend.get(key)

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        await self._backend.set(key, value, ttl_seconds or self._default_ttl)

    async def delete(self, key: str) -> None:
        await self._backend.delete(key)

    async def close(self) -> None:
        await self._backend.close()

    @property
    def backend_name(self) -> str:
        return type(self._backend).__name__


async def create_cache(settings: Settings) -> Cache:
    """Build a Redis-backed cache when configured and reachable, else in-memory."""
    if settings.is_redis_configured:
        try:
            import redis.asyncio as redis

            client = redis.from_url(settings.redis_url, decode_responses=True)
            await client.ping()
            logger.info("cache_backend_selected", extra={"backend": "redis"})
            return Cache(RedisCache(client), settings.cache_default_ttl_seconds)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "redis_unavailable_falling_back_to_memory", extra={"error": str(exc)}
            )

    logger.info("cache_backend_selected", extra={"backend": "in_memory"})
    return Cache(InMemoryCache(), settings.cache_default_ttl_seconds)

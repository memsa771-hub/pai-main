"""A single shared `httpx.AsyncClient` for all outbound HTTP.

Reusing one client (and its connection pool) across DeepSeek, SerpAPI and
official-page fetches is required for performance (see CLAUDE.md sections 15
and 30). The client is created once during app startup and closed on shutdown.
"""

from __future__ import annotations

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)


class HTTPClientManager:
    """Owns the process-wide async HTTP client."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def start(
        self,
        *,
        timeout: float = 60.0,
        max_connections: int = 100,
        max_keepalive_connections: int = 20,
    ) -> None:
        if self._client is not None:
            return
        limits = httpx.Limits(
            max_connections=max_connections,
            max_keepalive_connections=max_keepalive_connections,
        )
        self._client = httpx.AsyncClient(timeout=timeout, limits=limits)
        logger.info("http_client_started", extra={"timeout": timeout})

    async def stop(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
            logger.info("http_client_stopped")

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("HTTP client accessed before startup.")
        return self._client

"""Application lifespan.

Initializes shared resources exactly once on startup and disposes them on
shutdown (CLAUDE.md sections 13 and 15): the HTTP client, DeepSeek client,
prompt registry, cache, and a best-effort database connectivity probe.

Every initialization is defensive: a failure to reach an external service is
logged but does not prevent the app from starting, so the currently working
(legacy) routes keep serving. Resources are exposed on ``app.state``.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.infrastructure.redis import create_cache
from app.infrastructure.database import check_connection, dispose_engine
from app.infrastructure.http import HTTPClientManager
from app.integrations.ai.deepseek_client import DeepSeekClient
from app.integrations.search.serpapi_client import SerpAPIClient
from app.integrations.storage import supabase_storage
from app.agents.conversation import ConversationAgent
from app.agents.research import ResearchAgent
from app.agents.admissions import AdmissionsAgent
from app.agents.matching import MatchingAgent
from app.modules.admissions.service import AdmissionsService
from app.modules.recommendations.service import MatchingService
from app.modules.research.service import ResearchService
from app.prompts.registry import PromptRegistry
from app.runtime.agent_registry import AgentRegistry
from app.runtime.context_builder import ContextBuilder
from app.runtime.intent_router import IntentRouter
from app.runtime.orchestrator import Orchestrator
from app.runtime.pipeline_runner import PipelineRunner

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging("DEBUG" if settings.debug else "INFO")
    app.state.settings = settings

    # Shared HTTP client (required before the DeepSeek client).
    http_manager = HTTPClientManager()
    await http_manager.start(timeout=settings.deepseek_timeout_seconds)
    app.state.http = http_manager

    # DeepSeek client reusing the shared connection pool.
    app.state.deepseek = DeepSeekClient(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
        model=settings.deepseek_model,
        http_client=http_manager.client,
        timeout_seconds=settings.deepseek_timeout_seconds,
        max_retries=settings.deepseek_max_retries,
    )

    # Prompt templates compiled once (tolerate none existing yet).
    registry = PromptRegistry()
    try:
        registry.load()
    except Exception as exc:  # noqa: BLE001
        logger.warning("prompt_registry_load_failed", extra={"error": str(exc)})
    app.state.prompts = registry

    # Cache (Redis when configured/reachable, else in-memory).
    app.state.cache = await create_cache(settings)

    # Ensure the private document-storage bucket exists (best-effort).
    try:
        await run_in_threadpool(supabase_storage.ensure_bucket)
    except Exception as exc:  # noqa: BLE001
        logger.warning("storage_bucket_init_failed", extra={"error": str(exc)})

    # Web research: SerpAPI client + cache-first research service.
    app.state.serpapi = SerpAPIClient(
        api_key=settings.serpapi_api_key,
        http_client=http_manager.client,
        timeout_seconds=settings.serpapi_timeout_seconds,
    )
    app.state.research_service = ResearchService(
        serpapi=app.state.serpapi,
        deepseek=app.state.deepseek,
        prompts=registry,
        cache=app.state.cache,
        cache_ttl_seconds=settings.research_cache_ttl_seconds,
    )

    # Runtime: routing + registry + orchestration. Agents are registered here
    # as they are migrated onto the new contract.
    app.state.agent_registry = AgentRegistry()
    app.state.agent_registry.register(
        ConversationAgent(deepseek=app.state.deepseek, prompts=registry)
    )
    app.state.agent_registry.register(
        ResearchAgent(research_service=app.state.research_service)
    )
    app.state.admissions_service = AdmissionsService(
        deepseek=app.state.deepseek,
        prompts=registry,
        research_service=app.state.research_service,
    )
    app.state.agent_registry.register(
        AdmissionsAgent(admissions_service=app.state.admissions_service)
    )
    app.state.matching_service = MatchingService()
    app.state.agent_registry.register(
        MatchingAgent(matching_service=app.state.matching_service)
    )
    app.state.intent_router = IntentRouter(
        deepseek_client=app.state.deepseek, prompt_registry=registry
    )
    app.state.context_builder = ContextBuilder()
    app.state.pipeline_runner = PipelineRunner()
    app.state.orchestrator = Orchestrator(
        registry=app.state.agent_registry,
        router=app.state.intent_router,
        context_builder=app.state.context_builder,
        pipeline_runner=app.state.pipeline_runner,
    )

    # Non-fatal database connectivity probe.
    if settings.is_database_configured:
        await check_connection()
    else:
        logger.warning("async_database_not_configured")

    logger.info("app_startup_complete", extra={"environment": settings.environment})
    try:
        yield
    finally:
        await http_manager.stop()
        try:
            await app.state.cache.close()
        except Exception:  # noqa: BLE001
            pass
        await dispose_engine()
        logger.info("app_shutdown_complete")

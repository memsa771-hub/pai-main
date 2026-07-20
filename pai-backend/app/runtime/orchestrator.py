"""Request orchestrator (CLAUDE.md section 13).

Plain Python coordination of the request flow:

    route (deterministic first) -> build task-relevant context -> select one
    agent from the registry -> run it -> validated AgentResult.

Message persistence and profile/goal application are performed by an injected
`MessageStore` when available, so this orchestrator stays decoupled from any
specific persistence module during the migration. When no store is provided,
those steps are simply skipped (agents still run and return results).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol

from app.agents.base import AgentResult
from app.core.logging import get_logger
from app.runtime.agent_registry import AgentRegistry
from app.runtime.context_builder import ContextBuilder, ContextSource
from app.runtime.intent_router import IntentRouter, RouteDecision, classify_rules
from app.runtime.pipeline_runner import PipelineRunner
from app.runtime.response_stream import (
    StreamEvent,
    chunk_reply,
    status_for_intent,
)

logger = get_logger(__name__)


class MessageStore(Protocol):
    """Persistence hooks used around agent execution (optional)."""

    async def ensure_session(self, user_id: str, session_id: str | None, first_message: str) -> str: ...
    async def save_user_message(self, session_id: str, text: str) -> None: ...
    async def save_assistant_message(self, session_id: str, result: AgentResult) -> None: ...


class ProfileWriter(Protocol):
    """Applies profile/goal updates produced by an agent (optional)."""

    async def apply(
        self,
        user_id: str,
        profile_updates: dict,
        goal_updates: list[dict],
    ) -> object: ...


@dataclass(slots=True)
class OrchestratorOutcome:
    session_id: str
    result: AgentResult
    route: RouteDecision


class Orchestrator:
    def __init__(
        self,
        *,
        registry: AgentRegistry,
        router: IntentRouter,
        context_builder: ContextBuilder,
        pipeline_runner: PipelineRunner,
        message_store: MessageStore | None = None,
    ) -> None:
        self._registry = registry
        self._router = router
        self._context_builder = context_builder
        self._pipeline = pipeline_runner
        self._store = message_store

    async def handle(
        self,
        *,
        user_id: str,
        message: str,
        session_id: str | None = None,
        context_source: ContextSource | None = None,
        message_store: MessageStore | None = None,
        profile_writer: ProfileWriter | None = None,
        extra_context: dict | None = None,
        use_ai_routing: bool = True,
    ) -> OrchestratorOutcome:
        store = message_store if message_store is not None else self._store

        # 1. Get or create the conversation and persist the user message.
        if store is not None:
            session_id = await store.ensure_session(user_id, session_id, message)
            await store.save_user_message(session_id, message)
        elif not session_id:
            session_id = "session-ephemeral"

        # 2. Deterministic routing first (AI only if enabled and ambiguous).
        route = await self._router.route(message) if use_ai_routing else classify_rules(message)

        # 3. Build the task-relevant context once.
        context = await self._context_builder.build(
            user_id=user_id,
            session_id=session_id,
            message=message,
            intent=route.intent,
            source=context_source,
        )

        # Attach any per-request extra context (e.g. matching candidates).
        if extra_context:
            context.cached_data.update(extra_context)

        # 4. Select one primary agent and run it.
        agent = self._registry.get(route.agent)
        result = await self._pipeline.run(agent, context)

        # 5. Apply any profile/goal updates extracted in the same AI call.
        if profile_writer is not None and (result.profile_updates or result.goal_updates):
            try:
                await profile_writer.apply(user_id, result.profile_updates, result.goal_updates)
            except Exception:  # enrichment must never break the chat response
                logger.warning(
                    "profile_enrichment_failed",
                    extra={"user_id": user_id, "session_id": session_id},
                    exc_info=True,
                )

        # 6. Persist the assistant response (when a store is wired).
        if store is not None:
            await store.save_assistant_message(session_id, result)

        logger.info(
            "orchestration_complete",
            extra={
                "user_id": user_id,
                "session_id": session_id,
                "intent": route.intent,
                "selected_agent": route.agent,
                "routing_method": route.method,
                "status": result.status,
            },
        )
        return OrchestratorOutcome(session_id=session_id, result=result, route=route)

    async def stream(
        self,
        *,
        user_id: str,
        message: str,
        session_id: str | None = None,
        context_source: ContextSource | None = None,
        message_store: MessageStore | None = None,
        profile_writer: ProfileWriter | None = None,
        extra_context: dict | None = None,
        use_ai_routing: bool = True,
    ) -> AsyncIterator[StreamEvent]:
        """Same flow as ``handle`` but yields SSE-ready progress events.

        Status events are emitted before the slow AI call so the user sees
        progress immediately; the final reply is streamed as ``token`` events.
        """
        store = message_store if message_store is not None else self._store

        yield StreamEvent("status", {"message": "Understanding your question"})

        if store is not None:
            session_id = await store.ensure_session(user_id, session_id, message)
            await store.save_user_message(session_id, message)
        elif not session_id:
            session_id = "session-ephemeral"

        route = await self._router.route(message) if use_ai_routing else classify_rules(message)

        yield StreamEvent("status", {"message": "Reviewing your profile"})
        context = await self._context_builder.build(
            user_id=user_id,
            session_id=session_id,
            message=message,
            intent=route.intent,
            source=context_source,
        )
        if extra_context:
            context.cached_data.update(extra_context)

        yield StreamEvent("status", {"message": status_for_intent(route.intent)})

        agent = self._registry.get(route.agent)
        result = await self._pipeline.run(agent, context)

        if profile_writer is not None and (result.profile_updates or result.goal_updates):
            try:
                await profile_writer.apply(user_id, result.profile_updates, result.goal_updates)
            except Exception:  # enrichment must never break the response
                logger.warning(
                    "profile_enrichment_failed",
                    extra={"user_id": user_id, "session_id": session_id},
                    exc_info=True,
                )

        # Stream the reply progressively.
        for piece in chunk_reply(result.reply):
            yield StreamEvent("token", {"text": piece})

        message_id: str | None = None
        if store is not None:
            await store.save_assistant_message(session_id, result)
            last = getattr(store, "last_assistant_message", None)
            if isinstance(last, dict):
                message_id = last.get("id")

        yield StreamEvent(
            "metadata",
            {
                "quick_replies": [q.model_dump() for q in result.quick_replies],
                "sources": [s.model_dump() for s in result.sources],
                "recommendations": result.data.get("recommendations"),
                "requires_profile_data": len(result.quick_replies) > 0,
                "suggested_options": [q.label for q in result.quick_replies],
            },
        )

        logger.info(
            "orchestration_stream_complete",
            extra={
                "user_id": user_id,
                "session_id": session_id,
                "intent": route.intent,
                "selected_agent": route.agent,
                "status": result.status,
            },
        )
        yield StreamEvent(
            "complete",
            {
                "session_id": session_id,
                "message_id": message_id,
                "intent": route.intent,
                "status": result.status,
            },
        )

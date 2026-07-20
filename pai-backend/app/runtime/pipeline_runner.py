"""Runs a single primary agent (CLAUDE.md sections 6.2, 13).

A normal message invokes exactly one agent. The runner centralizes timing,
error capture and result validation so an agent failure becomes a well-formed
`AgentResult` (status="failed") instead of a raw exception reaching the client.
"""

from __future__ import annotations

import time

from app.agents.base import Agent, AgentResult
from app.core.exceptions import PAIError
from app.core.logging import get_logger
from app.runtime.context import RequestContext

logger = get_logger(__name__)


class PipelineRunner:
    async def run(self, agent: Agent, context: RequestContext) -> AgentResult:
        started = time.perf_counter()
        try:
            result = await agent.run(context)
            if not isinstance(result, AgentResult):
                raise PAIError(
                    "Agent returned an invalid result type.",
                    error_code="invalid_agent_result",
                )
            duration_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "agent_completed",
                extra={
                    "agent": agent.name,
                    "intent": result.intent,
                    "status": result.status,
                    "agent_duration_ms": round(duration_ms, 1),
                },
            )
            return result
        except PAIError as exc:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.warning(
                "agent_failed",
                extra={
                    "agent": getattr(agent, "name", "unknown"),
                    "error_code": exc.error_code,
                    "agent_duration_ms": round(duration_ms, 1),
                },
            )
            return AgentResult(
                agent=getattr(agent, "name", "unknown"),
                intent=context.intent or "unknown",
                status="failed",
                reply="Sorry, I couldn't complete that just now. Please try again.",
                error_code=exc.error_code,
            )
        except Exception as exc:  # noqa: BLE001 - convert any failure into a safe result
            duration_ms = (time.perf_counter() - started) * 1000
            logger.error(
                "agent_crashed",
                extra={
                    "agent": getattr(agent, "name", "unknown"),
                    "error": str(exc),
                    "agent_duration_ms": round(duration_ms, 1),
                },
            )
            return AgentResult(
                agent=getattr(agent, "name", "unknown"),
                intent=context.intent or "unknown",
                status="failed",
                reply="Sorry, something went wrong on my side. Please try again.",
                error_code="agent_execution_error",
            )

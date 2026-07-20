"""Agent registry (CLAUDE.md sections 6.1, 13).

Agents are registered once during startup and resolved in-process by key. This
is the only place the orchestrator looks up an agent; agents never look up or
call each other.
"""

from __future__ import annotations

from app.agents.base import Agent
from app.core.exceptions import AgentExecutionError
from app.core.logging import get_logger

logger = get_logger(__name__)


class AgentRegistry:
    def __init__(self) -> None:
        self._agents: dict[str, Agent] = {}

    def register(self, agent: Agent) -> None:
        key = agent.name
        if key in self._agents:
            logger.warning("agent_overwritten", extra={"agent": key})
        self._agents[key] = agent
        logger.info("agent_registered", extra={"agent": key})

    def get(self, key: str) -> Agent:
        agent = self._agents.get(key)
        if agent is None:
            raise AgentExecutionError(
                f"No agent registered for '{key}'.", error_code="agent_not_found"
            )
        return agent

    def has(self, key: str) -> bool:
        return key in self._agents

    @property
    def keys(self) -> list[str]:
        return sorted(self._agents)

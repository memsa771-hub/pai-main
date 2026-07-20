"""Conversation agent (CLAUDE.md section 10.1).

Handles greetings, general counselling, career direction, open-ended guidance,
onboarding and follow-up questions. It produces the final reply AND its quick
replies in a single DeepSeek call — there is no separate quick-reply evaluation
and no separate response agent (section 9).
"""

from __future__ import annotations

import json
from typing import Any

from app.agents.base import AgentResult, BaseAgent, QuickReply
from app.core.exceptions import ExternalProviderError
from app.core.logging import get_logger
from app.integrations.ai.deepseek_client import DeepSeekClient
from app.prompts.registry import PromptRegistry
from app.runtime.context import RequestContext

logger = get_logger(__name__)

_MAX_QUICK_REPLIES = 5


class ConversationAgent(BaseAgent):
    name = "conversation"

    def __init__(self, *, deepseek: DeepSeekClient, prompts: PromptRegistry) -> None:
        self._deepseek = deepseek
        self._prompts = prompts

    async def run(self, context: RequestContext) -> AgentResult:
        profile = context.profile or {}
        goals = context.goals or profile.get("goals") or []
        full_name = str(profile.get("full_name") or "").strip()
        first_name = full_name.split()[0] if full_name else "there"

        system_prompt = self._prompts.render(
            "conversation/system",
            first_name=first_name,
            profile_json=json.dumps(profile, ensure_ascii=False, indent=2),
            has_goals=bool(goals),
            has_education=bool(profile.get("education")),
            has_documents=bool(profile.get("uploaded_documents") or context.document_ids),
            language_style=context.language_style,
        )

        messages = [{"role": "system", "content": system_prompt}]
        for msg in context.recent_messages:
            role = "assistant" if msg.get("sender") == "ai" else "user"
            text = msg.get("text", "")
            if text:
                messages.append({"role": role, "content": text})
        messages.append({"role": "user", "content": context.message})

        data = await self._deepseek.complete_json(messages, temperature=0.4)
        reply = str(data.get("reply") or "").strip()
        if not reply:
            raise ExternalProviderError(
                "Conversation agent produced an empty reply.",
                error_code="empty_reply",
            )

        quick_replies = _parse_quick_replies(data.get("quick_replies"))
        profile_updates = data.get("profile_updates") if isinstance(data.get("profile_updates"), dict) else {}
        goal_updates = [g for g in data.get("goal_updates") or [] if isinstance(g, dict)]
        return self._result(
            intent=context.intent or "general_counselling",
            reply=reply,
            quick_replies=quick_replies,
            profile_updates=profile_updates,
            goal_updates=goal_updates,
        )


def _parse_quick_replies(raw: Any) -> list[QuickReply]:
    if not isinstance(raw, list):
        return []
    parsed: list[QuickReply] = []
    for item in raw[:_MAX_QUICK_REPLIES]:
        if isinstance(item, str):
            label = item.strip()
            if label:
                parsed.append(QuickReply(label=label[:40], value=label))
        elif isinstance(item, dict):
            label = str(item.get("label") or item.get("value") or "").strip()
            value = str(item.get("value") or item.get("label") or "").strip()
            if label:
                parsed.append(QuickReply(label=label[:40], value=value or label))
    return parsed

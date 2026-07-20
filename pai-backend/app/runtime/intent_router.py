"""Two-stage intent router (CLAUDE.md section 11).

Stage 1 is deterministic Python rules (English + Roman Urdu) and runs on every
message in well under a millisecond. Stage 2 is a single strict-JSON DeepSeek
classification that is used *only* when the rules are not confident enough. The
AI stage classifies — it never writes the final answer.

Routing maps an intent to exactly one primary agent (section 6.2). The
intent->agent mapping is centralized here so it is trivial to adjust.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.core.logging import get_logger

logger = get_logger(__name__)

# The 12 recognized intents (section 11).
ALLOWED_INTENTS: tuple[str, ...] = (
    "casual",
    "profile_update",
    "document_upload",
    "local_admission",
    "international_admission",
    "university_research",
    "scholarship_research",
    "matching_request",
    "career_guidance",
    "roadmap_request",
    "tracker_request",
    "general_counselling",
)

# Each intent resolves to a single primary agent (section 6.2 / section 10).
# Keys are agent registry identifiers. Adjust here to re-route intents.
INTENT_TO_AGENT: dict[str, str] = {
    "casual": "conversation",
    "general_counselling": "conversation",
    "career_guidance": "conversation",
    # Profile/document intents ride the conversation agent (inline enrichment /
    # upload guidance) — dedicated profile/document agents are not required for
    # Phase 1 chat turns (CLAUDE.md §6.2 one primary agent).
    "profile_update": "conversation",
    "document_upload": "conversation",
    "local_admission": "admissions",
    "international_admission": "admissions",
    "university_research": "research",
    "scholarship_research": "research",
    "matching_request": "matching",
    "roadmap_request": "matching",
    "tracker_request": "research",
}

DEFAULT_INTENT = "general_counselling"

# Confidence at or above which the rule decision is trusted without AI fallback.
RULE_CONFIDENCE_THRESHOLD = 0.6

# Ordered by specificity: more specific intents are checked with higher weight so
# that, e.g., "scholarship" wins over a generic "study abroad" mention. Patterns
# cover English, Urdu-script keywords and Roman Urdu expressions (section 11).
_RULES: dict[str, list[str]] = {
    "document_upload": [
        r"\b(cv|resume|transcript|degree|certificate|ielts|toefl)\b",
        r"\bupload(ed|ing)?\b",
        r"\bdocument(s)?\b",
        r"attach(ed|ment)?",
        r"mere paas.*(cv|transcript|document)",
    ],
    "scholarship_research": [
        r"\bscholarship(s)?\b",
        r"scholarship chahiye",
        r"\bfunding\b",
        r"financial aid",
        r"\bwazifa\b",
        r"fully funded",
    ],
    "local_admission": [
        r"\bmerit\b",
        r"merit calculate karo",
        r"\baggregate\b",
        r"mera aggregate",
        r"\b(fast|nuces|nust|giki|uet|mdcat|ecat|comsats|pieas)\b",
        r"local admission",
        r"domestic admission",
    ],
    "international_admission": [
        r"\babroad\b",
        r"bahar jana",
        r"abroad jana",
        r"study abroad",
        r"\b(germany|sweden|canada|uk|usa|america|australia|netherlands|norway|finland)\b",
        r"foreign (university|admission)",
        r"masters? (abroad|karna)",
    ],
    "matching_request": [
        r"kahan apply",
        r"where (can|should) i apply",
        r"mere profile ke hisab se",
        r"\brecommend\b",
        r"suggest (me )?universit",
        r"best (fit|match)",
        r"options batao",
        r"which universit(y|ies) (should|can)",
    ],
    "university_research": [
        r"\btuition\b",
        r"\bfees\b",
        r"\bdeadline(s)?\b",
        r"admission requirement",
        r"tell me about .*universit",
        r"universit(y|ies) in\b",
        r"program(s)? (at|in)\b",
        r"eligibility (criteria|requirement)",
    ],
    "roadmap_request": [
        r"\broadmap\b",
        r"step by step",
        r"\btimeline\b",
        r"action plan",
        r"plan (banao|bana do)",
    ],
    "tracker_request": [
        r"\btracker\b",
        r"track (this|these)? ?universit",
        r"my (saved|tracked) universit",
        r"add to (my )?(list|tracker)",
    ],
    "career_guidance": [
        r"\bcareer\b",
        r"career batao",
        r"job options batao",
        r"\bjob(s)?\b",
        r"kya parh(un|na)",
        r"what should i (study|do)",
        r"kaunsa field",
    ],
    "profile_update": [
        r"my (cgpa|gpa) is",
        r"mera (cgpa|gpa)",
        r"i (have )?(completed|did|studied)",
        r"main ne .* (kiya|ki|kia)",
        r"add .* to my profile",
        r"my (phone|linkedin|email) is",
        r"meri degree",
        r"\bi did my\b",
    ],
    "general_counselling": [
        r"mujhe samajh nahi",
        r"samajh nahi aa raha",
        r"i(?:'m| am)? confused",
        r"guide me",
        r"help me (decide|choose|understand)",
        r"pata nahi",
    ],
    "casual": [
        r"^\s*(hi+|hey+|hello+|yo|sup)\b",
        r"^\s*(salam|assalam|aoa|as-salam)",
        r"\bthank(s| you)\b",
        r"\bshukriya\b",
        r"^\s*(ok(ay)?|k|cool|nice|great|theek)\s*$",
        r"good (morning|afternoon|evening|night)",
        r"how are you",
    ],
}

_COMPILED: dict[str, list[re.Pattern[str]]] = {
    intent: [re.compile(p, re.IGNORECASE) for p in patterns]
    for intent, patterns in _RULES.items()
}


@dataclass(slots=True)
class RouteDecision:
    intent: str
    agent: str
    confidence: float
    method: str  # "rules" | "ai" | "fallback"
    scores: dict[str, int] = field(default_factory=dict)
    alternates: list[str] = field(default_factory=list)


def _agent_for(intent: str) -> str:
    return INTENT_TO_AGENT.get(intent, INTENT_TO_AGENT[DEFAULT_INTENT])


def classify_rules(message: str) -> RouteDecision:
    """Stage 1: deterministic scoring. Never raises; always returns a decision."""
    scores: dict[str, int] = {}
    for intent, patterns in _COMPILED.items():
        hits = sum(1 for pattern in patterns if pattern.search(message))
        if hits:
            scores[intent] = hits

    if not scores:
        return RouteDecision(
            intent=DEFAULT_INTENT,
            agent=_agent_for(DEFAULT_INTENT),
            confidence=0.0,
            method="rules",
            scores=scores,
        )

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    best_intent, best_hits = ranked[0]

    # A short message that only matched "casual" stays casual; otherwise a real
    # intent present alongside a greeting should win.
    if best_intent == "casual" and len(ranked) > 1:
        best_intent, best_hits = ranked[1]

    second_hits = ranked[1][1] if len(ranked) > 1 else 0
    # Confidence grows with hit count and the margin over the runner-up.
    confidence = min(1.0, 0.45 + 0.2 * best_hits + 0.1 * (best_hits - second_hits))
    if best_intent == "casual":
        confidence = max(confidence, 0.8)

    return RouteDecision(
        intent=best_intent,
        agent=_agent_for(best_intent),
        confidence=round(confidence, 3),
        method="rules",
        scores=scores,
        alternates=[i for i, _ in ranked[1:4]],
    )


class IntentRouter:
    """Combines deterministic rules with an optional AI fallback."""

    def __init__(self, deepseek_client=None, prompt_registry=None) -> None:  # type: ignore[no-untyped-def]
        self._deepseek = deepseek_client
        self._prompts = prompt_registry

    async def route(self, message: str) -> RouteDecision:
        decision = classify_rules(message)
        if decision.confidence >= RULE_CONFIDENCE_THRESHOLD:
            logger.info(
                "intent_routed",
                extra={"intent": decision.intent, "method": "rules", "confidence": decision.confidence},
            )
            return decision

        ai_decision = await self._classify_ai(message)
        if ai_decision is not None:
            logger.info(
                "intent_routed",
                extra={"intent": ai_decision.intent, "method": "ai", "confidence": ai_decision.confidence},
            )
            return ai_decision

        # No AI available or it failed: keep the best rule guess as a fallback.
        fallback = RouteDecision(
            intent=decision.intent,
            agent=decision.agent,
            confidence=decision.confidence,
            method="fallback",
            scores=decision.scores,
            alternates=decision.alternates,
        )
        logger.info(
            "intent_routed",
            extra={"intent": fallback.intent, "method": "fallback", "confidence": fallback.confidence},
        )
        return fallback

    async def _classify_ai(self, message: str) -> RouteDecision | None:
        if self._deepseek is None:
            return None
        try:
            system = self._render_prompt()
            data = await self._deepseek.complete_json(
                [
                    {"role": "system", "content": system},
                    {"role": "user", "content": message},
                ],
                temperature=0.0,
            )
        except Exception as exc:  # noqa: BLE001 - fallback must not crash routing
            logger.warning("ai_routing_failed", extra={"error": str(exc)})
            return None

        intent = str(data.get("intent", "")).strip()
        if intent not in ALLOWED_INTENTS:
            intent = DEFAULT_INTENT
        try:
            confidence = float(data.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        return RouteDecision(
            intent=intent,
            agent=_agent_for(intent),
            confidence=round(min(max(confidence, 0.0), 1.0), 3),
            method="ai",
        )

    def _render_prompt(self) -> str:
        if self._prompts is not None and self._prompts.has("routing/classify"):
            return self._prompts.render("routing/classify", intents=list(ALLOWED_INTENTS))
        intents = ", ".join(ALLOWED_INTENTS)
        return (
            "You are the intent classifier for Placement AI. Classify the student's "
            "message into exactly one intent. Do not answer the message.\n"
            f"Allowed intents: {intents}.\n"
            'Return strictly JSON: {"intent": "<one_intent>", "confidence": <0..1>}.'
        )

"""Runtime tests: routing, registry, context builder, orchestrator, streaming."""

from __future__ import annotations

import pytest

from app.agents.base import AgentResult, BaseAgent, QuickReply
from app.runtime.agent_registry import AgentRegistry
from app.runtime.context_builder import ContextBuilder, detect_language_style
from app.runtime.intent_router import INTENT_TO_AGENT, IntentRouter, classify_rules
from app.runtime.orchestrator import Orchestrator
from app.runtime.pipeline_runner import PipelineRunner


# --- Intent router (rules) --------------------------------------------------

@pytest.mark.parametrize(
    "message,expected",
    [
        ("Tell me about tuition fees and deadlines", "university_research"),
        ("I need a fully funded scholarship", "scholarship_research"),
        ("calculate my FAST merit aggregate", "local_admission"),
        ("I want to study abroad in Germany", "international_admission"),
        ("where should I apply based on my profile", "matching_request"),
        ("hi there", "casual"),
    ],
)
def test_rule_routing(message, expected):
    assert classify_rules(message).intent == expected


def test_roman_urdu_routing():
    assert classify_rules("mujhe scholarship chahiye").intent == "scholarship_research"
    assert classify_rules("bahar jana hai study ke liye").intent == "international_admission"
    assert classify_rules("merit calculate karo NUST ka").intent == "local_admission"


def test_greeting_plus_real_intent_prefers_real():
    # "hi" + scholarship -> scholarship wins over casual
    assert classify_rules("hi, mujhe scholarship chahiye").intent == "scholarship_research"


def test_unknown_defaults_to_general_counselling():
    assert classify_rules("qwerty zxcv").intent == "general_counselling"


def test_intent_agent_mapping():
    assert INTENT_TO_AGENT["university_research"] == "research"
    assert INTENT_TO_AGENT["local_admission"] == "admissions"
    assert INTENT_TO_AGENT["matching_request"] == "matching"


async def test_router_uses_rules_without_ai():
    router = IntentRouter()  # no deepseek
    decision = await router.route("calculate my NUST merit")
    assert decision.intent == "local_admission"
    assert decision.method in ("rules", "fallback")


# --- Language detection -----------------------------------------------------

def test_language_detection():
    assert detect_language_style("Hello, how are you?") == "en"
    assert detect_language_style("mujhe abroad jana hai yaar") == "roman_ur"
    assert detect_language_style("مجھے اسکالرشپ چاہیے") == "ur"


# --- Agent registry ---------------------------------------------------------

class _Stub(BaseAgent):
    name = "conversation"

    async def run(self, context):
        return AgentResult(
            agent=self.name, intent=context.intent or "casual", status="success",
            reply="Hi friend how are you today",
            quick_replies=[QuickReply(label="Study abroad", value="study abroad")],
        )


def test_agent_registry():
    reg = AgentRegistry()
    agent = _Stub()
    reg.register(agent)
    assert reg.has("conversation")
    assert reg.get("conversation") is agent
    assert not reg.has("missing")


# --- Context builder --------------------------------------------------------

async def test_context_builder_defaults():
    ctx = await ContextBuilder().build(
        user_id="1", session_id="s1", message="hello there", intent="casual"
    )
    assert ctx.user_id == "1" and ctx.intent == "casual"
    assert ctx.profile == {} and ctx.goals == [] and ctx.language_style == "en"


# --- Orchestrator + streaming ----------------------------------------------

class _FakeStore:
    def __init__(self):
        self.last_assistant_message = None
        self.saved_user = None

    async def ensure_session(self, user_id, session_id, first_message):
        return session_id or "session-new"

    async def save_user_message(self, session_id, text):
        self.saved_user = text

    async def save_assistant_message(self, session_id, result):
        self.last_assistant_message = {"id": "msg-1", "text": result.reply}


def _orchestrator():
    reg = AgentRegistry()
    reg.register(_Stub())
    return Orchestrator(
        registry=reg,
        router=IntentRouter(),
        context_builder=ContextBuilder(),
        pipeline_runner=PipelineRunner(),
    )


async def test_orchestrator_handle():
    store = _FakeStore()
    outcome = await _orchestrator().handle(
        user_id="1", message="hello", session_id="s1",
        message_store=store, use_ai_routing=False,
    )
    assert outcome.result.reply.startswith("Hi friend")
    assert store.saved_user == "hello"
    assert store.last_assistant_message["id"] == "msg-1"


async def test_orchestrator_stream_sequence():
    store = _FakeStore()
    events = [
        ev async for ev in _orchestrator().stream(
            user_id="1", message="hello", session_id="s1",
            message_store=store, use_ai_routing=False,
        )
    ]
    names = [e.event for e in events]
    assert names[0] == "status"
    assert "token" in names
    assert names[-2:] == ["metadata", "complete"]
    reply = "".join(e.data["text"] for e in events if e.event == "token")
    assert reply == "Hi friend how are you today"
    assert events[-1].data["message_id"] == "msg-1"


async def test_pipeline_wraps_agent_failure():
    class _Boom(BaseAgent):
        name = "conversation"

        async def run(self, context):
            raise RuntimeError("kaboom")

    reg = AgentRegistry()
    reg.register(_Boom())
    orch = Orchestrator(
        registry=reg, router=IntentRouter(),
        context_builder=ContextBuilder(), pipeline_runner=PipelineRunner(),
    )
    outcome = await orch.handle(user_id="1", message="hello", use_ai_routing=False)
    assert outcome.result.status == "failed"
    assert outcome.result.error_code

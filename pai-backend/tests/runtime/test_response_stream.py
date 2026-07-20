"""Tests for SSE streaming helpers (CLAUDE.md section 22)."""

from __future__ import annotations

from app.runtime.response_stream import (
    StreamEvent,
    chunk_reply,
    format_sse,
    status_for_intent,
)


def test_format_sse_wire_format():
    out = format_sse(StreamEvent("status", {"message": "hi"}))
    assert out == 'event: status\ndata: {"message": "hi"}\n\n'


def test_format_sse_unicode_preserved():
    out = format_sse(StreamEvent("token", {"text": "مجھے"}))
    assert "مجھے" in out


def test_chunk_reply_is_lossless():
    text = "Based on your current profile you should apply soon to funded programs"
    assert "".join(chunk_reply(text)) == text


def test_chunk_reply_empty():
    assert list(chunk_reply("")) == []


def test_chunk_reply_produces_multiple_chunks():
    text = " ".join(f"word{i}" for i in range(20))
    chunks = list(chunk_reply(text, words_per_chunk=4))
    assert len(chunks) >= 4
    assert "".join(chunks) == text


def test_status_for_intent():
    assert status_for_intent("local_admission")
    assert status_for_intent(None)  # falls back to a default, never empty

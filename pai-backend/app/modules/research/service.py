"""Research service (CLAUDE.md section 16).

Database-first (cache-first) research flow:

    check cache -> [check Supabase*] -> if missing/expired call SerpAPI ->
    identify official source -> fetch official page -> extract structured facts ->
    validate -> attach source metadata -> cache -> return

*Persistent Supabase fact storage arrives with the async DB migration (Step 20);
until then the cache is the durable layer and the source of truth remains the
official page fetched at research time.

Search snippets are never treated as confirmed official facts, and facts are
never fabricated (the extractor is instructed to omit unsupported values). When
no sources can be reached the result is returned with ``status="unavailable"``
and low confidence so callers can respond honestly.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.exceptions import PAIError
from app.core.logging import get_logger
from app.infrastructure.redis import Cache
from app.integrations.ai.deepseek_client import DeepSeekClient
from app.integrations.search.serpapi_client import SearchResult, SerpAPIClient
from app.modules.research.schemas import ResearchKind, ResearchResult, SourceMeta
from app.prompts.registry import PromptRegistry

logger = get_logger(__name__)

_MAX_RESULTS = 6


class ResearchService:
    def __init__(
        self,
        *,
        serpapi: SerpAPIClient,
        deepseek: DeepSeekClient,
        prompts: PromptRegistry,
        cache: Cache,
        cache_ttl_seconds: int = 86400,
    ) -> None:
        self._serpapi = serpapi
        self._deepseek = deepseek
        self._prompts = prompts
        self._cache = cache
        self._ttl = cache_ttl_seconds

    async def research(
        self,
        kind: ResearchKind,
        subject: str,
        *,
        profile_hints: dict[str, Any] | None = None,
    ) -> ResearchResult:
        subject = (subject or "").strip()
        if not subject:
            return ResearchResult(
                kind=kind, subject=subject, summary="", status="unavailable"
            )

        # 1. Cache first.
        cache_key = self._cache_key(kind, subject)
        cached = await self._cache.get(cache_key)
        if cached:
            try:
                logger.info("research_cache_hit", extra={"kind": kind, "subject": subject})
                return ResearchResult.model_validate_json(cached)
            except Exception:  # noqa: BLE001 - stale/incompatible cache entry
                await self._cache.delete(cache_key)

        # 2. Search (SerpAPI). No key/results -> honest unavailable result.
        results = await self._serpapi.search(self._build_query(kind, subject), num=_MAX_RESULTS)
        if not results:
            return ResearchResult(
                kind=kind,
                subject=subject,
                summary=(
                    "I don't have live research access to verified sources for that "
                    "right now, so I can't confirm specific figures. Share what you "
                    "already know and I'll help you plan around it."
                ),
                status="unavailable",
                confidence=0.1,
            )

        # 3. Identify the official/most authoritative source and fetch its page.
        official = self._serpapi.pick_official(results)
        official_page = None
        if official is not None:
            official_page = await self._serpapi.fetch_page_text(official.url)

        # 4. Extract structured facts + a natural summary in a single AI call.
        prompt = self._prompts.render(
            "research/extract",
            kind=kind,
            subject=subject,
            profile_hint=_format_hints(profile_hints),
            official_url=official.url if official else None,
            official_type=official.source_type if official else "none",
            official_page=official_page,
            search_context=_format_results(results),
        )
        try:
            data = await self._deepseek.complete_json(
                [{"role": "system", "content": prompt}], temperature=0.2
            )
        except PAIError as exc:
            logger.warning(
                "research_extract_failed",
                extra={"kind": kind, "error_code": getattr(exc, "error_code", None)},
            )
            return ResearchResult(
                kind=kind,
                subject=subject,
                summary=(
                    "I found some sources but couldn't compile them just now. "
                    "Please try again in a moment."
                ),
                status="unavailable",
                confidence=0.1,
            )

        result = self._build_result(kind, subject, data, results, official, bool(official_page))

        # 5. Cache the verified/unverified result.
        try:
            await self._cache.set(cache_key, result.cache_payload(), self._ttl)
        except Exception:  # noqa: BLE001 - cache must never break research
            pass
        return result

    # ---- helpers -----------------------------------------------------------

    def _build_result(
        self,
        kind: ResearchKind,
        subject: str,
        data: dict[str, Any],
        results: list[SearchResult],
        official: SearchResult | None,
        used_official_page: bool,
    ) -> ResearchResult:
        summary = str(data.get("summary") or "").strip()
        facts = data.get("facts") if isinstance(data.get("facts"), dict) else {}
        valid_for_intake = _as_str(data.get("valid_for_intake"))
        model_confidence = _as_float(data.get("confidence"), 0.5)

        now = datetime.now(timezone.utc)
        verified_at = now.isoformat()
        expires_at = (now + timedelta(seconds=self._ttl)).isoformat()

        sources: list[SourceMeta] = []
        if official is not None:
            # Official-page-derived facts are trusted more than snippet-derived.
            src_confidence = min(1.0, model_confidence + (0.2 if used_official_page else 0.0))
            sources.append(
                SourceMeta(
                    source_url=official.url,
                    source_type=official.source_type,
                    last_verified_at=verified_at,
                    valid_for_intake=valid_for_intake,
                    confidence=round(src_confidence, 3),
                    expires_at=expires_at,
                    title=official.title or None,
                )
            )
        # Include up to two supporting sources for transparency.
        for r in results:
            if official is not None and r.url == official.url:
                continue
            sources.append(
                SourceMeta(
                    source_url=r.url,
                    source_type=r.source_type,
                    last_verified_at=verified_at,
                    valid_for_intake=valid_for_intake,
                    confidence=round(model_confidence * 0.5, 3),
                    expires_at=expires_at,
                    title=r.title or None,
                )
            )
            if len(sources) >= 3:
                break

        has_official = official is not None and official.source_type != "secondary"
        status = "verified" if (has_official and used_official_page and facts) else "unverified"
        overall_conf = sources[0].confidence if sources else model_confidence

        return ResearchResult(
            kind=kind,
            subject=subject,
            summary=summary or "Here's what I found.",
            facts=facts,
            sources=sources,
            confidence=round(overall_conf, 3),
            status=status,
        )

    @staticmethod
    def _build_query(kind: ResearchKind, subject: str) -> str:
        if kind == "scholarship":
            return f"{subject} scholarship eligibility funding deadline official 2026"
        return f"{subject} admission requirements tuition fees deadline official site 2026"

    @staticmethod
    def _cache_key(kind: ResearchKind, subject: str) -> str:
        norm = re.sub(r"\s+", " ", subject.strip().lower())
        digest = hashlib.sha1(norm.encode("utf-8")).hexdigest()[:16]
        return f"research:{kind}:{digest}"


def _format_results(results: list[SearchResult]) -> str:
    lines = []
    for i, r in enumerate(results, 1):
        lines.append(
            f"[{i}] ({r.source_type}) {r.title}\n    {r.url}\n    {r.snippet}"
        )
    return "\n".join(lines)


def _format_hints(hints: dict[str, Any] | None) -> str:
    if not hints:
        return ""
    parts = [f"{k}: {v}" for k, v in hints.items() if v]
    return "; ".join(parts)


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

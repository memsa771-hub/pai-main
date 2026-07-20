"""Async SerpAPI client + official-source classification (CLAUDE.md section 16).

Raw SerpAPI calls live here, never inside agents. The client reuses the shared
``httpx.AsyncClient`` and exposes:

- ``search()``  -> ranked, structured results.
- ``classify_source()`` / ``pick_official()`` -> identify the most authoritative
  source per the research priority (official university > government >
  accreditation body > official scholarship provider > secondary).
- ``fetch_page_text()`` -> best-effort fetch + de-HTML of an official page so the
  extractor works from real page text, not just search snippets.
"""

from __future__ import annotations

import re
from typing import Literal
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel

from app.core.logging import get_logger

logger = get_logger(__name__)

SourceType = Literal[
    "official_university",
    "government",
    "accreditation",
    "scholarship_provider",
    "secondary",
]

# Priority order (lower index = more authoritative).
_SOURCE_PRIORITY: dict[SourceType, int] = {
    "official_university": 0,
    "government": 1,
    "accreditation": 2,
    "scholarship_provider": 3,
    "secondary": 4,
}

_ACCREDITATION_DOMAINS = {
    "hec.gov.pk", "pmdc.pk", "pec.org.pk", "abet.org", "aacsb.edu", "equis.org",
    "enqa.eu", "chea.org",
}
_SCHOLARSHIP_DOMAINS = {
    "daad.de", "chevening.org", "fulbright.org", "scholars4dev.com",
    "studyinnorway.no", "studyineurope.eu", "commonwealth.org",
    "erasmusplus.eu", "opportunitiesforafricans.com",
}

_TAG_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
_HTML_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t\r\f\v]+")
_NL_RE = re.compile(r"\n{3,}")


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    domain: str
    source_type: SourceType


def classify_source(domain: str) -> SourceType:
    d = domain.lower().lstrip(".")
    if d.startswith("www."):
        d = d[4:]
    if d in _SCHOLARSHIP_DOMAINS:
        return "scholarship_provider"
    if d in _ACCREDITATION_DOMAINS:
        return "accreditation"
    # Government: .gov / .gov.xx / .gob / .go.xx
    if re.search(r"(^|\.)gov(\.[a-z]{2})?$", d) or ".gov." in d:
        return "government"
    # Official university/academic domains.
    if (
        d.endswith(".edu")
        or ".edu." in d
        or re.search(r"(^|\.)ac\.[a-z]{2}$", d)
        or ".ac." in d
        or "university" in d
        or "univ" in d
    ):
        return "official_university"
    return "secondary"


class SerpAPIClient:
    def __init__(
        self,
        *,
        api_key: str | None,
        http_client: httpx.AsyncClient,
        timeout_seconds: float = 15.0,
        base_url: str = "https://serpapi.com/search",
    ) -> None:
        self._api_key = api_key
        self._http = http_client
        self._timeout = timeout_seconds
        self._base_url = base_url

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def search(self, query: str, *, num: int = 6) -> list[SearchResult]:
        if not self._api_key:
            logger.warning("serpapi_not_configured")
            return []
        params = {
            "q": query,
            "api_key": self._api_key,
            "engine": "google",
            "num": num,
        }
        try:
            resp = await self._http.get(self._base_url, params=params, timeout=self._timeout)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("serpapi_search_failed", extra={"error": str(exc)})
            return []

        results: list[SearchResult] = []
        for item in data.get("organic_results", [])[:num]:
            url = item.get("link") or ""
            if not url:
                continue
            domain = urlparse(url).netloc
            results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=url,
                    snippet=item.get("snippet", ""),
                    domain=domain,
                    source_type=classify_source(domain),
                )
            )
        return results

    @staticmethod
    def pick_official(results: list[SearchResult]) -> SearchResult | None:
        """Return the most authoritative result by research priority."""
        if not results:
            return None
        return min(results, key=lambda r: _SOURCE_PRIORITY[r.source_type])

    async def fetch_page_text(self, url: str, *, max_chars: int = 8000) -> str | None:
        """Best-effort fetch and de-HTML of a page. Returns None on any failure."""
        try:
            resp = await self._http.get(
                url,
                timeout=min(self._timeout, 12.0),
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (compatible; PlacementAI/1.0)"},
            )
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "html" not in content_type and "text" not in content_type:
                return None
            return _html_to_text(resp.text)[:max_chars]
        except (httpx.HTTPError, ValueError) as exc:
            logger.info("official_page_fetch_failed", extra={"url": url, "error": str(exc)})
            return None


def _html_to_text(html: str) -> str:
    without_blocks = _TAG_RE.sub(" ", html)
    text = _HTML_RE.sub(" ", without_blocks)
    text = _WS_RE.sub(" ", text)
    text = _NL_RE.sub("\n\n", text)
    return text.strip()

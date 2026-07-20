"""Service tests: profile enrichment, document extraction, research."""

from __future__ import annotations

import pytest

from app.core.exceptions import ValidationError
from app.infrastructure.redis import Cache, InMemoryCache
from app.integrations.search.serpapi_client import SearchResult, classify_source
from app.modules.documents.service import DocumentExtractionService
from app.modules.documents.extractor import extract_text, validate_file
from app.modules.profiles.service import ProfileEnrichmentService
from app.modules.research.service import ResearchService
from tests.conftest import FakeDeepSeek


# --- Profiles enrichment ----------------------------------------------------

class _FakeProfileRepo:
    def __init__(self, snapshot):
        self._snap = snapshot
        self.saved = None

    async def snapshot(self):
        return self._snap

    async def save(self, **kwargs):
        self.saved = kwargs


def _snapshot():
    return {
        "scalars": {"country": "Pakistan", "intended_destination": ""},
        "skills": ["Python"],
        "languages": [],
        "goals": [],
        "education_sigs": set(),
        "work_sigs": set(),
        "project_names": set(),
    }


async def test_profile_fill_empty_and_conflict():
    repo = _FakeProfileRepo(_snapshot())
    svc = ProfileEnrichmentService(repo)
    res = await svc.apply(
        "1",
        {"intended_destination": "Germany", "country": "Canada", "skills": ["Python", "SQL"]},
        [],
    )
    assert "intended_destination" in res.applied_fields
    assert "skills" in res.applied_fields
    assert any(c.field == "country" for c in res.conflicts)  # existing not overwritten
    assert repo.saved["scalars"] == {"intended_destination": "Germany"}


async def test_profile_goal_add_and_enrich():
    snap = _snapshot()
    repo = _FakeProfileRepo(snap)
    svc = ProfileEnrichmentService(repo)
    res = await svc.apply(
        "1", {},
        [{"goal_type": "international_admission", "target_country": "Germany",
          "target_degree_level": "Masters"}],
    )
    assert res.added_goals == 1
    goal = repo.saved["goals"][0]
    assert goal["status"] == "active" and goal["source"] == "conversation"


async def test_profile_invalid_goal_dropped():
    repo = _FakeProfileRepo(_snapshot())
    svc = ProfileEnrichmentService(repo)
    res = await svc.apply("1", {}, [{"goal_type": "nonsense"}])
    assert res.added_goals == 0
    assert repo.saved is None  # nothing to persist


# --- Document extraction ----------------------------------------------------

def test_extract_text_txt():
    assert "Python" in extract_text(b"CV: Python, SQL", "cv.txt")


def test_validate_file_rejects_unsupported():
    with pytest.raises(ValidationError):
        validate_file(b"x", "malware.exe")


def test_validate_file_rejects_oversized():
    with pytest.raises(ValidationError):
        validate_file(b"x" * (11 * 1024 * 1024), "big.pdf")


class _FakeEnrichment:
    def __init__(self):
        self.applied = None

    async def apply(self, user_id, profile_updates, goal_updates):
        self.applied = (profile_updates, goal_updates)

        class R:
            applied_fields = ["skills"]
            added_goals = 1
            enriched_goals = 0
            conflicts = []

        return R()


async def test_document_extraction_single_call(prompts):
    payload = {
        "document_class": "resume", "confidence": 0.9,
        "profile": {"skills": ["Python"]},
        "goals": [{"goal_type": "international_admission"}],
        "test_scores": [{"test_name": "IELTS", "score": "7.5"}],
    }
    ds = FakeDeepSeek(payload)
    enr = _FakeEnrichment()
    svc = DocumentExtractionService(deepseek=ds, prompts=prompts, enrichment=enr)
    summary = await svc.extract_and_apply(user_id="1", raw_text="resume", declared_type="Resume")
    assert ds.calls == 1
    assert enr.applied[0]["skills"] == ["Python"]
    assert summary.document_class == "resume"
    assert summary.test_scores[0].test_name == "IELTS"
    assert summary.status == "completed"


async def test_document_extraction_empty_shortcircuits(prompts):
    ds = FakeDeepSeek({})
    svc = DocumentExtractionService(deepseek=ds, prompts=prompts, enrichment=_FakeEnrichment())
    summary = await svc.extract_and_apply(user_id="1", raw_text="   ", declared_type="Resume")
    assert ds.calls == 0
    assert summary.status == "draft"


# --- Research ---------------------------------------------------------------

def test_source_classification():
    assert classify_source("nu.edu.pk") == "official_university"
    assert classify_source("daad.de") == "scholarship_provider"
    assert classify_source("randomblog.com") == "secondary"


class _FakeSerp:
    def __init__(self, results, page="Official: tuition PKR 300000/yr"):
        self._results = results
        self._page = page
        self.search_calls = 0
        self.fetch_calls = 0

    async def search(self, query, *, num=6):
        self.search_calls += 1
        return self._results

    @staticmethod
    def pick_official(results):
        from app.integrations.search.serpapi_client import SerpAPIClient
        return SerpAPIClient.pick_official(results)

    async def fetch_page_text(self, url, *, max_chars=8000):
        self.fetch_calls += 1
        return self._page


def _results():
    return [
        SearchResult(title="blog", url="https://b.com/x", snippet="s",
                     domain="b.com", source_type=classify_source("b.com")),
        SearchResult(title="FAST", url="https://nu.edu.pk/adm", snippet="s",
                     domain="nu.edu.pk", source_type=classify_source("nu.edu.pk")),
    ]


async def test_research_verified_and_cached(prompts):
    payload = {"summary": "FAST info", "facts": {"name": "FAST"},
               "valid_for_intake": "Fall 2026", "confidence": 0.7}
    serp = _FakeSerp(_results())
    ds = FakeDeepSeek(payload)
    cache = Cache(InMemoryCache(), 60)
    svc = ResearchService(serpapi=serp, deepseek=ds, prompts=prompts, cache=cache, cache_ttl_seconds=60)

    res = await svc.research("university", "Tell me about FAST")
    assert res.status == "verified"
    assert res.sources[0].source_type == "official_university"
    assert ds.calls == 1 and serp.fetch_calls == 1

    # Cache hit: no extra search/AI call
    res2 = await svc.research("university", "Tell me about FAST")
    assert ds.calls == 1 and serp.search_calls == 1
    assert res2.facts["name"] == "FAST"


async def test_research_unavailable_without_sources(prompts):
    serp = _FakeSerp([])
    ds = FakeDeepSeek({})
    svc = ResearchService(serpapi=serp, deepseek=ds, prompts=prompts,
                          cache=Cache(InMemoryCache(), 60), cache_ttl_seconds=60)
    res = await svc.research("scholarship", "fully funded germany")
    assert res.status == "unavailable"
    assert ds.calls == 0  # no fabrication
    assert res.facts == {}

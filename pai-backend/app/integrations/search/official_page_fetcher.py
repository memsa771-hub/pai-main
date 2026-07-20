"""Official page fetcher — implemented on SerpAPIClient.fetch_page_text for now."""
from app.integrations.search.serpapi_client import SerpAPIClient

async def fetch_official_page(client: SerpAPIClient, url: str, *, max_chars: int = 8000) -> str:
    return await client.fetch_page_text(url, max_chars=max_chars)

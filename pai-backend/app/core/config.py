"""Central application configuration.

All environment access flows through a single typed `Settings` object so that no
other module needs to call `os.getenv` directly. Values are loaded from the
process environment and the local `.env` file. Unknown keys are ignored so that
legacy variables can coexist during the migration.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Application ---
    app_name: str = "Placement AI API"
    app_description: str = "AI Operating System for International Students"
    environment: str = "development"
    debug: bool = True
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001"

    # --- DeepSeek (AI provider) ---
    deepseek_api_key: str | None = None
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_timeout_seconds: float = 60.0
    deepseek_max_retries: int = 2

    # --- SerpAPI (web research) ---
    serpapi_api_key: str | None = None
    serpapi_timeout_seconds: float = 15.0
    research_cache_ttl_seconds: int = 86400  # 1 day; verified facts are cached

    # --- Supabase ---
    supabase_project_id: str | None = None
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_publishable_key: str | None = None
    supabase_secret_key: str | None = None

    # Supabase Auth: JWT verification (asymmetric ES256 via JWKS preferred)
    supabase_jwks_url: str | None = None
    supabase_jwt_issuer: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_legacy_jwt_secret: str | None = None

    # Supabase Storage
    supabase_storage_bucket: str = "student-documents"

    # --- Database (Supabase PostgreSQL, async) ---
    database_url: str | None = None
    database_url_pooler: str | None = None
    db_echo: bool = False
    db_pool_pre_ping: bool = True

    # --- Redis (optional; falls back to in-memory cache when unset) ---
    redis_url: str | None = None
    cache_default_ttl_seconds: int = 300

    # --- Legacy custom-JWT auth (kept during migration to Supabase Auth) ---
    jwt_secret: str | None = None
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def runtime_database_url(self) -> str | None:
        """URL used by the running app. Prefer the IPv4 transaction pooler."""
        return self.database_url_pooler or self.database_url

    @property
    def migration_database_url(self) -> str | None:
        """URL used by Alembic migrations. Prefer the direct connection."""
        return self.database_url or self.database_url_pooler

    @property
    def is_database_configured(self) -> bool:
        return bool(self.runtime_database_url)

    @property
    def is_redis_configured(self) -> bool:
        return bool(self.redis_url)


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read once per process)."""
    return Settings()

"""Alembic environment — uses Settings + shared SQLAlchemy metadata (CLAUDE.md §4/§5)."""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings

# Import models so metadata is populated before autogenerate.
from app import models  # noqa: F401
from app.infrastructure.database import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _sync_url() -> str:
    """Alembic needs a sync driver. Prefer the IPv4 pooler (pg8000)."""
    settings = get_settings()
    raw = settings.database_url_pooler or settings.database_url
    if not raw:
        raise RuntimeError("DATABASE_URL / DATABASE_URL_POOLER is not configured")
    for prefix in (
        "postgresql+asyncpg://",
        "postgresql+psycopg://",
        "postgresql://",
        "postgres://",
    ):
        if raw.startswith(prefix):
            return "postgresql+pg8000://" + raw[len(prefix) :]
    return raw


def run_migrations_offline() -> None:
    url = _sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(_sync_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

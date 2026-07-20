"""Prompt registry.

Loads every ``*.jinja2`` template under this package once when the app starts
and renders them from memory (never re-reading files per request, per CLAUDE.md
section 14). Templates are keyed by their path relative to the prompts directory
without the extension, e.g. ``conversation/system`` for
``prompts/conversation/system.jinja2``.
"""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from app.core.logging import get_logger

logger = get_logger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent


class PromptRegistry:
    def __init__(self, prompts_dir: Path | None = None) -> None:
        self._dir = prompts_dir or _PROMPTS_DIR
        self._env = Environment(
            loader=FileSystemLoader(str(self._dir)),
            autoescape=select_autoescape(enabled_extensions=(), default=False),
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self._keys: set[str] = set()

    def load(self) -> None:
        """Discover and pre-compile all templates so failures surface at boot."""
        self._keys.clear()
        for path in sorted(self._dir.rglob("*.jinja2")):
            key = path.relative_to(self._dir).with_suffix("").as_posix()
            # Compile eagerly to validate template syntax during startup.
            self._env.get_template(f"{key}.jinja2")
            self._keys.add(key)
        logger.info("prompts_loaded", extra={"count": len(self._keys)})

    def render(self, key: str, /, **context: object) -> str:
        template = self._env.get_template(f"{key}.jinja2")
        return template.render(**context)

    def has(self, key: str) -> bool:
        return key in self._keys

    @property
    def keys(self) -> set[str]:
        return set(self._keys)

"""Supabase Auth (GoTrue) integration.

Backend-proxied authentication so the existing frontend contract is preserved:
the frontend keeps calling ``/api/auth/{signup,login,login/json}`` and storing a
Bearer token in ``localStorage``. Under the hood those tokens are now issued and
verified by Supabase Auth.

- Sign-up uses the **admin** endpoint (service role) with ``email_confirm=true``
  so a session is always available immediately, regardless of the project's
  email-confirmation setting.
- Login uses the password grant (anon key).
- Incoming Bearer tokens are verified against the project's **ES256 JWKS**
  (asymmetric keys), with claims checked for audience/issuer/expiry.

This module is synchronous (httpx.Client) to match the legacy sync routers.
"""

from __future__ import annotations

import threading
import time
from typing import Any

import httpx
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SupabaseAuthError(Exception):
    """Auth failure with an HTTP-friendly status code and safe message."""

    def __init__(self, message: str, status_code: int = 401) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# --- JWKS cache -------------------------------------------------------------

_jwks_lock = threading.Lock()
_jwks_by_kid: dict[str, dict] = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL_SECONDS = 3600  # refresh at most hourly (keys rotate rarely)


def _fetch_jwks(force: bool = False) -> dict[str, dict]:
    global _jwks_fetched_at
    settings = get_settings()
    if not settings.supabase_jwks_url:
        raise SupabaseAuthError("Supabase JWKS URL is not configured", 500)

    with _jwks_lock:
        fresh = (time.time() - _jwks_fetched_at) < _JWKS_TTL_SECONDS
        if _jwks_by_kid and fresh and not force:
            return _jwks_by_kid
        try:
            resp = httpx.get(settings.supabase_jwks_url, timeout=10.0)
            resp.raise_for_status()
            keys = resp.json().get("keys", [])
        except Exception as exc:  # noqa: BLE001
            if _jwks_by_kid:  # serve stale keys rather than fail hard
                logger.warning("jwks_refresh_failed_using_cache", extra={"error": str(exc)})
                return _jwks_by_kid
            raise SupabaseAuthError("Unable to fetch signing keys", 503) from exc

        _jwks_by_kid.clear()
        for key in keys:
            if key.get("kid"):
                _jwks_by_kid[key["kid"]] = key
        _jwks_fetched_at = time.time()
        return _jwks_by_kid


def _jwk_for_kid(kid: str) -> dict:
    keys = _fetch_jwks()
    if kid not in keys:
        keys = _fetch_jwks(force=True)  # possible rotation
    jwk = keys.get(kid)
    if not jwk:
        raise SupabaseAuthError("Unknown token signing key")
    return jwk


def verify_token(token: str) -> dict[str, Any]:
    """Verify a Supabase access token and return its claims.

    Supports the asymmetric (ES256/RS256) JWKS path and the legacy symmetric
    (HS256) project secret as a fallback. Raises ``SupabaseAuthError`` on any
    validation failure.
    """
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise SupabaseAuthError("Malformed token") from exc

    alg = header.get("alg", "ES256")
    options = {"verify_aud": True}
    audience = settings.supabase_jwt_audience
    issuer = settings.supabase_jwt_issuer

    try:
        if alg.startswith("HS"):
            secret = settings.supabase_legacy_jwt_secret
            if not secret:
                raise SupabaseAuthError("Legacy Supabase secret not configured", 500)
            return jwt.decode(
                token, secret, algorithms=[alg], audience=audience,
                issuer=issuer, options=options,
            )
        jwk = _jwk_for_kid(header.get("kid", ""))
        return jwt.decode(
            token, jwk, algorithms=[alg], audience=audience,
            issuer=issuer, options=options,
        )
    except SupabaseAuthError:
        raise
    except JWTError as exc:
        raise SupabaseAuthError("Invalid or expired token") from exc


# --- GoTrue REST helpers ----------------------------------------------------

def _auth_base() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise SupabaseAuthError("Supabase URL is not configured", 500)
    return f"{settings.supabase_url}/auth/v1"


def _service_headers() -> dict[str, str]:
    settings = get_settings()
    key = settings.supabase_service_role_key
    if not key:
        raise SupabaseAuthError("Supabase service role key is not configured", 500)
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _anon_headers() -> dict[str, str]:
    settings = get_settings()
    key = settings.supabase_anon_key or settings.supabase_publishable_key
    if not key:
        raise SupabaseAuthError("Supabase anon key is not configured", 500)
    return {"apikey": key, "Content-Type": "application/json"}


def admin_create_user(email: str, password: str, metadata: dict | None = None) -> dict[str, Any]:
    """Create a confirmed user via the admin API. Returns the Supabase user."""
    body = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": metadata or {},
    }
    try:
        resp = httpx.post(f"{_auth_base()}/admin/users", headers=_service_headers(), json=body, timeout=20.0)
    except httpx.HTTPError as exc:
        raise SupabaseAuthError("Auth service unavailable", 503) from exc

    if resp.status_code in (200, 201):
        return resp.json()
    if resp.status_code in (409, 422):
        detail = _error_message(resp)
        if "already" in detail.lower() or "exist" in detail.lower() or "registered" in detail.lower():
            raise SupabaseAuthError("A user with this email address already exists.", 400)
        raise SupabaseAuthError(detail or "Could not create account.", 400)
    logger.warning("supabase_admin_create_failed", extra={"status": resp.status_code})
    raise SupabaseAuthError("Could not create account.", 400)


def sign_in(email: str, password: str) -> dict[str, Any]:
    """Password grant. Returns the token payload (access_token, user, ...)."""
    try:
        resp = httpx.post(
            f"{_auth_base()}/token",
            params={"grant_type": "password"},
            headers=_anon_headers(),
            json={"email": email, "password": password},
            timeout=20.0,
        )
    except httpx.HTTPError as exc:
        raise SupabaseAuthError("Auth service unavailable", 503) from exc

    if resp.status_code == 200:
        return resp.json()
    if resp.status_code in (400, 401, 403):
        raise SupabaseAuthError("Invalid email or password", 401)
    logger.warning("supabase_sign_in_failed", extra={"status": resp.status_code})
    raise SupabaseAuthError("Could not sign in.", 401)


def admin_delete_user(user_id: str) -> None:
    """Delete a Supabase user (used for test cleanup / account removal)."""
    try:
        httpx.request(
            "DELETE", f"{_auth_base()}/admin/users/{user_id}",
            headers=_service_headers(), timeout=20.0,
        )
    except httpx.HTTPError:  # best-effort
        logger.warning("supabase_admin_delete_failed", extra={"user_id": user_id})


def _error_message(resp: httpx.Response) -> str:
    try:
        data = resp.json()
    except Exception:  # noqa: BLE001
        return ""
    for key in ("msg", "message", "error_description", "error"):
        val = data.get(key) if isinstance(data, dict) else None
        if isinstance(val, str) and val:
            return val
    return ""

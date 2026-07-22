"""Supabase Storage integration (CLAUDE.md section 7 / 21).

Uploads the original uploaded document bytes to a **private** bucket and hands
the frontend short-lived **signed URLs** rather than public links. All calls use
the service-role key and go through the Storage REST API with ``httpx`` (sync, to
match the current document router). Every function degrades gracefully: if
Storage is unreachable or unconfigured it logs and returns ``None`` so an upload
still succeeds (text extraction is the primary value; the stored file is a bonus).
"""

from __future__ import annotations

import mimetypes

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_TIMEOUT = 30.0


def _base() -> str | None:
    settings = get_settings()
    if not settings.supabase_url:
        return None
    return f"{settings.supabase_url}/storage/v1"


def _headers(extra: dict[str, str] | None = None) -> dict[str, str] | None:
    settings = get_settings()
    key = settings.supabase_service_role_key
    if not key:
        return None
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    if extra:
        headers.update(extra)
    return headers


def _bucket() -> str:
    return get_settings().supabase_storage_bucket


def ensure_bucket() -> bool:
    """Create the private bucket if it does not already exist (idempotent)."""
    base, headers = _base(), _headers({"Content-Type": "application/json"})
    if not base or not headers:
        logger.warning("storage_not_configured")
        return False
    bucket = _bucket()

    # Prefer GET — POST /bucket returns 400 when the bucket already exists,
    # which looks like a startup failure in logs even though it's harmless.
    try:
        get_resp = httpx.get(f"{base}/bucket/{bucket}", headers=headers, timeout=_TIMEOUT)
        if get_resp.status_code == 200:
            logger.info("storage_bucket_ready", extra={"bucket": bucket})
            return True
    except httpx.HTTPError as exc:
        logger.warning("storage_ensure_bucket_failed", extra={"error": str(exc)})
        return False

    try:
        resp = httpx.post(
            f"{base}/bucket",
            headers=headers,
            json={"id": bucket, "name": bucket, "public": False},
            timeout=_TIMEOUT,
        )
    except httpx.HTTPError as exc:
        logger.warning("storage_ensure_bucket_failed", extra={"error": str(exc)})
        return False
    if resp.status_code in (200, 201):
        logger.info("storage_bucket_created", extra={"bucket": bucket})
        return True
    body = resp.text.lower()
    if resp.status_code in (400, 409) and ("exist" in body or "duplicate" in body):
        logger.info("storage_bucket_ready", extra={"bucket": bucket})
        return True
    logger.warning(
        "storage_ensure_bucket_unexpected",
        extra={"status": resp.status_code, "body": resp.text[:200]},
    )
    return False


def upload_object(path: str, data: bytes, filename: str | None = None) -> str | None:
    """Upload bytes to ``path`` within the bucket. Returns the object path or None."""
    base, headers = _base(), _headers()
    if not base or not headers:
        return None
    content_type = "application/octet-stream"
    if filename:
        guessed, _ = mimetypes.guess_type(filename)
        if guessed:
            content_type = guessed
    headers.update({"Content-Type": content_type, "x-upsert": "true"})
    try:
        resp = httpx.post(
            f"{base}/object/{_bucket()}/{path}",
            headers=headers,
            content=data,
            timeout=_TIMEOUT,
        )
    except httpx.HTTPError as exc:
        logger.warning("storage_upload_failed", extra={"error": str(exc), "path": path})
        return None
    if resp.status_code in (200, 201):
        logger.info("storage_uploaded", extra={"path": path, "bytes": len(data)})
        return path
    logger.warning("storage_upload_unexpected", extra={"status": resp.status_code, "path": path})
    return None


def create_signed_url(path: str | None, expires_in: int = 3600) -> str | None:
    """Return a short-lived signed URL for a stored object, or None."""
    if not path:
        return None
    base, headers = _base(), _headers({"Content-Type": "application/json"})
    if not base or not headers:
        return None
    try:
        resp = httpx.post(
            f"{base}/object/sign/{_bucket()}/{path}",
            headers=headers,
            json={"expiresIn": expires_in},
            timeout=_TIMEOUT,
        )
    except httpx.HTTPError as exc:
        logger.warning("storage_sign_failed", extra={"error": str(exc), "path": path})
        return None
    if resp.status_code != 200:
        return None
    signed = (resp.json() or {}).get("signedURL") or (resp.json() or {}).get("signedUrl")
    if not signed:
        return None
    if signed.startswith("http"):
        return signed
    return f"{base}{signed}" if signed.startswith("/") else f"{base}/{signed}"


def delete_object(path: str | None) -> None:
    """Best-effort delete of a stored object."""
    if not path:
        return
    base, headers = _base(), _headers()
    if not base or not headers:
        return
    try:
        httpx.request(
            "DELETE", f"{base}/object/{_bucket()}/{path}", headers=headers, timeout=_TIMEOUT
        )
    except httpx.HTTPError:
        logger.warning("storage_delete_failed", extra={"path": path})

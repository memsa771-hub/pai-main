"""Tests for Supabase Storage helpers (mocked HTTP — no real Storage calls)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.integrations.storage import supabase_storage


def _resp(status: int, json_data=None, text: str = ""):
    r = MagicMock()
    r.status_code = status
    r.text = text
    r.json.return_value = json_data or {}
    return r


@patch("app.integrations.storage.supabase_storage.httpx.post")
@patch("app.integrations.storage.supabase_storage.get_settings")
def test_ensure_bucket_creates(mock_settings, mock_post):
    mock_settings.return_value.supabase_url = "https://x.supabase.co"
    mock_settings.return_value.supabase_service_role_key = "svc"
    mock_settings.return_value.supabase_storage_bucket = "student-documents"
    mock_post.return_value = _resp(200)
    assert supabase_storage.ensure_bucket() is True


@patch("app.integrations.storage.supabase_storage.httpx.post")
@patch("app.integrations.storage.supabase_storage.get_settings")
def test_ensure_bucket_already_exists(mock_settings, mock_post):
    mock_settings.return_value.supabase_url = "https://x.supabase.co"
    mock_settings.return_value.supabase_service_role_key = "svc"
    mock_settings.return_value.supabase_storage_bucket = "student-documents"
    mock_post.return_value = _resp(409, text="Bucket already exists")
    assert supabase_storage.ensure_bucket() is True


@patch("app.integrations.storage.supabase_storage.httpx.post")
@patch("app.integrations.storage.supabase_storage.get_settings")
def test_upload_object_success(mock_settings, mock_post):
    mock_settings.return_value.supabase_url = "https://x.supabase.co"
    mock_settings.return_value.supabase_service_role_key = "svc"
    mock_settings.return_value.supabase_storage_bucket = "student-documents"
    mock_post.return_value = _resp(200)
    path = supabase_storage.upload_object("1/doc/a.pdf", b"%PDF", "a.pdf")
    assert path == "1/doc/a.pdf"


@patch("app.integrations.storage.supabase_storage.httpx.post")
@patch("app.integrations.storage.supabase_storage.get_settings")
def test_create_signed_url_relative(mock_settings, mock_post):
    mock_settings.return_value.supabase_url = "https://x.supabase.co"
    mock_settings.return_value.supabase_service_role_key = "svc"
    mock_settings.return_value.supabase_storage_bucket = "student-documents"
    mock_post.return_value = _resp(200, {"signedURL": "/object/sign/student-documents/1/a.pdf?token=abc"})
    url = supabase_storage.create_signed_url("1/a.pdf")
    assert url == "https://x.supabase.co/storage/v1/object/sign/student-documents/1/a.pdf?token=abc"


def test_create_signed_url_none_path():
    assert supabase_storage.create_signed_url(None) is None


@patch("app.integrations.storage.supabase_storage.get_settings")
def test_upload_degrades_when_unconfigured(mock_settings):
    mock_settings.return_value.supabase_url = None
    mock_settings.return_value.supabase_service_role_key = None
    mock_settings.return_value.supabase_storage_bucket = "student-documents"
    assert supabase_storage.upload_object("x", b"y") is None

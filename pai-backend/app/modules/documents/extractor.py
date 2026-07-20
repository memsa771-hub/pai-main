"""Document file validation and text extraction (CLAUDE.md section 10.3).

Pure, dependency-light helpers for turning an uploaded file's bytes into plain
text. Raises domain exceptions (`ValidationError`, `DocumentProcessingError`)
rather than HTTP errors so callers can decide how to respond. OCR is
intentionally not used (scanned-image handling is out of scope for Phase 1).
"""

from __future__ import annotations

import io
import os
import tempfile

import docx2txt
import pypdf

from app.core.exceptions import DocumentProcessingError, ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_file(file_bytes: bytes, filename: str) -> str:
    """Validate size + extension. Returns the lowercased extension."""
    if not file_bytes:
        raise ValidationError("Uploaded file is empty.", error_code="empty_file")
    if len(file_bytes) > MAX_FILE_BYTES:
        raise ValidationError(
            "File exceeds the 10 MB upload limit.", error_code="file_too_large"
        )
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValidationError(
            "Unsupported file format. Upload PDF, DOCX, or TXT.",
            error_code="unsupported_file_type",
        )
    return ext


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF, DOCX or TXT bytes."""
    ext = validate_file(file_bytes, filename)

    if ext == ".pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            parts = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(p for p in parts if p).strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("pdf_parse_failed", extra={"error": str(exc)})
            raise DocumentProcessingError("Failed to parse PDF document.") from exc

    if ext == ".docx":
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            return (docx2txt.process(tmp_path) or "").strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("docx_parse_failed", extra={"error": str(exc)})
            raise DocumentProcessingError("Failed to parse DOCX document.") from exc
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

    # .txt
    for encoding in ("utf-8", "latin-1"):
        try:
            return file_bytes.decode(encoding).strip()
        except UnicodeDecodeError:
            continue
    raise DocumentProcessingError("Failed to decode text file.")

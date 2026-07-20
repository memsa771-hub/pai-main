import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas
from app.core.exceptions import PAIError
from app.infrastructure.database import get_async_db
from app.integrations.storage import supabase_storage
from app.modules.documents.service import DocumentExtractionService
from app.modules.documents.extractor import extract_text
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.service import ProfileEnrichmentService
from app.core.security import get_current_user_async

router = APIRouter(prefix="/api/documents", tags=["Document Intelligence"])

EXTRACTION_TYPES = {"Resume", "CV", "Transcript", "Degree", "Certificate"}


def _to_response(doc: models.Document) -> schemas.DocumentResponse:
    """Serialize a document, replacing the stored object path with a signed URL."""
    resp = schemas.DocumentResponse.model_validate(doc)
    resp.file_path = supabase_storage.create_signed_url(doc.file_path)
    return resp


@router.get("", response_model=list[schemas.DocumentResponse])
async def get_documents(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.Document).where(models.Document.user_id == current_user.id)
    )
    docs = result.scalars().all()
    return [_to_response(d) for d in docs]


@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    university: str = Form("Stanford University"),
    type: str = Form("Resume"),
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    file_bytes = await file.read()

    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    db_doc = models.Document(
        id=doc_id,
        user_id=current_user.id,
        name=file.filename,
        type=type,
        last_edited="Just now",
        status="pending",
        progress=10 if type == "SOP" else 100,
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)

    safe_name = file.filename or "upload"
    object_path = await run_in_threadpool(
        supabase_storage.upload_object,
        f"{current_user.id}/{db_doc.id}/{safe_name}",
        file_bytes,
        safe_name,
    )
    if object_path:
        db_doc.file_path = object_path
        await db.commit()

    try:
        raw_text = extract_text(file_bytes, file.filename)
    except PAIError as exc:
        db_doc.status = "draft"
        db_doc.progress = 0
        await db.commit()
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    db_doc.content = raw_text
    await db.commit()

    if type in EXTRACTION_TYPES:
        await _extract_into_vault(request, db, db_doc, current_user, raw_text, type)
    elif type == "SOP":
        await _optimize_sop(request, db, db_doc, raw_text)
    else:
        db_doc.status = "completed"
        db_doc.progress = 100
        await db.commit()

    await db.refresh(db_doc)
    return _to_response(db_doc)


async def _extract_into_vault(
    request: Request,
    db: AsyncSession,
    db_doc: models.Document,
    user: models.User,
    raw_text: str,
    declared_type: str,
) -> None:
    deepseek = getattr(request.app.state, "deepseek", None)
    prompts = getattr(request.app.state, "prompts", None)
    if deepseek is None or prompts is None:
        db_doc.status = "draft"
        db_doc.progress = 0
        await db.commit()
        return

    enrichment = ProfileEnrichmentService(ProfileRepository(db, user))
    service = DocumentExtractionService(deepseek=deepseek, prompts=prompts, enrichment=enrichment)
    summary = await service.extract_and_apply(
        user_id=str(user.id), raw_text=raw_text, declared_type=declared_type
    )

    db_doc.status = summary.status
    db_doc.progress = 100 if summary.status == "completed" else 0
    await db.commit()


async def _optimize_sop(
    request: Request,
    db: AsyncSession,
    db_doc: models.Document,
    raw_text: str,
) -> None:
    """SOP score + rewrite via the shared async DeepSeek client (one AI call)."""
    deepseek = getattr(request.app.state, "deepseek", None)
    if deepseek is None:
        db_doc.status = "draft"
        db_doc.progress = 50
        await db.commit()
        return

    system_prompt = (
        "You are an SOP Editor Agent. Review this Statement of Purpose. Rate its effectiveness "
        "from 0 to 100. Provide an optimized, more professional version of this text that "
        "highlights academic achievements, research interest, and clear motives. Return strictly "
        "a JSON object with: 'score' (integer between 0 and 100) and 'optimized_text' (string)."
    )
    try:
        parsed = await deepseek.complete_json(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_text},
            ]
        )
        db_doc.status = "optimized"
        db_doc.progress = int(parsed.get("score", 85)) if isinstance(parsed, dict) else 85
        db_doc.optimized_content = (
            parsed.get("optimized_text", raw_text) if isinstance(parsed, dict) else raw_text
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        print(f"[Agent] SOP optimization failed: {exc}")
        db_doc.status = "draft"
        db_doc.progress = 50
        await db.commit()

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas
from app.infrastructure.database import get_async_db
from app.integrations.auth import supabase_auth
from app.core.security import get_current_user_async

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _issue_token(email: str, password: str) -> str:
    """Sign in against Supabase and return an access token (HTTP-mapped errors)."""
    try:
        session = supabase_auth.sign_in(email, password)
    except supabase_auth.SupabaseAuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    token = session.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return token


@router.post("/signup", response_model=schemas.Token)
async def signup(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_async_db)):
    existing = await db.execute(select(models.User).where(models.User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    try:
        su_user = supabase_auth.admin_create_user(
            user_in.email, user_in.password, {"full_name": user_in.full_name}
        )
    except supabase_auth.SupabaseAuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    new_user = models.User(
        supabase_id=su_user.get("id"),
        email=user_in.email,
        hashed_password="managed_by_supabase",
        full_name=user_in.full_name,
        phone=user_in.phone,
        dob=user_in.dob,
        gender=user_in.gender,
        nationality=user_in.nationality,
        country=user_in.country,
        city=user_in.city,
        linkedin=user_in.linkedin,
        skills="[]",
        languages="[]",
        goals="[]",
    )
    db.add(new_user)
    await db.commit()

    access_token = _issue_token(user_in.email, user_in.password)
    return {"access_token": access_token, "token_type": "bearer"}


async def _backfill_supabase_id(db: AsyncSession, email: str, session: dict) -> None:
    result = await db.execute(select(models.User).where(models.User.email == email))
    user = result.scalar_one_or_none()
    su_id = (session.get("user") or {}).get("id")
    if user and su_id and not user.supabase_id:
        user.supabase_id = su_id
        await db.commit()


@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db),
):
    try:
        session = supabase_auth.sign_in(form_data.username, form_data.password)
    except supabase_auth.SupabaseAuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    await _backfill_supabase_id(db, form_data.username, session)
    return {"access_token": session["access_token"], "token_type": "bearer"}


@router.post("/login/json", response_model=schemas.Token)
async def login_json(credentials: schemas.UserLogin, db: AsyncSession = Depends(get_async_db)):
    try:
        session = supabase_auth.sign_in(credentials.email, credentials.password)
    except supabase_auth.SupabaseAuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    await _backfill_supabase_id(db, credentials.email, session)
    return {"access_token": session["access_token"], "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(current_user: models.User = Depends(get_current_user_async)):
    return current_user

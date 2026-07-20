import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

from app import models
from app.database import get_db
from app.infrastructure.database import get_async_db
from app.integrations.auth import supabase_auth

load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Legacy custom-JWT settings (fallback only during migration to Supabase Auth).
SECRET_KEY = os.getenv("JWT_SECRET", "defaultjwtsecretplacementai123456")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

_USER_RELATIONS = (
    selectinload(models.User.education),
    selectinload(models.User.work_experience),
    selectinload(models.User.projects),
)


def verify_password(plain_password, hashed_password):
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, AttributeError):
        return False


def get_password_hash(password):
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _claims_from_token(token: str) -> tuple[str | None, dict | None]:
    """Return (supabase_sub_or_None, claims) or try legacy and return (None, legacy_payload)."""
    try:
        claims = supabase_auth.verify_token(token)
        return claims.get("sub"), claims
    except supabase_auth.SupabaseAuthError:
        pass
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return None, payload
    except JWTError:
        return None, None


# --- Sync path (chat / tracker / roadmap / dashboard until migrated) --------

def _provision_user_sync(db: Session, *, supabase_id: str, email: str | None, full_name: str | None) -> models.User:
    safe_email = email or f"{supabase_id}@users.supabase"
    user = models.User(
        supabase_id=supabase_id,
        email=safe_email,
        hashed_password="managed_by_supabase",
        full_name=full_name or safe_email.split("@")[0],
        skills="[]",
        languages="[]",
        goals="[]",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    sub, claims = _claims_from_token(token)
    if claims is None:
        raise _credentials_exception()

    if sub:  # Supabase token
        email = claims.get("email")
        metadata = claims.get("user_metadata") or {}
        full_name = metadata.get("full_name") or metadata.get("name")
        user = db.query(models.User).filter(models.User.supabase_id == sub).first()
        if user:
            return user
        if email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.supabase_id = sub
                db.commit()
                return user
        return _provision_user_sync(db, supabase_id=sub, email=email, full_name=full_name)

    # Legacy HS256 token: sub claim is the email.
    email = claims.get("sub")
    if not email:
        raise _credentials_exception()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise _credentials_exception()
    return user


# --- Async path (auth / profile / documents) --------------------------------

async def _provision_user_async(
    db: AsyncSession, *, supabase_id: str, email: str | None, full_name: str | None
) -> models.User:
    safe_email = email or f"{supabase_id}@users.supabase"
    user = models.User(
        supabase_id=supabase_id,
        email=safe_email,
        hashed_password="managed_by_supabase",
        full_name=full_name or safe_email.split("@")[0],
        skills="[]",
        languages="[]",
        goals="[]",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user, attribute_names=["id", "email", "full_name", "supabase_id"])
    # Re-load with relationships for response schemas.
    return await load_user_by_id(db, user.id)


async def load_user_by_id(db: AsyncSession, user_id: int) -> models.User | None:
    result = await db.execute(
        select(models.User).options(*_USER_RELATIONS).where(models.User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_current_user_async(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db),
) -> models.User:
    """Async equivalent of ``get_current_user`` for migrated routers."""
    sub, claims = _claims_from_token(token)
    if claims is None:
        raise _credentials_exception()

    if sub:  # Supabase token
        email = claims.get("email")
        metadata = claims.get("user_metadata") or {}
        full_name = metadata.get("full_name") or metadata.get("name")

        result = await db.execute(
            select(models.User).options(*_USER_RELATIONS).where(models.User.supabase_id == sub)
        )
        user = result.scalar_one_or_none()
        if user:
            return user

        if email:
            result = await db.execute(
                select(models.User).options(*_USER_RELATIONS).where(models.User.email == email)
            )
            user = result.scalar_one_or_none()
            if user:
                user.supabase_id = sub
                await db.commit()
                return user

        return await _provision_user_async(db, supabase_id=sub, email=email, full_name=full_name)

    email = claims.get("sub")
    if not email:
        raise _credentials_exception()
    result = await db.execute(
        select(models.User).options(*_USER_RELATIONS).where(models.User.email == email)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise _credentials_exception()
    return user

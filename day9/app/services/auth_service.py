"""Authentication and JWT token service with HTTPBearer for Swagger UI."""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.database import SessionLocal, get_db
from app.database.models import User

# HTTPBearer Security Scheme: Generates green 'Authorize' modal in Swagger UI
bearer_scheme = HTTPBearer(
    auto_error=True,
    description="Enter JWT Bearer token obtained from /auth/login",
)
optional_bearer_scheme = HTTPBearer(auto_error=False)


class AuthService:
    """Handles password hashing, JWT token creation, and validation."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash plain-text password using bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify plain password against hashed password."""
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False

    @staticmethod
    def create_access_token(username: str, expires_minutes: int | None = None) -> str:
        """Create signed JWT access token."""
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {
            "sub": username,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict[str, Any] | None:
        """Decode and validate a JWT token."""
        try:
            return jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
        except Exception:
            return None


def get_user_by_username(username: str, db: Session | None = None) -> User | None:
    """Retrieve user by username from PostgreSQL day9_db."""
    local_session = False
    if db is None:
        db = SessionLocal()
        local_session = True
    try:
        stmt = select(User).where(User.username == username)
        return db.execute(stmt).scalars().first()
    finally:
        if local_session:
            db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Dependency verifying Bearer token and retrieving authenticated user."""
    unauthorized_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials or not credentials.credentials:
        raise unauthorized_exc

    token = credentials.credentials
    payload = AuthService.decode_token(token)
    if not payload:
        raise unauthorized_exc

    username: str | None = payload.get("sub")
    if not username:
        raise unauthorized_exc

    user = get_user_by_username(username, db)
    if not user:
        raise unauthorized_exc

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
    }


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
    db: Session = Depends(get_db),
) -> dict[str, Any] | None:
    """Optional user dependency for public or semi-public endpoints."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None

"""Authentication and JWT token service using HTTPBearer for Swagger UI."""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.database.database import users_db

# HTTPBearer Scheme: Simple Bearer token prompt in Swagger UI Authorize modal
bearer_scheme = HTTPBearer(auto_error=True)
optional_bearer_scheme = HTTPBearer(auto_error=False)

# Backward-compatible aliases
oauth2_scheme = bearer_scheme
optional_oauth2_scheme = optional_bearer_scheme


class AuthService:
    """Handles password hashing, token creation, and token verification."""

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
        except JWTError:
            return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
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

    user = next((u for u in users_db if u["username"] == username), None)
    if not user:
        raise unauthorized_exc

    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
    }


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
) -> dict[str, Any] | None:
    """Optional user dependency for public endpoints."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

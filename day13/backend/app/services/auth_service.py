"""Authentication service managing user registration, login, and dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserLogin, UserOut, UserRegister
from app.tasks.email_tasks import send_welcome_email
from app.utils.security import (
    bearer_scheme,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class AuthService:
    """Core authentication logic and dependencies."""

    @staticmethod
    def register(db: Session, data: UserRegister) -> User:
        """Register a new user account."""
        if db.query(User).filter(User.username == data.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken.",
            )
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered.",
            )

        new_user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=data.role if data.role in ("admin", "customer") else "customer",
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Trigger background welcome email via Celery safely
        try:
            send_welcome_email.delay(new_user.email, new_user.username)
        except Exception:
            pass

        return new_user

    @staticmethod
    def authenticate(db: Session, credentials: UserLogin) -> Token:
        """Authenticate user and issue JWT token."""
        user = db.query(User).filter(User.username == credentials.username).first()
        if not user or not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated.",
            )

        access_token = create_access_token(
            {"sub": user.username, "user_id": user.id, "role": user.role}
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in_minutes=120,
            user=UserOut.model_validate(user),
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency retrieving authenticated user from Bearer token."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or not credentials.credentials:
        raise credentials_exc

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise credentials_exc

    username: str | None = payload.get("sub")
    if not username:
        raise credentials_exc

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise credentials_exc

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency enforcing administrator privilege."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required for this action.",
        )
    return current_user

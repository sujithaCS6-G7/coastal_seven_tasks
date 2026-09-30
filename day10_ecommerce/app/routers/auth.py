"""Authentication router for user registration, login, and profile."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserLogin, UserOut, UserRegister
from app.services.auth_service import AuthService, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Users"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a New User",
)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new customer or admin user account."""
    new_user = AuthService.register(db, user_data)
    return new_user


@router.post(
    "/login",
    response_model=Token,
    summary="Login to Receive Bearer Token",
)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate credentials and obtain JWT Bearer access token."""
    return AuthService.authenticate(db, credentials)


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get Current User Profile (Protected)",
)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Retrieve profile of the currently logged-in user."""
    return current_user

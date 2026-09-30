"""Authentication router providing registration, login, and user profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.auth import Token, UserLogin, UserOut, UserRegister
from app.services.auth_service import AuthService, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Authorization"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a New User",
    description="Registers a user, hashes their password with bcrypt, and stores them in PostgreSQL (day9_db).",
)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken.",
        )

    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered.",
        )

    hashed_pwd = AuthService.hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
    }


@router.post(
    "/login",
    response_model=Token,
    summary="Login to Receive Bearer Token",
    description="Authenticates user credentials and returns a JWT Bearer access token for Swagger authorization.",
)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with username and password to issue Bearer JWT token."""
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not AuthService.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = AuthService.create_access_token(username=user.username)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in_minutes": 60,
    }


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get Current User Profile (Protected)",
    description="Returns the profile of the authenticated user. Requires Bearer JWT token in Authorization header.",
)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Retrieve currently authenticated user."""
    return current_user


@router.get(
    "/users",
    response_model=list[UserOut],
    include_in_schema=False,
    summary="List All Users",
    description="Development helper endpoint to view existing registered users.",
)
async def list_users(db: Session = Depends(get_db)):
    """List public profiles of all users."""
    users = db.query(User).all()
    return [
        {"id": u.id, "username": u.username, "email": u.email}
        for u in users
    ]

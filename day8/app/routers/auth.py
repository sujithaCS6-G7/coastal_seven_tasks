"""Authentication router providing registration, login, and user profile."""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.database.database import users_db
from app.schemas.auth import Token, UserLogin, UserOut, UserRegister
from app.services.auth_service import AuthService, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Authorization"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a New User",
    description="Registers a user, hashes their password with bcrypt, and stores them in PostgreSQL.",
)
async def register(user_data: UserRegister):
    """Register a new user account."""
    existing_user = next((u for u in users_db if u["username"] == user_data.username), None)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken.",
        )

    new_id = max((u["id"] for u in users_db), default=0) + 1
    hashed_pwd = AuthService.hash_password(user_data.password)

    new_user = {
        "id": new_id,
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_pwd,
    }
    users_db.append(new_user)

    return {
        "id": new_user["id"],
        "username": new_user["username"],
        "email": new_user["email"],
    }


@router.post(
    "/login",
    response_model=Token,
    summary="Login to Receive Bearer Token",
    description="Authenticates user credentials and returns a JWT Bearer access token for Swagger authorization.",
)
async def login(credentials: UserLogin):
    """Authenticate user with username and password to issue Bearer JWT token."""
    user = next((u for u in users_db if u["username"] == credentials.username), None)
    if not user or not AuthService.verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = AuthService.create_access_token(username=user["username"])
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
async def list_users():
    """List public profiles of all users."""
    return [
        {"id": u["id"], "username": u["username"], "email": u["email"]}
        for u in users_db
    ]

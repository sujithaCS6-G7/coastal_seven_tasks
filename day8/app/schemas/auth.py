"""Authentication schemas for user registration, login, and tokens."""

from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    """Schema for registering a new user."""

    username: str = Field(..., min_length=3, max_length=50, examples=["sujitha"])
    email: str = Field(..., examples=["sujitha@example.com"])
    password: str = Field(..., min_length=4, max_length=100, examples=["password123"])


class UserLogin(BaseModel):
    """Schema for JSON login."""

    username: str = Field(..., examples=["admin"])
    password: str = Field(..., examples=["password123"])


class UserOut(BaseModel):
    """Public user response schema."""

    id: int
    username: str
    email: str


class Token(BaseModel):
    """OAuth2 / JWT Token response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int = 60

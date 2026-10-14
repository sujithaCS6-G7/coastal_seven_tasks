"""Pydantic schemas for authentication and user management."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Payload for user registration."""

    username: str = Field(..., min_length=3, max_length=50, examples=["sujitha"])
    email: EmailStr = Field(..., examples=["sujitha@ecommerce.com"])
    password: str = Field(..., min_length=4, max_length=100, examples=["password123"])
    role: str = Field(default="customer", examples=["customer"])


class UserLogin(BaseModel):
    """Payload for user login."""

    username: str = Field(..., examples=["admin"])
    password: str = Field(..., examples=["password123"])


class UserOut(BaseModel):
    """Public user profile schema."""

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """JWT Bearer token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int = 120
    user: UserOut

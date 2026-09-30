"""Pydantic schemas for request and response models."""

from typing import Any
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth & User Schemas
# ---------------------------------------------------------------------------

class UserRegister(BaseModel):
    """Schema for user registration."""
    username: str = Field(..., min_length=3, max_length=50, example="sujitha")
    email: str = Field(..., example="sujitha@example.com")
    password: str = Field(..., min_length=4, max_length=100, example="secret123")


class UserLogin(BaseModel):
    """Schema for JSON-based login."""
    username: str = Field(..., example="sujitha")
    password: str = Field(..., example="secret123")


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


class TokenPayload(BaseModel):
    """JWT Token payload schema."""
    sub: str | None = None
    exp: int | None = None


# ---------------------------------------------------------------------------
# Product Schemas
# ---------------------------------------------------------------------------

class ProductCreate(BaseModel):
    """Schema for product creation."""
    name: str = Field(..., example="Laptop")
    price: float = Field(..., gt=0, example=50000.0)


class ProductOut(BaseModel):
    """Schema for product retrieval."""
    id: int
    name: str
    price: float


# ---------------------------------------------------------------------------
# Common & Job Schemas
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    detail: str | None = None

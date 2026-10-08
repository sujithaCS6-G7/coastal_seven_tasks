"""Pydantic schemas for product management and catalog."""

from datetime import datetime
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    """Payload to create a new product."""

    name: str = Field(..., min_length=2, max_length=150, examples=["Wireless Mouse"])
    description: str | None = Field(None, examples=["Ergonomic optical mouse."])
    price: float = Field(..., gt=0, examples=[49.99])
    stock: int = Field(..., ge=0, examples=[50])
    category: str = Field(default="General", examples=["Accessories"])


class ProductUpdate(BaseModel):
    """Payload to update an existing product."""

    name: str | None = Field(None, min_length=2, max_length=150)
    description: str | None = None
    price: float | None = Field(None, gt=0)
    stock: int | None = Field(None, ge=0)
    category: str | None = None


class ProductOut(BaseModel):
    """Product response schema."""

    id: int
    name: str
    description: str | None = None
    price: float
    stock: int
    category: str
    image_url: str | None = None
    relevance_score: float | None = None
    match_type: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    """Paginated product list with cache status and optional database search metadata."""

    total: int
    products: list[ProductOut]
    cached: bool = False
    query: str | None = None
    search_mode: str | None = None
    index_used: str | None = None


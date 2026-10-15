"""Pydantic schemas for Redis-backed shopping cart."""

from pydantic import BaseModel, Field


class CartItemAdd(BaseModel):
    """Payload to add an item to the shopping cart."""

    product_id: int = Field(..., gt=0, examples=[1])
    quantity: int = Field(1, ge=1, examples=[2])


class CartItemUpdate(BaseModel):
    """Payload to update an item's quantity in cart."""

    quantity: int = Field(..., ge=1, examples=[3])


class CartItemOut(BaseModel):
    """Cart item line details."""

    product_id: int
    name: str
    price: float
    quantity: int
    subtotal: float
    image_url: str | None = None


class CartOut(BaseModel):
    """Current shopping cart response."""

    user_id: int
    items: list[CartItemOut]
    total_items: int
    total_price: float

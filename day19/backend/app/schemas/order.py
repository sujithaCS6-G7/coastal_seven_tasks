"""Pydantic schemas for order management and lifecycle."""

from datetime import datetime
from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    """Payload to checkout and place an order."""

    shipping_address: str = Field(
        ...,
        min_length=5,
        examples=["123 Tech Park, Coastal Road, Visakhapatnam, AP, 530003"],
    )


class OrderItemOut(BaseModel):
    """Details of an item within an order."""

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    """Order response schema."""

    id: int
    order_number: str
    user_id: int
    total_amount: float
    status: str
    shipping_address: str
    created_at: datetime
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    """Payload for updating order status."""

    status: str = Field(
        ...,
        examples=["SHIPPED"],
        description="Allowed statuses: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED",
    )


class AdminOrderUserOut(BaseModel):
    """Customer information embedded in admin order view."""

    id: int
    username: str
    email: str

    model_config = {"from_attributes": True}


class AdminOrderOut(BaseModel):
    """Comprehensive order response for Admin Dashboard."""

    id: int
    order_number: str
    user_id: int
    total_amount: float
    status: str
    shipping_address: str
    created_at: datetime
    items: list[OrderItemOut]
    user: AdminOrderUserOut | None = None

    model_config = {"from_attributes": True}

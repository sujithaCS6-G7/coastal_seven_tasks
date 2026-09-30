"""Product schemas for data validation and Swagger schemas."""

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    """Schema for creating a product."""

    name: str = Field(..., examples=["Laptop"])
    price: float = Field(..., gt=0, examples=[50000.0])


class ProductOut(BaseModel):
    """Schema for product responses."""

    id: int
    name: str
    price: float

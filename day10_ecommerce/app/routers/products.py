"""Products router for catalog browsing, Redis caching, and management."""

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductOut,
    ProductUpdate,
)
from app.services.auth_service import get_current_admin
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products & Catalog"])


@router.get(
    "/",
    response_model=ProductListResponse,
    summary="List Products (Redis Cached)",
)
def list_products(
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve product catalog with automatic Redis Cache-Aside caching."""
    return ProductService.list_products(db, category=category, limit=limit, offset=offset)


@router.get(
    "/{product_id}",
    response_model=ProductOut,
    summary="Get Product by ID",
)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a specific product."""
    return ProductService.get_by_id(db, product_id)


@router.post(
    "/",
    response_model=ProductOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Product (Admin Only)",
)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create a new product catalog item (requires admin Bearer token)."""
    return ProductService.create(db, data)


@router.put(
    "/{product_id}",
    response_model=ProductOut,
    summary="Update Product (Admin Only)",
)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update product information and invalidate cache."""
    return ProductService.update(db, product_id, data)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Product (Admin Only)",
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a product item and invalidate cache."""
    ProductService.delete(db, product_id)


@router.post(
    "/{product_id}/image",
    response_model=ProductOut,
    summary="Upload Product Image (Admin Only)",
)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Upload and optimize product image with Pillow."""
    return await ProductService.upload_image(db, product_id, file)

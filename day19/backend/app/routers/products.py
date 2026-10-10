"""Products router for catalog browsing, Redis caching, and management."""

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
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
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/products", tags=["Products & Catalog"])


@router.get(
    "/",
    response_model=ProductListResponse,
    summary="List Products (Redis Cached, GZip Compressed & Rate Limited)",
)
@limiter.limit(settings.RATE_LIMIT_CATALOG)
def list_products(
    request: Request,
    category: str | None = Query(None, description="Filter by category"),
    q: str | None = Query(None, description="Optional search query"),
    mode: str | None = Query(None, description="Search mode: fulltext, fuzzy, or combined"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retrieve product catalog with Redis Cache-Aside caching or PostgreSQL FTS/Fuzzy search."""
    if q and q.strip():
        return ProductService.search_products(
            db, q=q, mode=mode or "fulltext", category=category, limit=limit, offset=offset
        )
    return ProductService.list_products(db, category=category, limit=limit, offset=offset)


@router.get(
    "/search",
    response_model=ProductListResponse,
    summary="PostgreSQL Full-Text & Fuzzy Trigram Product Search (Rate Limited)",
)
@limiter.limit(settings.RATE_LIMIT_SEARCH)
def search_products(
    request: Request,
    q: str = Query("", description="Search query (supports multi-word FTS and typo-tolerant fuzzy search)"),
    mode: str = Query(
        "fulltext",
        description="Search mode: 'fulltext' (tsvector + ts_rank + GIN), 'fuzzy' (pg_trgm similarity + GIN), or 'combined'",
    ),
    category: str | None = Query(None, description="Optional category filter"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Search products inside PostgreSQL using tsvector/tsquery + GIN index or pg_trgm trigram similarity."""
    return ProductService.search_products(
        db, q=q, mode=mode, category=category, limit=limit, offset=offset
    )


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

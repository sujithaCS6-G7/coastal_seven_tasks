"""Products router demonstrating Redis Cache-Aside, TTL, invalidation, and rate limiting."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.database.database import products_db
from app.schemas.auth import UserOut
from app.schemas.product import ProductCreate, ProductOut
from app.services.auth_service import get_current_user
from app.services.cache_service import CACHE_KEY_PRODUCTS, CacheService
from app.services.rate_limit_service import rate_limiter

router = APIRouter(prefix="/products", tags=["Products & Redis Caching"])


@router.get(
    "",
    summary="Get All Products (Cache-Aside + Sliding Rate Limit)",
    description=(
        "Retrieves product list using the Redis Cache-Aside pattern (60s TTL). "
        "Enforces a sliding-window rate limit of 5 requests per 60 seconds per IP."
    ),
    dependencies=[Depends(rate_limiter(max_requests=5, window_seconds=60))],
)
async def get_products():
    """Fetch products with Redis Cache-Aside and return cache diagnostic metadata."""
    # 1. Attempt reading from Redis cache
    cached_data, ttl = CacheService.get(CACHE_KEY_PRODUCTS)
    if cached_data is not None:
        return {
            "cached": True,
            "source": "Redis In-Memory Cache",
            "ttl_remaining_seconds": ttl,
            "count": len(cached_data),
            "data": cached_data,
            "explanation": "Cache HIT! Data served directly from Redis RAM without querying the database.",
        }

    # 2. Cache MISS: Retrieve from database
    data = list(products_db)

    # 3. Store result into Redis with 60-second TTL
    CacheService.set(CACHE_KEY_PRODUCTS, data, ttl=60)

    return {
        "cached": False,
        "source": "Primary Database",
        "ttl_remaining_seconds": 60,
        "count": len(data),
        "data": data,
        "explanation": "Cache MISS! Retrieved from database and populated into Redis with a 60-second TTL.",
    }


@router.get(
    "/{product_id}",
    response_model=ProductOut,
    summary="Get Product by ID",
    description="Retrieve a single product by its primary identifier.",
)
async def get_product(product_id: int):
    """Retrieve product detail."""
    product = next((p for p in products_db if p["id"] == product_id), None)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found.",
        )
    return product


@router.post(
    "",
    response_model=ProductOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Product (Requires Auth & Invalidates Cache)",
    description=(
        "Creates a new product record in the database. "
        "Requires Bearer Token authentication. "
        "Automatically purges the Redis cache to maintain data consistency."
    ),
)
async def create_product(
    product_in: ProductCreate,
    current_user: UserOut = Depends(get_current_user),
):
    """Insert new product and invalidate stale Redis cache."""
    new_id = max((p["id"] for p in products_db), default=0) + 1
    new_product = {
        "id": new_id,
        "name": product_in.name,
        "price": product_in.price,
    }
    products_db.append(new_product)

    # Cache Invalidation: Stale data must not be served
    CacheService.invalidate(CACHE_KEY_PRODUCTS)

    return new_product


@router.delete(
    "/cache/clear",
    summary="Manually Invalidate Redis Cache",
    description="Explicitly flushes the 'products' cache key so the next GET request is a cache miss.",
)
async def clear_products_cache():
    """Purge cached products from Redis."""
    purged = CacheService.invalidate(CACHE_KEY_PRODUCTS)
    return {
        "status": "success",
        "cache_key": CACHE_KEY_PRODUCTS,
        "purged": purged,
        "message": "Redis cache invalidated. The next request to GET /products will query the database.",
    }

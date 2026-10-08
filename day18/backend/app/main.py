"""Day 10 E-Commerce Mini Project - Main FastAPI Application."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import check_db_connection, init_db
from app.routers import (
    auth_router,
    cart_router,
    orders_router,
    products_router,
    tasks_router,
    websocket_router,
)
from app.services.order_service import ws_order_manager
from app.utils.redis_client import redis_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to initialize database and seed catalog."""
    init_db()
    yield


tags_metadata = [
    {"name": "System Status"},
    {"name": "Authentication & Users"},
    {"name": "Products & Catalog"},
    {"name": "Redis Shopping Cart"},
    {"name": "Orders & Checkout"},
    {"name": "Background Tasks (Celery)"},
    {"name": "WebSockets"},
]

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Full-stack Day 18 E-Commerce API with Celery Background Task Lifecycle, Async PDF Invoice Generation, Bulk CSV Product Import, PostgreSQL Full-Text Search (tsvector + GIN), PostgreSQL Fuzzy Search (pg_trgm + GIN), and SQLAlchemy N+1 Query Optimization.",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Environment-driven CORS configuration (allows configured frontend origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


@app.middleware("http")
async def add_cache_control_headers(request, call_next):
    """Attach long-lived Cache-Control headers to static product images for Lighthouse."""
    response = await call_next(request)
    if request.url.path.startswith("/uploads/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


# Mount product uploads folder for static serving
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get(
    "/",
    tags=["System Status"],
    summary="Root Health Check",
)
def root_health():
    """Verify application, PostgreSQL, Redis, CORS, Celery Tasks, and WebSocket system health status."""
    pg_ok = check_db_connection()
    redis_ok = redis_manager.is_connected()
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "cors_allowed_origins": settings.cors_origins_list,
        "database": {
            "name": "day10_db",
            "type": "PostgreSQL",
            "connected": pg_ok,
        },
        "redis": {
            "status": "connected" if redis_ok else "fallback_active",
            "connected": redis_ok,
        },
        "active_websockets": ws_order_manager.get_active_count(),
        "docs_url": "/docs",
        "features": [
            "Environment-Configured CORS & JWT Bearer Authentication",
            "Product CRUD & Pillow Image Processing",
            "Redis Fast Shopping Cart (24h TTL)",
            "Redis Product Catalog Cache-Aside",
            "PostgreSQL Atomic Stock Validation & Order Checkout",
            "Celery Task Lifecycle Polling (PENDING -> STARTED -> COMPLETED / FAILED)",
            "Asynchronous PDF Invoice Generation with Download",
            "Asynchronous Bulk CSV Product Import with Live Row Progress",
            "PostgreSQL Full-Text Search (tsvector + ts_rank + GIN Index)",
            "PostgreSQL Typo-Tolerant Fuzzy Search (pg_trgm + GIN Trigram Index)",
            "SQLAlchemy N+1 Query Optimization (joinedload + selectinload)",
            "Real-Time WebSocket Order Tracking & Admin-Customer Live Chat",
        ],
    }


# Include Routers in logical order
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(tasks_router)
app.include_router(websocket_router)


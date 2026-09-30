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
    {"name": "WebSockets"},
]

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Full-stack E-Commerce API with JWT Authentication, Product Catalog & Pillow Uploads, Redis Cart & Caching, PostgreSQL (day10_db) Orders & Stock Validation, Celery Background Tasks, and Real-Time WebSockets.",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount product uploads folder for static serving
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get(
    "/",
    tags=["System Status"],
    summary="Root Health Check",
)
def root_health():
    """Verify application, PostgreSQL, and Redis system health status."""
    pg_ok = check_db_connection()
    redis_ok = redis_manager.is_connected()
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
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
            "JWT Bearer Authentication & Role Control",
            "Product CRUD & Pillow Image Processing",
            "Redis Fast Shopping Cart (24h TTL)",
            "Redis Product Catalog Cache-Aside",
            "PostgreSQL Atomic Stock Validation & Order Checkout",
            "Celery Order-Confirmation Email Processing",
            "Real-Time WebSocket Order Tracking",
        ],
    }


# Include Routers in logical order
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(websocket_router)

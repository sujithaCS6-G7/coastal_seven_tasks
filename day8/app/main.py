"""Main FastAPI application entry point for Day 8."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    analytics_router,
    auth_router,
    health_router,
    jobs_router,
    products_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("app.main")

tags_metadata = [
    {
        "name": "Health & System Status",
        "description": "System health probes, Redis connection diagnostics, and general API metadata.",
    },
    {
        "name": "Authentication & Authorization",
        "description": "User registration, JWT token generation, and OAuth2 authentication.",
    },
    {
        "name": "Products & Redis Caching",
        "description": "Redis Cache-Aside pattern (60s TTL), automatic cache invalidation upon product creation, and sliding-window rate limiting.",
    },
    {
        "name": "Async Concurrency (asyncio.gather)",
        "description": "Concurrent microservices execution comparing asyncio.gather() against sequential iteration with performance benchmarking.",
    },
    {
        "name": "Background Tasks (FastAPI vs Celery)",
        "description": "In-process BackgroundTasks vs distributed background jobs managed by Celery workers with real-time progress states and retries.",
    },
]

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan lifecycle events."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info("Modular routers loaded: health, auth, products, analytics, jobs.")
    yield
    logger.info("Application shutdown completed.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Production-grade API demonstrating asynchronous programming, Redis caching, sliding-window rate limiting, and distributed Celery background tasks.",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(analytics_router)
app.include_router(jobs_router)


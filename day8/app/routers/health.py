"""Health and system diagnostics router."""

from fastapi import APIRouter
from app.core.config import settings
from app.database.database import check_db_connection, check_redis_connection

router = APIRouter(tags=["Health & System Status"])


@router.get("/", summary="Root Health Check", description="Verify API operational status and database connections.")
async def root_health():
    """Return system status and connected services."""
    redis_online = check_redis_connection()
    postgres_online = check_db_connection()
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "database": {
            "postgresql_name": "day8_db",
            "postgresql_connected": postgres_online,
            "redis_connected": redis_online,
        },
        "docs_url": "/docs",
        "features": [
            "PostgreSQL Relational Storage (day8_db in pgAdmin)",
            "Redis Cache-Aside Pattern with TTL & Invalidation",
            "Sliding-Window Rate Limiting (Redis ZSET)",
            "Async Concurrency (asyncio.gather)",
            "Distributed Background Tasks (Celery & Flower)",
            "JWT Authentication (OAuth2 Bearer in Swagger)",
        ],
    }


@router.get("/health", summary="Health Check", description="Liveness probe for orchestration and monitoring.")
async def health_check():
    """Liveness probe."""
    redis_online = check_redis_connection()
    postgres_online = check_db_connection()
    return {
        "status": "healthy" if (redis_online and postgres_online) else "degraded",
        "postgresql": "connected" if postgres_online else "offline",
        "redis": "connected" if redis_online else "offline",
    }

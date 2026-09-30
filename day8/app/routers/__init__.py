"""Routers package consolidating all API route modules."""

from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.jobs import router as jobs_router
from app.routers.products import router as products_router

__all__ = [
    "analytics_router",
    "auth_router",
    "health_router",
    "jobs_router",
    "products_router",
]

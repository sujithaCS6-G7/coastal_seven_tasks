"""Routers package exporting all API route modules."""

from app.routers.auth import router as auth_router
from app.routers.products import router as products_router
from app.routers.cart import router as cart_router
from app.routers.orders import router as orders_router
from app.routers.tasks import router as tasks_router
from app.routers.websocket import router as websocket_router

__all__ = [
    "auth_router",
    "products_router",
    "cart_router",
    "orders_router",
    "tasks_router",
    "websocket_router",
]


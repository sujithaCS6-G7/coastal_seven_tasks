from app.routers.auth import router as auth_router
from app.routers.health import health_router
from app.routers.upload import legacy_upload_router, upload_router
from app.routers.websocket import websocket_router

__all__ = [
    "auth_router",
    "health_router",
    "upload_router",
    "legacy_upload_router",
    "websocket_router",
]


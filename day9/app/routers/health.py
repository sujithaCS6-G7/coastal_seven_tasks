"""Health check and system diagnostics router."""

from typing import Any
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import get_upload_dir, settings
from app.database.database import check_db_connection
from app.websocket.connection_manager import ws_manager

health_router = APIRouter(tags=["System Status"])


@health_router.get(
    "/",
    summary="Root Health Check",
    description="Root API metadata, PostgreSQL (day9_db) status, and dashboard link.",
)
async def root_health(request: Request) -> Any:
    """Serve interactive dashboard to browsers, or return JSON status to API clients and Swagger UI."""
    accept_header = request.headers.get("accept", "")
    format_query = request.query_params.get("format", "")

    # Return JSON if explicitly requested as application/json or format=json
    if format_query == "json" or accept_header == "application/json":
        postgres_online = check_db_connection()
        return JSONResponse(
            {
                "status": "online",
                "app_name": settings.APP_NAME,
                "version": settings.VERSION,
                "database": {
                    "postgresql_name": "day9_db",
                    "postgresql_connected": postgres_online,
                },
                "active_websockets": ws_manager.get_active_count(),
                "docs_url": "/docs",
                "features": [
                    "PostgreSQL Database (day9_db in pgAdmin)",
                    "Pillow Image Resizing (Thumbnails & Medium)",
                    "Real-Time WebSocket Notifications",
                    "JWT Bearer Authentication",
                    "Upload Audit & History Tracking",
                ],
            }
        )

    index_file = settings.STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file), media_type="text/html")

    postgres_online = check_db_connection()
    return JSONResponse(
        {
            "status": "online",
            "app_name": settings.APP_NAME,
            "version": settings.VERSION,
            "database": {
                "postgresql_name": "day9_db",
                "postgresql_connected": postgres_online,
            },
            "active_websockets": ws_manager.get_active_count(),
            "docs_url": "/docs",
        }
    )


@health_router.get(
    "/health",
    include_in_schema=False,
    summary="Health Check",
    description="Probes PostgreSQL (day9_db) connectivity, active WebSocket connections, and upload storage directory.",
)
async def health_check() -> dict[str, Any]:
    """System health check and diagnostic probe."""
    postgres_online = check_db_connection()
    upload_path = get_upload_dir()
    return {
        "status": "healthy" if postgres_online else "degraded",
        "app": "day9",
        "database": "connected" if postgres_online else "offline",
        "database_name": "day9_db",
        "active_websockets": ws_manager.get_active_count(),
        "upload_dir": str(upload_path),
    }


@health_router.get(
    "/api/v1/health",
    include_in_schema=False,
    summary="API Health Probe (Legacy)",
)
async def api_health() -> dict[str, Any]:
    """Legacy API health check endpoint."""
    return await health_check()

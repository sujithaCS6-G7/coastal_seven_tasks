"""Main FastAPI application entry point for Day 9."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_upload_dir, settings
from app.core.logging_config import logger, setup_logging
from app.database.database import init_db
from app.routers import (
    auth_router,
    health_router,
    legacy_upload_router,
    upload_router,
    websocket_router,
)

# Initialize logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle context manager."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    # Initialize PostgreSQL tables in day9_db
    init_db()
    yield
    logger.info("Application shutdown completed.")


tags_metadata = [
    {"name": "System Status"},
    {"name": "Authentication & Authorization"},
    {"name": "Files & Image Processing"},
]

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Production-grade API for secure file uploads, Pillow image processing, PostgreSQL persistence (day9_db in pgAdmin), JWT Bearer authentication, and real-time WebSocket notifications.",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DynamicStaticFiles(StaticFiles):
    """StaticFiles subclass that dynamically resolves the active upload directory."""

    def __init__(self, **kwargs):
        super().__init__(check_dir=False, **kwargs)

    async def get_response(self, path: str, scope):
        active_dir = str(get_upload_dir())
        self.directory = active_dir
        self.all_directories = [active_dir]
        return await super().get_response(path, scope)


# Mount uploads directory with dynamic path resolution
app.mount("/uploads", DynamicStaticFiles(), name="uploads")

# Mount static folder
static_dir = settings.STATIC_DIR
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Include Routers in logical order
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(legacy_upload_router)
app.include_router(websocket_router, include_in_schema=False)


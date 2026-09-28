"""Day 9 Application Configuration."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for Day 9."""

    APP_NAME: str = "Day 9: File Uploads & WebSockets"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # PostgreSQL Database URL (day9_db in pgAdmin)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:Suji%40123@localhost:5432/day9_db",
    )

    # Base Paths
    APP_DIR: Path = Path(__file__).resolve().parent.parent
    PROJECT_ROOT: Path = APP_DIR.parent
    UPLOAD_DIR: Path = PROJECT_ROOT / "uploads"
    STATIC_DIR: Path = PROJECT_ROOT / "static"

    # Subdirectories
    IMAGES_SUBDIR: str = "images"
    PROCESSED_SUBDIR: str = "processed"
    ORIGINALS_SUBDIR: str = "originals"
    THUMBNAILS_SUBDIR: str = "thumbnails"
    MEDIUM_SUBDIR: str = "medium"

    # Security & Upload Constraints
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 Megabytes
    ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    ALLOWED_MIME_TYPES: set[str] = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }

    # Image Dimension Constraints
    MAX_IMAGE_WIDTH: int = 4096
    MAX_IMAGE_HEIGHT: int = 4096
    THUMBNAIL_SIZE: tuple[int, int] = (150, 150)
    MEDIUM_SIZE: tuple[int, int] = (800, 800)

    # JWT & Authentication (HTTPBearer)
    SECRET_KEY: str = "day9-super-secret-jwt-key-2026-auth"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()

# Dynamic upload directory override for test isolation
current_upload_dir = settings.UPLOAD_DIR


def get_upload_dir() -> Path:
    """Retrieve active upload directory."""
    return current_upload_dir


def set_upload_dir(new_dir: Path) -> None:
    """Set active upload directory (useful for test isolation)."""
    global current_upload_dir
    current_upload_dir = new_dir
    ensure_upload_dirs(new_dir)


def ensure_upload_dirs(base_dir: Path | None = None) -> dict[str, Path]:
    """Ensure upload subdirectories exist."""
    root = base_dir or current_upload_dir
    images = root / settings.IMAGES_SUBDIR
    processed = root / settings.PROCESSED_SUBDIR
    originals = root / settings.ORIGINALS_SUBDIR
    thumbnails = root / settings.THUMBNAILS_SUBDIR
    medium = root / settings.MEDIUM_SUBDIR

    for folder in [root, images, processed, originals, thumbnails, medium]:
        folder.mkdir(parents=True, exist_ok=True)

    return {
        "root": root,
        "images": images,
        "processed": processed,
        "originals": originals,
        "thumbnails": thumbnails,
        "medium": medium,
    }


# Ensure directories on module import
ensure_upload_dirs()

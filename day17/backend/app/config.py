"""Day 10 E-Commerce Mini Project Configuration."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings."""

    APP_NAME: str = "Nexora Day 17 Full-Stack & Real-Time E-Commerce API"
    VERSION: str = "17.0.0"
    DEBUG: bool = True

    # CORS & Frontend Origins
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5177")
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5177,http://127.0.0.1:5177,http://localhost:5176,http://127.0.0.1:5176,http://localhost:5175,http://127.0.0.1:5175,http://localhost:5173,http://127.0.0.1:5173",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a clean list of allowed origins."""
        origins = [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]
        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN not in origins:
            origins.insert(0, self.FRONTEND_ORIGIN)
        return origins

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:Suji%40123@localhost:5432/day10_db",
    )

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Celery
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv(
        "CELERY_RESULT_BACKEND", "redis://localhost:6379/2"
    )

    # Security & JWT
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "day10-ecommerce-super-secret-jwt-key-2026"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Paths & Uploads
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
    UPLOAD_DIR: Path = PROJECT_ROOT / "uploads" / "products"
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: set[str] = {"image/jpeg", "image/png", "image/webp"}

    # TTL Configs
    CART_TTL_SECONDS: int = 86400  # 24 Hours
    PRODUCT_CACHE_TTL_SECONDS: int = 300  # 5 Minutes

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()

# Ensure uploads directory exists
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

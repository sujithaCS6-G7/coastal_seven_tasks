"""Application configuration and settings."""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration loaded from environment variables or .env file."""

    APP_NAME: str = "Day 8: Async, Redis & Celery Tasks"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # JWT Authentication
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "day8-super-secret-jwt-token-key-for-internship-32chars"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # PostgreSQL Database URL (pgAdmin)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:Suji%40123@localhost:5432/day8_db",
    )

    # Redis Connection Settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

    # Celery Broker and Result Backend URLs
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()

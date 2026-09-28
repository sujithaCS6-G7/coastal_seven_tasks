"""Application configuration and settings."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""

    APP_NAME: str = "Day 8: High-Performance Async, Caching & Distributed Systems"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "day8-super-secret-jwt-token-key-for-development-32chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

    # Celery
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

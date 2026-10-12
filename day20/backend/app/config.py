"""Day 20 E-Commerce AI Streaming RAG & LangChain Configuration."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings with Day 20 AI & RAG Configuration."""

    APP_NAME: str = "Nexora Day 20 AI Streaming RAG & LangChain Catalog API"
    VERSION: str = "20.0.0"
    DEBUG: bool = True

    # CORS & Frontend Origins (Day 20 Frontend on 5181 + Day 19/18 fallbacks)
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5181")
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5181,http://127.0.0.1:5181,http://localhost:5180,http://127.0.0.1:5180,http://localhost:5179,http://127.0.0.1:5179",
    )
    DEFAULT_ORIGIN_FALLBACKS: tuple[str, ...] = (
        "http://localhost:5181",
        "http://127.0.0.1:5181",
        "http://localhost:5180",
        "http://127.0.0.1:5180",
    )

    # Response Compression & SlowAPI Rate Limiting
    GZIP_MINIMUM_SIZE: int = int(os.getenv("GZIP_MINIMUM_SIZE", "500"))
    RATE_LIMIT_AUTH: str = os.getenv("RATE_LIMIT_AUTH", "3/minute")
    RATE_LIMIT_REGISTER: str = os.getenv("RATE_LIMIT_REGISTER", "3/minute")
    RATE_LIMIT_CATALOG: str = os.getenv("RATE_LIMIT_CATALOG", "180/minute")
    RATE_LIMIT_SEARCH: str = os.getenv("RATE_LIMIT_SEARCH", "90/minute")
    RATE_LIMIT_TASKS: str = os.getenv("RATE_LIMIT_TASKS", "30/minute")
    RATE_LIMIT_PROBE: str = os.getenv("RATE_LIMIT_PROBE", "5/minute")
    RATE_LIMIT_AI: str = os.getenv("RATE_LIMIT_AI", "60/minute")

    # Day 20 LLM Providers Configuration (Configurable primary & fallbacks)
    LLM_PRIMARY_PROVIDER: str = os.getenv("LLM_PRIMARY_PROVIDER", "gemini")
    LLM_FALLBACK_PROVIDER: str = os.getenv("LLM_FALLBACK_PROVIDER", "groq")
    LLM_TERTIARY_PROVIDER: str = os.getenv("LLM_TERTIARY_PROVIDER", "mistral")

    # Groq API (Free Tier Llama 3.3 70B / 3.1 8B via OpenAI compatible endpoint)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_BASE_URL: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

    # Google Gemini API (Free Tier Gemini 1.5 Flash / 2.0 Flash)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Mistral API (Free tier Mistral Small / 7B)
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-small-latest")
    MISTRAL_BASE_URL: str = os.getenv("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")

    # OpenAI-Compatible General Endpoint
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # RAG Vector Store & ChromaDB Configuration
    CHROMA_PERSIST_DIR: Path = Path(__file__).resolve().parent.parent / "chroma_data"
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "4"))
    RAG_CHUNK_SIZE: int = int(os.getenv("RAG_CHUNK_SIZE", "600"))
    RAG_CHUNK_OVERLAP: int = int(os.getenv("RAG_CHUNK_OVERLAP", "100"))

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
        for fallback in self.DEFAULT_ORIGIN_FALLBACKS:
            if fallback not in origins:
                origins.append(fallback)
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
    INVOICE_DIR: Path = PROJECT_ROOT / "uploads" / "invoices"
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: set[str] = {"image/jpeg", "image/png", "image/webp"}

    # TTL Configs
    CART_TTL_SECONDS: int = 86400  # 24 Hours
    PRODUCT_CACHE_TTL_SECONDS: int = 300  # 5 Minutes

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        extra="ignore",
    )


settings = Settings()

# Ensure uploads, invoices, and chroma directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.INVOICE_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)

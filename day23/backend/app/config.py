"""Day 22 AI Focus Project Configuration (RAG, Semantic Search, AI Descriptions, WebSockets, Celery AI Workers, Redis Cache & $0 Cost Governance)."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings for the Day 22 AI Focus Project."""

    APP_NAME: str = "NexoraAI Production E-Commerce Store"
    VERSION: str = "23.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # CORS & Frontend Origins (Day 22 Frontend on 5183 + Day 21/20/19/18 + Cloud Hosting Fallbacks)
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5183")
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5183,http://127.0.0.1:5183,http://localhost:5182,http://127.0.0.1:5182,http://localhost:5181,http://127.0.0.1:5181,http://localhost:5180,http://127.0.0.1:5180,http://localhost:5179,http://127.0.0.1:5179,http://localhost:5173,http://127.0.0.1:5173",
    )
    DEFAULT_ORIGIN_FALLBACKS: tuple[str, ...] = (
        "http://localhost:5183",
        "http://127.0.0.1:5183",
        "http://localhost:5182",
        "http://127.0.0.1:5182",
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
    RATE_LIMIT_AI_USER: str = os.getenv("RATE_LIMIT_AI_USER", "10/minute")

    # Per-User AI Rate Limiting (Redis-backed with in-memory fallback)
    AI_USER_RATE_LIMIT_COUNT: int = int(os.getenv("AI_USER_RATE_LIMIT_COUNT", "10"))
    AI_USER_RATE_LIMIT_WINDOW_SECONDS: int = int(
        os.getenv("AI_USER_RATE_LIMIT_WINDOW_SECONDS", "60")
    )
    AI_ANON_RATE_LIMIT_COUNT: int = int(os.getenv("AI_ANON_RATE_LIMIT_COUNT", "5"))

    # Redis AI Response Caching
    AI_CACHE_ENABLED: bool = os.getenv("AI_CACHE_ENABLED", "true").lower() == "true"
    AI_CACHE_TTL_SECONDS: int = int(os.getenv("AI_CACHE_TTL_SECONDS", "300"))
    AI_CACHE_PREFIX: str = os.getenv("AI_CACHE_PREFIX", "ai:cache:v22")

    # Content Moderation & Agent Safety
    AI_MODERATION_ENABLED: bool = (
        os.getenv("AI_MODERATION_ENABLED", "true").lower() == "true"
    )
    AI_MAX_INPUT_CHARS: int = int(os.getenv("AI_MAX_INPUT_CHARS", "1500"))
    AI_AGENT_MAX_ITERATIONS: int = int(os.getenv("AI_AGENT_MAX_ITERATIONS", "3"))

    # Day 22 Responsible AI & $0 Cost Governance
    AI_ZERO_COST_MODE: bool = os.getenv("AI_ZERO_COST_MODE", "true").lower() == "true"
    AI_TARGET_SPEND_USD: float = float(os.getenv("AI_TARGET_SPEND_USD", "0.0"))
    GEMINI_FREE_RPM_LIMIT: int = int(os.getenv("GEMINI_FREE_RPM_LIMIT", "15"))
    GEMINI_FREE_RPD_LIMIT: int = int(os.getenv("GEMINI_FREE_RPD_LIMIT", "1500"))
    GROQ_FREE_RPM_LIMIT: int = int(os.getenv("GROQ_FREE_RPM_LIMIT", "30"))
    GROQ_FREE_RPD_LIMIT: int = int(os.getenv("GROQ_FREE_RPD_LIMIT", "14400"))
    MISTRAL_FREE_RPM_LIMIT: int = int(os.getenv("MISTRAL_FREE_RPM_LIMIT", "10"))
    MISTRAL_FREE_RPD_LIMIT: int = int(os.getenv("MISTRAL_FREE_RPD_LIMIT", "1000"))

    # LLM Providers Configuration (Free-Tier Primary & Fallbacks)
    LLM_PRIMARY_PROVIDER: str = os.getenv("LLM_PRIMARY_PROVIDER", "gemini")
    LLM_FALLBACK_PROVIDER: str = os.getenv("LLM_FALLBACK_PROVIDER", "groq")
    LLM_TERTIARY_PROVIDER: str = os.getenv("LLM_TERTIARY_PROVIDER", "mistral")

    # Groq API (Free Tier Llama 3.3 70B via OpenAI-compatible endpoint)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    GROQ_BASE_URL: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

    # Google Gemini API (Free Tier Gemini 2.5 Flash)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Mistral API (Free Tier Mistral Small)
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
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
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

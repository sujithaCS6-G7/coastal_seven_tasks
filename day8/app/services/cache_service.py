"""Redis Cache-Aside, TTL, and cache invalidation service."""

import json
import logging
from typing import Any
from app.database.database import redis_client

logger = logging.getLogger(__name__)

CACHE_KEY_PRODUCTS = "products"
DEFAULT_TTL = 60  # seconds


class CacheService:
    """Encapsulates Redis caching operations."""

    @staticmethod
    def get(key: str = CACHE_KEY_PRODUCTS) -> tuple[Any | None, int | None]:
        """Fetch item from Redis cache and return data along with remaining TTL."""
        try:
            cached_data = redis_client.get(key)
            if cached_data:
                ttl_remaining = redis_client.ttl(key)
                return json.loads(cached_data), ttl_remaining
        except Exception as exc:
            logger.warning(f"Cache get error for key '{key}': {exc}")
        return None, None

    @staticmethod
    def set(key: str = CACHE_KEY_PRODUCTS, data: Any = None, ttl: int = DEFAULT_TTL) -> bool:
        """Store serializable data into Redis with an explicit TTL."""
        try:
            return bool(redis_client.set(key, json.dumps(data), ex=ttl))
        except Exception as exc:
            logger.warning(f"Cache set error for key '{key}': {exc}")
            return False

    @staticmethod
    def invalidate(key: str = CACHE_KEY_PRODUCTS) -> bool:
        """Purge specific key from Redis cache."""
        try:
            return bool(redis_client.delete(key))
        except Exception as exc:
            logger.warning(f"Cache invalidation error for key '{key}': {exc}")
            return False

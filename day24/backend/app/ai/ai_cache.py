"""Day 21 Redis AI Response Caching Service.

Caches successful, moderation-approved AI responses (product descriptions,
semantic searches, and tool-calling agent results) in Redis using deterministic
SHA-256 keys, configurable TTLs, and graceful fallback when Redis is unavailable.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from typing import Any

from app.config import settings
from app.utils.redis_client import redis_manager

logger = logging.getLogger(__name__)


class RedisAICacheService:
    """
    Manages Redis caching for AI operations with:
    - Deterministic cache key construction:
      `{AI_CACHE_PREFIX}:{operation}:{model_version}:{scope}:{sha256_hash}`
    - Configurable TTL (`settings.AI_CACHE_TTL_SECONDS`)
    - Strict isolation between operations, product contexts, and user scopes
    - Graceful degradation when Redis is unavailable (continues safely with in-memory fallback or cache miss)
    """

    def __init__(self) -> None:
        self._memory_fallback: dict[str, tuple[float, dict[str, Any]]] = {}
        self._stats: dict[str, Any] = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "bypasses": 0,
            "redis_errors": 0,
            "last_cache_key": None,
            "last_status": None,
        }

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalize text input by lowercasing, trimming, and collapsing whitespace."""
        return re.sub(r"\s+", " ", (text or "").strip().lower())

    def build_cache_key(
        self,
        operation: str,
        payload: dict[str, Any] | str,
        model_version: str = "v21",
        user_scope: str = "public",
    ) -> str:
        """
        Build a collision-resistant Redis cache key from operation, model version,
        user/context scope, and normalized payload digest.
        """
        if isinstance(payload, str):
            canonical_str = self.normalize_text(payload)
        else:
            normalized_dict = self._normalize_dict(payload)
            canonical_str = json.dumps(normalized_dict, sort_keys=True, separators=(",", ":"))

        digest = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()[:24]
        safe_op = re.sub(r"[^a-zA-Z0-9_-]", "_", operation.lower())
        safe_model = re.sub(r"[^a-zA-Z0-9_.-]", "_", model_version.lower())
        safe_scope = re.sub(r"[^a-zA-Z0-9_:-]", "_", user_scope.lower())
        return f"{settings.AI_CACHE_PREFIX}:{safe_op}:{safe_model}:{safe_scope}:{digest}"

    def _normalize_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for k, v in sorted(data.items()):
            if isinstance(v, str):
                result[k] = self.normalize_text(v)
            elif isinstance(v, list):
                result[k] = [
                    self.normalize_text(item) if isinstance(item, str) else item
                    for item in v
                ]
            elif isinstance(v, dict):
                result[k] = self._normalize_dict(v)
            else:
                result[k] = v
        return result

    def get(self, cache_key: str, bypass: bool = False) -> dict[str, Any] | None:
        """
        Retrieve a cached AI response by key.
        Returns None on cache miss, disabled cache, or Redis unavailability.
        """
        self._stats["last_cache_key"] = cache_key

        if not settings.AI_CACHE_ENABLED or bypass:
            self._stats["bypasses"] += 1
            self._stats["last_status"] = "BYPASS"
            return None

        # 1. Try primary Redis client if connected
        client = getattr(redis_manager, "_client", None)
        if client is not None:
            try:
                raw_json = client.get(cache_key)
                if raw_json:
                    parsed = json.loads(raw_json)
                    self._stats["hits"] += 1
                    self._stats["last_status"] = "HIT"
                    logger.info("[AICache] HIT key=%s (backend=redis)", cache_key)
                    return parsed
            except Exception as exc:
                self._stats["redis_errors"] += 1
                logger.warning(
                    "[AICache] Redis GET error for key=%s, checking memory fallback: %s",
                    cache_key,
                    exc.__class__.__name__,
                )

        # 2. Check in-memory TTL fallback
        entry = self._memory_fallback.get(cache_key)
        if entry is not None:
            expires_at, stored_data = entry
            if time.time() < expires_at:
                self._stats["hits"] += 1
                self._stats["last_status"] = "HIT"
                logger.info("[AICache] HIT key=%s (backend=memory_fallback)", cache_key)
                return stored_data.copy()
            else:
                self._memory_fallback.pop(cache_key, None)

        self._stats["misses"] += 1
        self._stats["last_status"] = "MISS"
        logger.info("[AICache] MISS key=%s", cache_key)
        return None

    def set(
        self,
        cache_key: str,
        data: dict[str, Any],
        ttl_seconds: int | None = None,
    ) -> bool:
        """
        Store a successful AI response in Redis (and fallback memory) with TTL.
        Never caches error payloads or rejected moderation outputs.
        """
        if not settings.AI_CACHE_ENABLED:
            return False

        if not isinstance(data, dict) or data.get("error"):
            return False

        ttl = ttl_seconds if ttl_seconds is not None else settings.AI_CACHE_TTL_SECONDS
        serialized = json.dumps(data, default=str)

        # Always store in memory fallback with expiration timestamp for resilience
        self._memory_fallback[cache_key] = (time.time() + ttl, data.copy())

        client = getattr(redis_manager, "_client", None)
        if client is not None:
            try:
                client.set(cache_key, serialized, ex=ttl)
                self._stats["sets"] += 1
                logger.info("[AICache] SET key=%s ttl=%ds (backend=redis)", cache_key, ttl)
                return True
            except Exception as exc:
                self._stats["redis_errors"] += 1
                logger.warning(
                    "[AICache] Redis SET error for key=%s, stored in memory fallback: %s",
                    cache_key,
                    exc.__class__.__name__,
                )

        self._stats["sets"] += 1
        return True

    def clear(self) -> dict[str, Any]:
        """Clear all Day 21 AI cache keys from Redis and memory fallback."""
        deleted_redis = 0
        client = getattr(redis_manager, "_client", None)
        if client is not None:
            try:
                keys = client.keys(f"{settings.AI_CACHE_PREFIX}:*")
                if keys:
                    deleted_redis = int(client.delete(*keys))
            except Exception as exc:
                self._stats["redis_errors"] += 1
                logger.warning("[AICache] Redis CLEAR error: %s", exc.__class__.__name__)

        deleted_mem = len(self._memory_fallback)
        self._memory_fallback.clear()
        return {
            "status": "cleared",
            "prefix": settings.AI_CACHE_PREFIX,
            "redis_keys_deleted": deleted_redis,
            "memory_keys_deleted": deleted_mem,
        }

    def get_stats(self) -> dict[str, Any]:
        """Return current Redis AI cache telemetry without exposing credentials."""
        total_lookups = self._stats["hits"] + self._stats["misses"]
        hit_rate = round((self._stats["hits"] / total_lookups) * 100.0, 2) if total_lookups > 0 else 0.0
        return {
            "enabled": settings.AI_CACHE_ENABLED,
            "prefix": settings.AI_CACHE_PREFIX,
            "ttl_seconds": settings.AI_CACHE_TTL_SECONDS,
            "redis_connected": redis_manager.is_connected(),
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "sets": self._stats["sets"],
            "bypasses": self._stats["bypasses"],
            "redis_errors": self._stats["redis_errors"],
            "hit_rate_percent": hit_rate,
            "last_cache_key": self._stats["last_cache_key"],
            "last_status": self._stats["last_status"],
        }


ai_cache_service = RedisAICacheService()

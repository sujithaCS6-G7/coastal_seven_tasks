"""Day 22 Responsible AI & $0 Cost Governance Service.

Implements:
- Free-tier API quota tracking (RPM & RPD limits per provider: Gemini 2.5 Flash, Groq Llama 3.3 70B, Mistral Small, Local RAG)
- Token & request usage monitoring across RAG chat, semantic search, product descriptions, agents, and Celery background jobs
- Strict $0.00 API spend governance (blocks or falls back before exceeding free-tier quotas)
- Commercial cost-savings telemetry from Redis AI caching + free-tier routing
"""

from __future__ import annotations

import time
from typing import Any

from app.config import settings
from app.utils.redis_client import redis_manager


class AICostGovernanceService:
    """Monitors AI API quotas, token consumption, cache savings, and enforces $0 API spend."""

    def __init__(self) -> None:
        self._provider_stats: dict[str, dict[str, int]] = {
            "gemini": {"requests": 0, "tokens": 0, "fallbacks": 0},
            "groq": {"requests": 0, "tokens": 0, "fallbacks": 0},
            "mistral": {"requests": 0, "tokens": 0, "fallbacks": 0},
            "local_contextual": {"requests": 0, "tokens": 0, "fallbacks": 0},
            "local_rag": {"requests": 0, "tokens": 0, "fallbacks": 0},
        }
        self._operation_stats: dict[str, int] = {
            "rag_chat_stream": 0,
            "semantic_search": 0,
            "product_description": 0,
            "agent_tool_call": 0,
            "celery_ai_batch": 0,
        }
        self._cache_saved_requests: int = 0
        self._cache_saved_tokens: int = 0
        self._rate_limit_blocks: int = 0
        self._moderation_blocks: int = 0
        self._started_at: float = time.time()

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Estimate token count (~4 characters per token, minimum 1 for non-empty text)."""
        cleaned = (text or "").strip()
        if not cleaned:
            return 0
        return max(1, len(cleaned) // 4)

    def record_ai_usage(
        self,
        provider: str,
        operation: str,
        prompt_text: str = "",
        completion_text: str = "",
        cached: bool = False,
        fallback_triggered: bool = False,
    ) -> dict[str, Any]:
        """Record an AI operation, updating provider quotas, token counts, and cache savings."""
        prov_key = (provider or "local_contextual").lower().strip()
        if prov_key not in self._provider_stats:
            self._provider_stats[prov_key] = {"requests": 0, "tokens": 0, "fallbacks": 0}

        prompt_tokens = self.estimate_tokens(prompt_text)
        completion_tokens = self.estimate_tokens(completion_text)
        total_tokens = prompt_tokens + completion_tokens

        if operation in self._operation_stats:
            self._operation_stats[operation] += 1
        else:
            self._operation_stats[operation] = 1

        if cached:
            self._cache_saved_requests += 1
            self._cache_saved_tokens += max(120, total_tokens)
        else:
            self._provider_stats[prov_key]["requests"] += 1
            self._provider_stats[prov_key]["tokens"] += max(40, total_tokens)
            if fallback_triggered:
                self._provider_stats[prov_key]["fallbacks"] += 1

        # Best-effort sync to Redis for cross-worker visibility
        client = getattr(redis_manager, "_client", None)
        if client is not None:
            try:
                day_bucket = int(time.time() // 86400)
                r_key = f"ai:governance:v22:{prov_key}:{day_bucket}"
                if not cached:
                    client.incr(r_key)
                    client.expire(r_key, 86400)
            except Exception:
                pass


        return {
            "provider": prov_key,
            "operation": operation,
            "cached": cached,
            "estimated_tokens": total_tokens,
            "actual_cost_usd": 0.0,
        }

    def record_moderation_block(self) -> None:
        self._moderation_blocks += 1

    def record_rate_limit_block(self) -> None:
        self._rate_limit_blocks += 1

    def check_provider_free_quota_available(self, provider: str) -> bool:
        """Verify that a provider has remaining free-tier daily quota to guarantee $0 spend."""
        prov_key = (provider or "").lower().strip()
        limits = {
            "gemini": settings.GEMINI_FREE_RPD_LIMIT,
            "groq": settings.GROQ_FREE_RPD_LIMIT,
            "mistral": settings.MISTRAL_FREE_RPD_LIMIT,
        }
        rpd_limit = limits.get(prov_key)
        if rpd_limit is None:
            return True
        used = self._provider_stats.get(prov_key, {}).get("requests", 0)
        return used < rpd_limit

    def get_governance_summary(self) -> dict[str, Any]:
        """Return comprehensive Responsible AI & $0 Cost Governance report."""
        total_live_requests = sum(v["requests"] for v in self._provider_stats.values())
        total_live_tokens = sum(v["tokens"] for v in self._provider_stats.values())
        total_requests_including_cache = total_live_requests + self._cache_saved_requests

        # Commercial benchmark: ~$0.005 per request + $0.002 per 1K tokens avoided
        estimated_saved_usd = round(
            (total_requests_including_cache * 0.005)
            + ((total_live_tokens + self._cache_saved_tokens) / 1000.0 * 0.002),
            4,
        )

        providers_quota = [
            {
                "provider": "gemini",
                "model": settings.GEMINI_MODEL,
                "tier": "Google AI Studio Free Tier",
                "configured": bool(settings.GEMINI_API_KEY.strip()),
                "rpm_limit": settings.GEMINI_FREE_RPM_LIMIT,
                "rpd_limit": settings.GEMINI_FREE_RPD_LIMIT,
                "requests_used": self._provider_stats["gemini"]["requests"],
                "requests_remaining": max(
                    0, settings.GEMINI_FREE_RPD_LIMIT - self._provider_stats["gemini"]["requests"]
                ),
                "tokens_used": self._provider_stats["gemini"]["tokens"],
                "cost_usd": 0.0,
            },
            {
                "provider": "groq",
                "model": settings.GROQ_MODEL,
                "tier": "Groq Cloud Free Tier",
                "configured": bool(settings.GROQ_API_KEY.strip()),
                "rpm_limit": settings.GROQ_FREE_RPM_LIMIT,
                "rpd_limit": settings.GROQ_FREE_RPD_LIMIT,
                "requests_used": self._provider_stats["groq"]["requests"],
                "requests_remaining": max(
                    0, settings.GROQ_FREE_RPD_LIMIT - self._provider_stats["groq"]["requests"]
                ),
                "tokens_used": self._provider_stats["groq"]["tokens"],
                "cost_usd": 0.0,
            },
            {
                "provider": "mistral",
                "model": settings.MISTRAL_MODEL,
                "tier": "Mistral La Plateforme Free Tier",
                "configured": bool(settings.MISTRAL_API_KEY.strip()),
                "rpm_limit": settings.MISTRAL_FREE_RPM_LIMIT,
                "rpd_limit": settings.MISTRAL_FREE_RPD_LIMIT,
                "requests_used": self._provider_stats["mistral"]["requests"],
                "requests_remaining": max(
                    0, settings.MISTRAL_FREE_RPD_LIMIT - self._provider_stats["mistral"]["requests"]
                ),
                "tokens_used": self._provider_stats["mistral"]["tokens"],
                "cost_usd": 0.0,
            },
            {
                "provider": "local_rag_and_contextual",
                "model": "ChromaDB ONNX MiniLM-L6-v2 + Deterministic Synthesizer",
                "tier": "Local Zero-Cost Engine",
                "configured": True,
                "rpm_limit": 9999,
                "rpd_limit": 999999,
                "requests_used": (
                    self._provider_stats["local_contextual"]["requests"]
                    + self._provider_stats["local_rag"]["requests"]
                ),
                "requests_remaining": 999999,
                "tokens_used": (
                    self._provider_stats["local_contextual"]["tokens"]
                    + self._provider_stats["local_rag"]["tokens"]
                ),
                "cost_usd": 0.0,
            },
        ]

        return {
            "zero_cost_mode_enabled": settings.AI_ZERO_COST_MODE,
            "target_spend_usd": 0.0,
            "actual_spend_usd": 0.0,
            "budget_status": "WITHIN_ZERO_COST_TARGET ($0.00)",
            "estimated_commercial_value_saved_usd": estimated_saved_usd,
            "total_ai_requests": total_requests_including_cache,
            "live_provider_requests": total_live_requests,
            "cache_saved_requests": self._cache_saved_requests,
            "total_tokens_processed": total_live_tokens + self._cache_saved_tokens,
            "cache_saved_tokens": self._cache_saved_tokens,
            "guardrail_blocks": {
                "moderation_blocks": self._moderation_blocks,
                "rate_limit_blocks": self._rate_limit_blocks,
            },
            "operations_breakdown": dict(self._operation_stats),
            "provider_quotas": providers_quota,
            "rate_limit_policy": {
                "authenticated_user_limit_per_min": settings.AI_USER_RATE_LIMIT_COUNT,
                "anonymous_ip_limit_per_min": settings.AI_ANON_RATE_LIMIT_COUNT,
                "window_seconds": settings.AI_USER_RATE_LIMIT_WINDOW_SECONDS,
                "redis_cache_ttl_seconds": settings.AI_CACHE_TTL_SECONDS,
            },
        }

    def reset(self) -> None:
        """Reset governance counters (used in deterministic testing)."""
        for k in self._provider_stats:
            self._provider_stats[k] = {"requests": 0, "tokens": 0, "fallbacks": 0}
        for k in self._operation_stats:
            self._operation_stats[k] = 0
        self._cache_saved_requests = 0
        self._cache_saved_tokens = 0
        self._rate_limit_blocks = 0
        self._moderation_blocks = 0


# Singleton instance
cost_governance_service = AICostGovernanceService()

"""Day 20 Fallback Providers: Resilient Primary & Fallback LLM Execution.

Orchestrates multi-tier provider fallbacks (Primary -> Fallback -> Tertiary -> Local Contextual).
Handles rate limits (429), timeouts, model unavailabilities, and network failures.
Logs transitions safely without leaking secrets or credentials.
"""

import json
import logging
from typing import Any, AsyncGenerator

from app.ai.llm_manager import LLMManager, LLMProviderError, RateLimitError, llm_manager
from app.config import settings

logger = logging.getLogger("nexora.fallback")


class FallbackResult:
    """Stores the execution trace and provider choice for an AI request."""

    def __init__(self):
        self.provider_used: str = "unknown"
        self.fallback_triggered: bool = False
        self.fallback_chain_executed: list[dict[str, Any]] = []


class FallbackHandler:
    """Manages graceful multi-provider degradation for real-time streaming."""

    def __init__(self, manager: LLMManager = llm_manager):
        self.manager = manager

    def _get_provider_stream(
        self,
        provider: str,
        messages: list[dict[str, str]],
        query: str,
        retrieved_items: list[dict[str, Any]],
    ) -> AsyncGenerator[str, None]:
        """Dispatch streaming to the chosen provider."""
        prov = provider.lower().strip()
        if prov == "groq":
            return self.manager.stream_groq(messages)
        elif prov == "gemini":
            return self.manager.stream_gemini(messages)
        elif prov == "mistral":
            return self.manager.stream_mistral(messages)
        elif prov == "openai_compatible":
            return self.manager.stream_openai_compatible(messages)
        elif prov in ("local_contextual", "mock", "offline", "local"):
            return self.manager.stream_local_contextual(query, retrieved_items)
        else:
            raise LLMProviderError(provider, 400, f"Unsupported LLM provider '{provider}'")

    async def stream_with_fallback(
        self,
        query: str,
        messages: list[dict[str, str]],
        retrieved_items: list[dict[str, Any]],
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream tokens progressively while attempting primary, fallback, and tertiary providers.
        Emits SSE events:
          - {"event": "metadata", "data": {...}}
          - {"event": "token", "data": {"token": "..."}}
          - {"event": "done", "data": {"complete": True}}
        """
        # Define provider sequence
        chain = [
            settings.LLM_PRIMARY_PROVIDER,
            settings.LLM_FALLBACK_PROVIDER,
            settings.LLM_TERTIARY_PROVIDER,
            "local_contextual",
        ]

        # Clean duplicate providers in chain
        unique_chain: list[str] = []
        for p in chain:
            p_clean = p.lower().strip()
            if p_clean and p_clean not in unique_chain:
                unique_chain.append(p_clean)
        if "local_contextual" not in unique_chain:
            unique_chain.append("local_contextual")

        trace = FallbackResult()
        chosen_provider = None
        token_stream = None

        # Attempt providers in order until one successfully connects
        for idx, provider in enumerate(unique_chain):
            try:
                # Local contextual never fails with network/auth errors
                if provider == "local_contextual":
                    chosen_provider = "local_contextual"
                    token_stream = self._get_provider_stream(provider, messages, query, retrieved_items)
                    break

                # Test stream creation
                candidate_stream = self._get_provider_stream(provider, messages, query, retrieved_items)

                # Peak the first token to verify provider actually accepts the request
                # (catches 401, 429, 404 before committing to the provider)
                first_token = await candidate_stream.__anext__()

                async def _merged_stream(first: str, rest: AsyncGenerator[str, None]):
                    yield first
                    async for item in rest:
                        yield item

                token_stream = _merged_stream(first_token, candidate_stream)
                chosen_provider = provider
                break

            except StopAsyncIteration:
                # Stream completed without tokens
                chosen_provider = provider
                break

            except (RateLimitError, LLMProviderError, Exception) as exc:
                status_code = getattr(exc, "status_code", None)
                msg = getattr(exc, "message", str(exc))
                is_rate_limit = isinstance(exc, RateLimitError) or status_code == 429

                next_provider = unique_chain[idx + 1] if idx + 1 < len(unique_chain) else "none"
                logger.warning(
                    "[Provider Fallback Triggered] Provider '%s' failed (Status: %s, Reason: %s). "
                    "Safely switching to next provider: '%s'.",
                    provider,
                    status_code or "ERR",
                    msg,
                    next_provider,
                )

                trace.fallback_triggered = True
                trace.fallback_chain_executed.append(
                    {
                        "attempted_provider": provider,
                        "status": "rate_limited" if is_rate_limit else "failed",
                        "status_code": status_code,
                        "error_type": exc.__class__.__name__,
                    }
                )

        if token_stream is None or chosen_provider is None:
            chosen_provider = "local_contextual"
            token_stream = self._get_provider_stream("local_contextual", messages, query, retrieved_items)

        trace.provider_used = chosen_provider

        # 1. Emit metadata event first with product citations and provider diagnostics
        is_valid, _ = LLMManager.is_ecommerce_query(query, retrieved_items)
        citations_list = []
        if is_valid:
            citations_list = [
                {
                    "product_id": item["product_id"],
                    "name": item["name"],
                    "price": item["price"],
                    "category": item.get("category", "General"),
                    "image_url": item.get("image_url", ""),
                    "similarity_score": item.get("similarity_score", 0.0),
                }
                for item in retrieved_items
            ]

        metadata_payload = {
            "provider_used": trace.provider_used,
            "fallback_triggered": trace.fallback_triggered,
            "attempts": trace.fallback_chain_executed,
            "citations": citations_list,
        }
        yield {"event": "metadata", "data": metadata_payload}

        # 2. Progressively stream tokens
        try:
            async for token in token_stream:
                yield {"event": "token", "data": {"token": token}}
        except Exception as exc:
            logger.error("Error during active token streaming: %s", exc)
            yield {"event": "error", "data": {"message": "Streaming interrupted."}}

        # 3. Emit done event
        yield {"event": "done", "data": {"complete": True}}


fallback_handler = FallbackHandler()

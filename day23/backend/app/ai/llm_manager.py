"""Day 20 Free LLM Providers Integration: Groq, Gemini, Mistral & OpenAI-Compatible.

Supports progressive token streaming via Server-Sent Events (SSE), API key isolation,
strict error classification (RateLimit 429, Timeout, Auth 401), and a deterministic
local contextual engine for offline operation and zero-dependency testing.
"""

import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Optional
import httpx

from app.config import settings

logger = logging.getLogger("nexora.llm")


class LLMProviderError(Exception):
    """Base exception for LLM provider errors."""
    def __init__(self, provider: str, status_code: Optional[int], message: str):
        super().__init__(f"[{provider}] HTTP {status_code}: {message}")
        self.provider = provider
        self.status_code = status_code
        self.message = message


class RateLimitError(LLMProviderError):
    """Raised when an LLM provider returns HTTP 429."""
    pass


class LLMManager:
    """Manages multi-provider LLM integrations with streaming Server-Sent Events."""

    def __init__(self):
        self.timeout = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)

    async def stream_groq(
        self, messages: list[dict[str, str]], model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from Groq API (free-tier Llama 3.3/3.1)."""
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise LLMProviderError("groq", 401, "GROQ_API_KEY is not configured.")

        selected_model = model or settings.GROQ_MODEL
        url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": selected_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code == 429:
                        raise RateLimitError("groq", 429, "Groq rate limit exceeded.")
                    if response.status_code != 200:
                        err_body = await response.aread()
                        raise LLMProviderError("groq", response.status_code, err_body.decode(errors="replace"))

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            token = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if token:
                                yield token
                        except json.JSONDecodeError:
                            continue
            except httpx.TimeoutException as exc:
                raise LLMProviderError("groq", 408, f"Groq request timed out: {exc}")
            except httpx.ConnectError as exc:
                raise LLMProviderError("groq", 503, f"Failed to connect to Groq: {exc}")

    async def stream_gemini(
        self, messages: list[dict[str, str]], model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream tokens from Google Gemini API via official OpenAI-compatible endpoint
        or native streamGenerateContent.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise LLMProviderError("gemini", 401, "GEMINI_API_KEY is not configured.")

        selected_model = model or settings.GEMINI_MODEL
        url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": selected_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code == 429:
                        raise RateLimitError("gemini", 429, "Google Gemini quota/rate limit exceeded.")
                    if response.status_code != 200:
                        err_body = await response.aread()
                        raise LLMProviderError("gemini", response.status_code, err_body.decode(errors="replace"))

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            token = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if token:
                                yield token
                        except json.JSONDecodeError:
                            continue
            except httpx.TimeoutException as exc:
                raise LLMProviderError("gemini", 408, f"Gemini request timed out: {exc}")
            except httpx.ConnectError as exc:
                raise LLMProviderError("gemini", 503, f"Failed to connect to Gemini: {exc}")

    async def stream_mistral(
        self, messages: list[dict[str, str]], model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from Mistral API."""
        api_key = settings.MISTRAL_API_KEY
        if not api_key:
            raise LLMProviderError("mistral", 401, "MISTRAL_API_KEY is not configured.")

        selected_model = model or settings.MISTRAL_MODEL
        url = f"{settings.MISTRAL_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": selected_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code == 429:
                        raise RateLimitError("mistral", 429, "Mistral rate limit exceeded.")
                    if response.status_code != 200:
                        err_body = await response.aread()
                        raise LLMProviderError("mistral", response.status_code, err_body.decode(errors="replace"))

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            token = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if token:
                                yield token
                        except json.JSONDecodeError:
                            continue
            except httpx.TimeoutException as exc:
                raise LLMProviderError("mistral", 408, f"Mistral request timed out: {exc}")
            except httpx.ConnectError as exc:
                raise LLMProviderError("mistral", 503, f"Failed to connect to Mistral: {exc}")

    async def stream_openai_compatible(
        self, messages: list[dict[str, str]], base_url: Optional[str] = None, model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from any generic OpenAI-compatible endpoint."""
        api_key = settings.OPENAI_API_KEY
        url_base = base_url or settings.OPENAI_BASE_URL
        selected_model = model or settings.OPENAI_MODEL
        url = f"{url_base.rstrip('/')}/chat/completions"

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "model": selected_model,
            "messages": messages,
            "stream": True,
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code == 429:
                        raise RateLimitError("openai_compatible", 429, "Rate limit exceeded.")
                    if response.status_code != 200:
                        err_body = await response.aread()
                        raise LLMProviderError("openai_compatible", response.status_code, err_body.decode(errors="replace"))

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            token = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if token:
                                yield token
                        except json.JSONDecodeError:
                            continue
            except httpx.TimeoutException as exc:
                raise LLMProviderError("openai_compatible", 408, f"OpenAI-compatible request timed out: {exc}")
            except httpx.ConnectError as exc:
                raise LLMProviderError("openai_compatible", 503, f"Failed to connect: {exc}")

    @staticmethod
    def is_ecommerce_query(query: str, retrieved_items: list[dict[str, Any]]) -> tuple[bool, str]:
        """Detect whether the user query is a relevant shopping/catalog request or off-topic."""
        q = (query or "").lower().strip()
        if not q:
            return False, "empty"

        # Greetings
        greetings = ["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "namaste", "how are you"]
        if q in greetings or any(q == g for g in greetings):
            return False, "greeting"

        # Off-topic / general knowledge patterns
        off_topic_patterns = [
            "who is", "who are", "who was", "cm", "pm", "prime minister", "chief minister",
            "president", "minister", "politics", "weather", "temperature", "capital of",
            "tell me a joke", "sing a song", "recipe", "cricket", "football", "who created",
            "what is your name", "who made you", "news", "election", "vote", "modi",
            "biden", "trump", "revanth", "jagan", "chandrababu", "pawan", "kcr", "movie",
            "hero", "actor", "actress", "song", "dance", "country", "state", "city"
        ]

        electronics_terms = [
            "laptop", "phone", "headphone", "earphone", "monitor", "keyboard", "macbook",
            "iphone", "sony", "dell", "bose", "samsung", "mouse", "price", "stock",
            "buy", "order", "discount", "cart", "catalog", "camera", "battery", "display",
            "screen", "charger", "audio", "sound", "gadget", "electronics"
        ]

        has_electronics = any(term in q for term in electronics_terms)
        is_off_topic = any(p in q for p in off_topic_patterns)

        if is_off_topic and not has_electronics:
            return False, "off_topic"

        # Check similarity relevance
        if retrieved_items:
            top_sim = float(retrieved_items[0].get("similarity_score", 0.0))
            if top_sim < 0.60 and not has_electronics:
                return False, "low_relevance"
        else:
            return False, "no_items"

        return True, "valid"

    async def stream_local_contextual(
        self,
        query: str,
        retrieved_items: list[dict[str, Any]],
    ) -> AsyncGenerator[str, None]:
        """
        Deterministic, local fallback streamer.
        Grounded strictly on retrieved catalog items; answers accurately with exact citations
        or politely declines off-topic / general knowledge questions. Yields tokens with realistic typing intervals.
        """
        is_valid, reason = self.is_ecommerce_query(query, retrieved_items)

        if not is_valid:
            if reason == "greeting":
                response_text = (
                    "Hello! 👋 I am Nexora AI, your intelligent shopping copilot.\n\n"
                    "I can help you search products, compare specs (like MacBook M3 vs Dell 4K), and verify live inventory. "
                    "What electronics can I help you find today?"
                )
            else:
                response_text = (
                    f"I am Nexora's AI Shopping Assistant. I specialize exclusively in our store catalog, "
                    f"electronics specifications, live inventory, and customer orders.\n\n"
                    f"I cannot answer general knowledge, political, or off-topic questions like \"{query}\".\n\n"
                    f"💡 **Try asking me about:**\n"
                    f"• *\"Compare MacBook Air vs Dell 4K Monitor\"*\n"
                    f"• *\"Show me noise cancelling headphones\"*\n"
                    f"• *\"Which smartphones are in stock?\"*"
                )
        elif not retrieved_items:
            response_text = (
                "I could not find matching products in our catalog for that request. "
                "Please browse our store catalog or try searching for laptops, headphones, monitors, or smartphones!"
            )
        else:
            # Construct grounded, factual response
            top = retrieved_items[0]
            items_text = "\n".join(
                [
                    f"• [Product #{it['product_id']}: {it['name']} - ${it['price']:.2f}]\n"
                    f"  Category: {it.get('category', 'General')} | In Stock: {it.get('stock', 0)} units\n"
                    f"  Details: {it.get('snippet', '')}"
                    for it in retrieved_items[:3]
                ]
            )

            response_text = (
                f"Based on our Nexora catalog, here are the most relevant products matching your request:\n\n"
                f"{items_text}\n\n"
                f"Top Recommendation: [Product #{top['product_id']}: {top['name']} - ${top['price']:.2f}]. "
                f"It is currently in stock with {top.get('stock', 0)} units ready for immediate checkout."
            )

        # Break into natural token chunks and stream
        words = response_text.split(" ")
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield token
            await asyncio.sleep(0.015)


# Global singleton instance
llm_manager = LLMManager()

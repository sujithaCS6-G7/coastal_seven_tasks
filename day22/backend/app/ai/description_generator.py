"""Day 21 AI-Powered Product Description Generator.

Integrates with the multi-provider LLM fallback architecture, AI Content Moderation,
and Redis AI Response Caching to generate factual, engaging, and grounded product
descriptions without inventing specifications, discounts, or stock status.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator
from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.ai_cache import ai_cache_service
from app.ai.fallback_handler import fallback_handler
from app.ai.llm_manager import LLMProviderError, RateLimitError, llm_manager
from app.ai.moderation import moderation_service
from app.config import settings

logger = logging.getLogger(__name__)

COMMON_PERSONAL_NAMES = {
    "revathi", "ramesh", "suresh", "priya", "rahul", "john", "alex", "david", "smith",
    "kumar", "anita", "pooja", "rohit", "sneha", "vijay", "ajay", "sunil", "deepak",
    "kavitha", "swathi", "anjali", "manoj", "sanjay", "rajesh", "vikram", "amit", "neha",
    "divya", "meena", "geetha", "lakshmi", "bhanu", "sai", "ravi", "kiran", "prasad",
    "satish", "harish", "venkat", "naresh", "srinu", "raju", "battu", "sharma", "singh",
    "reddy", "varma", "patel", "rao", "gupta", "mary", "emily", "michael", "james"
}

VALID_SINGLE_WORD_PRODUCTS = {
    "headphones", "smartwatch", "smartphone", "keyboard", "laptop",
    "backpack", "microphone", "television", "monitor", "earbuds",
    "earphones", "speaker", "mouse", "camera", "tablet", "projector",
    "smartband", "powerbank", "processor", "smartplug", "webcam",
    "headset", "soundbar", "adapter", "charger", "cable"
}


class ProductDescriptionRequest(BaseModel):
    """Validated input schema for generating an AI-powered product description."""

    product_id: Optional[int] = Field(default=None, ge=1, description="Optional catalog product ID")
    name: str = Field(..., min_length=2, max_length=150, description="Product name")
    category: str = Field(..., min_length=2, max_length=60, description="Product category")
    price: Optional[float] = Field(default=None, gt=0, description="Optional verified catalog price")
    features: list[str] = Field(
        default_factory=list,
        max_length=15,
        description="Verified product specifications and features",
    )
    tone: str = Field(
        default="professional",
        description="Desired writing tone: professional, technical, or concise",
    )
    bypass_cache: bool = Field(
        default=False,
        description="Set true to force fresh generation and bypass Redis cache",
    )

    @field_validator("name")
    @classmethod
    def validate_product_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank or whitespace only.")
        if len(cleaned) < 2:
            raise ValueError("Product name must be at least 2 characters long.")
        # Reject if pure numbers
        if re.fullmatch(r"^\d+$", cleaned):
            raise ValueError(
                f"Invalid product title: '{cleaned}' consists only of numbers. "
                "Please provide a descriptive e-commerce product name (e.g. 'Sony WH-1000XM5 Headphones')."
            )
        # Reject repetitive single characters (e.g. 'aaaa', 'zzzz')
        alnum_chars = [c.lower() for c in cleaned if c.isalnum()]
        if len(alnum_chars) >= 3 and len(set(alnum_chars)) < 2:
            raise ValueError(
                f"Invalid product title: '{cleaned}' is repetitive gibberish. "
                "Please provide a meaningful product title."
            )
        words = [w.lower() for w in re.findall(r"\b\w+\b", cleaned)]
        if len(words) == 1:
            if words[0] not in VALID_SINGLE_WORD_PRODUCTS:
                raise ValueError(
                    f"Invalid product title: '{cleaned}' is not a descriptive product name. "
                    f"In an e-commerce catalog, please provide a descriptive title with at least 2 words "
                    f"(e.g. '{cleaned.title()} Cotton Saree' or '{cleaned.title()} Wireless Earbuds')."
                )
        elif words and all(w in COMMON_PERSONAL_NAMES for w in words):
            raise ValueError(
                f"Invalid product title: '{cleaned}' consists solely of personal human names. "
                f"In a real store catalog, please specify a product item (e.g. '{cleaned.title()} Smart Watch' or 'Cotton T-Shirt')."
            )
        return cleaned

    @field_validator("category")
    @classmethod
    def validate_non_blank(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank or whitespace only.")
        return cleaned

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        allowed_tones = {"professional", "technical", "concise", "enthusiastic"}
        normalized = v.strip().lower()
        if normalized not in allowed_tones:
            raise ValueError(f"Tone must be one of {sorted(allowed_tones)}.")
        return normalized

    @field_validator("features")
    @classmethod
    def clean_features(cls, v: list[str]) -> list[str]:
        cleaned = [item.strip() for item in v if isinstance(item, str) and item.strip()]
        return cleaned


class ProductDescriptionResponse(BaseModel):
    """Structured output returned by the AI Product Description Generator."""

    product_id: Optional[int] = None
    product_name: str
    category: str
    tone: str
    description: str
    highlights: list[str]
    seo_summary: str
    provider_used: str
    fallback_triggered: bool
    fallback_chain_executed: list[str] = Field(default_factory=list)
    cached: bool
    cache_key: str
    moderation_passed: bool


DESCRIPTION_SYSTEM_PROMPT = (
    "You are an expert e-commerce copywriter for Nexora Electronics. "
    "Write a clear, factual, and engaging product description strictly using ONLY "
    "the provided product name, category, verified price (if given), and verified features. "
    "STRICT RULES:\n"
    "1. NEVER invent specifications, battery life, warranties, discounts, or stock counts not present in the input.\n"
    "2. Keep the description concise (2 to 3 sentences) and accurate.\n"
    "3. Match the requested writing tone."
)


class ProductDescriptionService:
    """Service that moderates, caches, and generates grounded product descriptions."""

    async def generate_description(
        self, req: ProductDescriptionRequest
    ) -> ProductDescriptionResponse:
        """
        Validate, moderate, check Redis cache, and generate a factual product description
        using the configured LLM provider hierarchy with automatic fallback.
        """
        # 1. Content Moderation Guardrail
        mod_result = moderation_service.check_multiple_fields(
            {
                "name": req.name,
                "category": req.category,
                "features": req.features if req.features else [req.name],
            }
        )
        if not mod_result.allowed:
            raise ValueError(mod_result.reason or "Content rejected by AI moderation guardrail.")

        # 2. Construct deterministic Redis cache key (isolated per product attributes & tone)
        cache_payload = {
            "product_id": req.product_id,
            "name": req.name,
            "category": req.category,
            "price": round(req.price, 2) if req.price is not None else None,
            "features": req.features,
            "tone": req.tone,
        }
        model_ver = f"{settings.LLM_PRIMARY_PROVIDER}-{settings.GEMINI_MODEL}"
        cache_key = ai_cache_service.build_cache_key(
            operation="product_description",
            payload=cache_payload,
            model_version=model_ver,
            user_scope="public",
        )

        # 3. Check Redis Cache
        cached_data = ai_cache_service.get(cache_key, bypass=req.bypass_cache)
        if cached_data is not None:
            cached_copy = cached_data.copy()
            cached_copy["cached"] = True
            cached_copy["cache_key"] = cache_key
            return ProductDescriptionResponse(**cached_copy)

        # 4. Generate via LLM Provider Hierarchy with Fallback
        features_text = ", ".join(req.features) if req.features else "Standard verified model configuration"
        price_text = f"₹{req.price:.2f}" if req.price is not None else "Not specified"

        user_prompt = (
            f"Product Name: {req.name}\n"
            f"Category: {req.category}\n"
            f"Verified Price: {price_text}\n"
            f"Verified Features: {features_text}\n"
            f"Requested Tone: {req.tone}\n\n"
            "Write a factual 2-3 sentence product description based strictly on the details above."
        )

        messages = [
            SystemMessage(content=DESCRIPTION_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        provider_used, fallback_triggered, chain_log, generated_text = (
            await self._invoke_providers_with_fallback(req, messages)
        )

        highlights = self._build_factual_highlights(req)
        seo_summary = self._build_seo_summary(req)

        response_dict: dict[str, Any] = {
            "product_id": req.product_id,
            "product_name": req.name,
            "category": req.category,
            "tone": req.tone,
            "description": generated_text.strip(),
            "highlights": highlights,
            "seo_summary": seo_summary,
            "provider_used": provider_used,
            "fallback_triggered": fallback_triggered,
            "fallback_chain_executed": chain_log,
            "cached": False,
            "cache_key": cache_key,
            "moderation_passed": True,
        }

        # 5. Cache only valid, non-empty responses in Redis
        ai_cache_service.set(cache_key, response_dict)

        return ProductDescriptionResponse(**response_dict)

    async def _invoke_providers_with_fallback(
        self, req: ProductDescriptionRequest, messages: list[Any]
    ) -> tuple[str, bool, list[str], str]:
        """Try primary -> fallback -> tertiary -> deterministic grounded copywriter."""
        chain: list[str] = []
        for candidate in [
            settings.LLM_PRIMARY_PROVIDER,
            settings.LLM_FALLBACK_PROVIDER,
            settings.LLM_TERTIARY_PROVIDER,
        ]:
            p = (candidate or "").strip().lower()
            if p and p not in chain and p != "local_contextual":
                chain.append(p)
        chain.append("local_contextual")

        chain_log: list[str] = []
        fallback_triggered = False

        for idx, provider_name in enumerate(chain):
            if idx > 0:
                fallback_triggered = True

            if provider_name == "local_contextual":
                text = self._generate_local_factual_description(req)
                chain_log.append("local_contextual:success")
                return "local_contextual", fallback_triggered, chain_log, text

            try:
                stream = fallback_handler._get_provider_stream(
                    provider_name, messages, req.name, []
                )
                chunks: list[str] = []
                async for token in stream:
                    chunks.append(token)
                full_text = "".join(chunks).strip()
                if not full_text:
                    raise LLMProviderError(provider_name, "Empty description returned by provider", 502)
                chain_log.append(f"{provider_name}:success")
                return provider_name, fallback_triggered, chain_log, full_text

            except (RateLimitError, LLMProviderError) as exc:
                chain_log.append(f"{provider_name}:failed({exc.status_code})")
                logger.warning(
                    "[DescriptionGenerator] Provider '%s' failed (HTTP %s), trying next fallback.",
                    provider_name,
                    exc.status_code,
                )
            except Exception as exc:
                chain_log.append(f"{provider_name}:error({exc.__class__.__name__})")
                logger.warning(
                    "[DescriptionGenerator] Unexpected error from '%s' (%s), trying next fallback.",
                    provider_name,
                    exc.__class__.__name__,
                )

        fallback_text = self._generate_local_factual_description(req)
        return "local_contextual", True, chain_log, fallback_text

    @staticmethod
    def _generate_local_factual_description(req: ProductDescriptionRequest) -> str:
        """Deterministic, strictly factual description synthesizer when external LLM APIs are unavailable."""
        tone_prefix = {
            "professional": f"The {req.name} is a {req.category} solution engineered for dependable everyday performance.",
            "technical": f"Built for the {req.category} segment, the {req.name} integrates verified hardware specifications.",
            "concise": f"{req.name} ({req.category}) delivers verified functionality in a streamlined design.",
            "enthusiastic": f"Experience the {req.name}, a standout addition to our {req.category} lineup!",
        }.get(
            req.tone,
            f"The {req.name} is a verified product in our {req.category} catalog.",
        )

        if req.features:
            feat_str = ", ".join(req.features[:6])
            spec_sentence = f"Key verified specifications include {feat_str}."
        else:
            spec_sentence = f"Designed to meet {req.category} requirements with verified catalog quality."

        price_sentence = (
            f"Listed at a verified catalog price of ₹{req.price:.2f}."
            if req.price is not None
            else ""
        )
        return " ".join(part for part in (tone_prefix, spec_sentence, price_sentence) if part)

    @staticmethod
    def _build_factual_highlights(req: ProductDescriptionRequest) -> list[str]:
        highlights: list[str] = [f"Category: {req.category}"]
        if req.price is not None:
            highlights.append(f"Verified Catalog Price: ₹{req.price:.2f}")
        for feat in req.features[:5]:
            highlights.append(feat)
        return highlights

    @staticmethod
    def _build_seo_summary(req: ProductDescriptionRequest) -> str:
        feat_snippet = f" featuring {', '.join(req.features[:3])}" if req.features else ""
        price_snippet = f" (₹{req.price:.2f})" if req.price is not None else ""
        return f"{req.name} in {req.category}{feat_snippet}{price_snippet}."


description_service = ProductDescriptionService()

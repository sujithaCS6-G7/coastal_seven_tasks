"""Day 20–21 AI Package: RAG Pipeline, Multi-Provider LLM Manager, Fallback Handler, Content Moderation, Redis AI Cache, Product Description Generator & Tool-Calling Agent."""

from app.ai.ai_cache import RedisAICacheService, ai_cache_service
from app.ai.agent_tools import (
    APPROVED_TOOLS,
    TOOL_DEFINITIONS,
    ToolCallingAgentService,
    agent_service,
)
from app.ai.description_generator import (
    ProductDescriptionRequest,
    ProductDescriptionResponse,
    ProductDescriptionService,
    description_service,
)
from app.ai.fallback_handler import FallbackHandler, FallbackResult, fallback_handler
from app.ai.llm_manager import LLMManager, LLMProviderError, RateLimitError, llm_manager
from app.ai.moderation import ContentModerationService, ModerationResult, moderation_service
from app.ai.prompts import (
    SYSTEM_RAG_PROMPT,
    build_rag_chain_messages,
    format_product_context,
    get_langchain_rag_prompt_template,
)
from app.ai.rag_pipeline import FALLBACK_CATALOG_DATA, RagPipeline, rag_pipeline

__all__ = [
    "APPROVED_TOOLS",
    "ContentModerationService",
    "FALLBACK_CATALOG_DATA",
    "FallbackHandler",
    "FallbackResult",
    "LLMManager",
    "LLMProviderError",
    "ModerationResult",
    "ProductDescriptionRequest",
    "ProductDescriptionResponse",
    "ProductDescriptionService",
    "RagPipeline",
    "RateLimitError",
    "RedisAICacheService",
    "SYSTEM_RAG_PROMPT",
    "TOOL_DEFINITIONS",
    "ToolCallingAgentService",
    "agent_service",
    "ai_cache_service",
    "build_rag_chain_messages",
    "description_service",
    "fallback_handler",
    "format_product_context",
    "get_langchain_rag_prompt_template",
    "llm_manager",
    "moderation_service",
    "rag_pipeline",
]

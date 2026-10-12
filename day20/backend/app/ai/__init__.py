"""Day 20 AI Package: LangChain, ChromaDB RAG, Multi-Provider LLMs & SSE Streaming."""

from app.ai.prompts import (
    SYSTEM_RAG_PROMPT,
    format_product_context,
    build_rag_chain_messages,
)
from app.ai.rag_pipeline import rag_pipeline
from app.ai.llm_manager import llm_manager
from app.ai.fallback_handler import fallback_handler

__all__ = [
    "SYSTEM_RAG_PROMPT",
    "format_product_context",
    "build_rag_chain_messages",
    "rag_pipeline",
    "llm_manager",
    "fallback_handler",
]

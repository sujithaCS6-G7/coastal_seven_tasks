"""Day 20 AI Streaming Chat, RAG Retrieval & Multi-Provider Router.

Provides Server-Sent Events (SSE) streaming endpoints, catalog re-indexing,
and diagnostic health for LLM providers and ChromaDB vector search.
"""

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.fallback_handler import fallback_handler
from app.ai.prompts import build_rag_chain_messages, format_product_context
from app.ai.rag_pipeline import rag_pipeline
from app.config import settings
from app.database import get_db
from app.utils.rate_limit import limiter

logger = logging.getLogger("nexora.ai_router")

router = APIRouter(prefix="/ai", tags=["Day 20 AI Streaming RAG & LangChain"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message author role: 'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class ChatStreamRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question or query")
    history: list[ChatMessage] = Field(default_factory=list, description="Recent conversation turns")
    top_k: Optional[int] = Field(default=4, ge=1, le=10, description="Number of catalog items to retrieve")


@router.post(
    "/chat/stream",
    summary="Stream AI Chat Answers via Server-Sent Events (SSE) with Real-Time Citations",
    description=(
        "Streams token-by-token AI answers with SSE format. "
        "Retrieves real product records from ChromaDB, formats grounded context, "
        "and coordinates primary and fallback LLM providers (Groq/Gemini/Mistral/Local). "
        "Yields 'metadata' (citations), 'token' (content chunk), and 'done' events."
    ),
)
@limiter.limit(settings.RATE_LIMIT_AI)
async def stream_ai_chat(
    req: ChatStreamRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Handle streaming AI chat requests using Server-Sent Events (SSE).
    """
    query = req.message.strip()
    if not query:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    # 1. Retrieve semantically relevant product documents from ChromaDB
    try:
        retrieved_items = rag_pipeline.search(query=query, top_k=req.top_k)
    except Exception as exc:
        logger.warning("RAG retrieval failed: %s. Using empty context.", exc)
        retrieved_items = []

    # 2. Format catalog context and construct LangChain prompt message chain
    context_str = format_product_context(retrieved_items)
    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
    messages = build_rag_chain_messages(question=query, context=context_str, history=history_dicts)

    # 3. Stream Server-Sent Events (SSE) via resilient fallback handler
    async def sse_event_generator():
        try:
            async for event_item in fallback_handler.stream_with_fallback(
                query=query,
                messages=messages,
                retrieved_items=retrieved_items,
            ):
                event_type = event_item.get("event", "message")
                payload = json.dumps(event_item.get("data", {}))
                yield f"event: {event_type}\ndata: {payload}\n\n"
        except Exception as exc:
            logger.error("SSE stream error: %s", exc)
            err_data = json.dumps({"error": "An error occurred while streaming the AI response."})
            yield f"event: error\ndata: {err_data}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    )


@router.post(
    "/rag/reindex",
    summary="Trigger Full Re-Indexing of Products from PostgreSQL into ChromaDB",
    description="Loads all active products from PostgreSQL, splits long descriptions, and updates ChromaDB vector collection.",
)
def reindex_products_catalog(db: Session = Depends(get_db)):
    """Reindex all active database products into ChromaDB."""
    try:
        result = rag_pipeline.reindex_catalog(db=db)
        return {
            "status": "success",
            "message": "Product catalog successfully indexed into ChromaDB vector store.",
            "details": result,
        }
    except Exception as exc:
        logger.error("Failed to reindex catalog: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to re-index products: {str(exc)}",
        )


@router.get(
    "/search",
    summary="Semantic Vector Search Preview with Product Citations",
    description="Directly query the ChromaDB vector collection to preview retrieved products and relevance scores.",
)
def search_catalog_semantic(
    q: str = Query(..., min_length=1, description="Semantic search query"),
    limit: int = Query(4, ge=1, le=20, description="Max results to return"),
):
    """Perform semantic search against ChromaDB."""
    citations = rag_pipeline.search(query=q, top_k=limit)
    return {
        "query": q,
        "results_count": len(citations),
        "citations": citations,
    }


@router.get(
    "/status",
    summary="AI System, LLM Providers & ChromaDB Diagnostic Telemetry",
    description="Returns active providers, fallback configuration, and vector store metrics.",
)
def get_ai_status():
    """Inspect AI system health and configuration safely without exposing secrets."""
    return {
        "status": "online",
        "providers": {
            "primary": settings.LLM_PRIMARY_PROVIDER,
            "fallback": settings.LLM_FALLBACK_PROVIDER,
            "tertiary": settings.LLM_TERTIARY_PROVIDER,
            "available_backends": ["groq", "gemini", "mistral", "openai_compatible", "local_contextual"],
            "configured_keys": {
                "groq": bool(settings.GROQ_API_KEY.strip()),
                "gemini": bool(settings.GEMINI_API_KEY.strip()),
                "mistral": bool(settings.MISTRAL_API_KEY.strip()),
                "openai": bool(settings.OPENAI_API_KEY.strip()),
            },
            "models": {
                "groq": settings.GROQ_MODEL,
                "gemini": settings.GEMINI_MODEL,
                "mistral": settings.MISTRAL_MODEL,
                "openai": settings.OPENAI_MODEL,
            },
        },
        "rag": rag_pipeline.get_stats(),
    }

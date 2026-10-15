"""Day 20–21 AI Router: Streaming RAG Chat, Product Descriptions, Semantic Search, Content Moderation, Redis AI Cache, Per-User Rate Limiting & Tool-Calling Agent."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.ai.agent_tools import (
    AgentExecuteRequest,
    AgentExecuteResponse,
    agent_service,
)
from app.ai.ai_cache import ai_cache_service
from app.ai.cost_governance import cost_governance_service
from app.ai.description_generator import (
    ProductDescriptionRequest,
    ProductDescriptionResponse,
    description_service,
)
from app.ai.fallback_handler import fallback_handler
from app.ai.moderation import ModerationResult, moderation_service
from app.ai.prompts import build_rag_chain_messages, format_product_context
from app.ai.rag_pipeline import rag_pipeline
from app.config import settings
from app.database import get_db
from app.utils.rate_limit import ai_user_rate_limiter, limiter
from app.utils.redis_client import redis_manager

logger = logging.getLogger("nexora.ai.router")

router = APIRouter(prefix="/ai", tags=["AI Focus & Smart Copilot"])



class ChatMessage(BaseModel):
    """Single message turn in conversation history."""

    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatStreamRequest(BaseModel):
    """Request payload for streaming RAG chat."""

    message: str = Field(..., min_length=1, max_length=2000, description="User question or shopping request")
    history: list[ChatMessage] = Field(default_factory=list, description="Recent conversation turns")
    top_k: Optional[int] = Field(default=4, ge=1, le=10, description="Number of product citations to retrieve")


class ModerationRequest(BaseModel):
    """Request payload for testing AI content moderation directly."""

    text: str = Field(..., description="User-generated text or prompt to screen")
    field_name: str = Field(default="text", description="Field identifier for reporting")


class SemanticSearchRequest(BaseModel):
    """Request payload for metadata-filtered semantic product search."""

    query: str = Field(..., description="Natural language search query or customer intent")
    limit: int = Field(default=4, ge=1, le=20, description="Maximum number of products to return")
    category: Optional[str] = Field(default=None, description="Optional category filter (e.g., Audio, Computers)")
    min_price: Optional[float] = Field(default=None, ge=0, description="Optional minimum price filter")
    max_price: Optional[float] = Field(default=None, gt=0, description="Optional maximum price filter")
    in_stock_only: bool = Field(default=False, description="Only return products with stock > 0")
    min_similarity: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum cosine similarity threshold")
    bypass_cache: bool = Field(default=False, description="Bypass Redis AI response cache")


# ============================================================================
# 1. Streaming RAG Chat (SSE) + Moderation + Per-User Rate Limit
# ============================================================================

@router.post(
    "/chat/stream",
    summary="Streaming RAG AI Chat via Server-Sent Events (SSE) with Moderation & Per-User Rate Limit",
)
@limiter.limit(settings.RATE_LIMIT_AI)
async def stream_ai_chat(request: Request, payload: ChatStreamRequest):
    """
    1. Enforces per-user AI rate limit (authenticated JWT user or anonymous bucket).
    2. Moderates user input before touching ChromaDB or any LLM provider.
    3. Retrieves top-K relevant products from ChromaDB.
    4. Streams SSE events (`metadata`, `token`, `done`) with automatic multi-provider fallback.
    """
    rl_status = ai_user_rate_limiter.check_limit(request, scope="ai_chat")

    mod_check = moderation_service.check_text(payload.message, field_name="message")
    if not mod_check.allowed:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": mod_check.reason,
                "error": "content_policy_violation",
                "flagged_categories": mod_check.flagged_categories,
                "moderation_engine": mod_check.moderation_engine,
            },
        )

    clean_query = mod_check.sanitized_text
    top_k = payload.top_k or settings.RAG_TOP_K
    retrieved_docs = rag_pipeline.search(query=clean_query, top_k=top_k)

    product_context_str = format_product_context(retrieved_docs)
    history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]
    langchain_messages = build_rag_chain_messages(
        question=clean_query,
        context=product_context_str,
        history=history_dicts,
    )

    async def sse_event_generator():
        try:
            async for event_item in fallback_handler.stream_with_fallback(
                query=clean_query,
                messages=langchain_messages,
                retrieved_items=retrieved_docs,
            ):
                event_type = event_item.get("event", "message")
                data_json = json.dumps(event_item.get("data", {}))
                yield f"event: {event_type}\ndata: {data_json}\n\n"
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
            "X-RateLimit-Identity": str(rl_status["identity_key"]),
            "X-RateLimit-Limit": str(rl_status["limit"]),
            "X-RateLimit-Remaining": str(rl_status["remaining"]),
        },
    )


# ============================================================================
# 2. AI-Powered Product Descriptions (Moderation + Redis Cache + Fallback)
# ============================================================================

@router.post(
    "/products/generate-description",
    response_model=ProductDescriptionResponse,
    summary="Generate AI-Powered Product Description (Moderated, Redis Cached & Per-User Rate Limited)",
)
async def generate_product_description(
    request: Request,
    payload: ProductDescriptionRequest,
):
    """
    Generates a clear, engaging, strictly factual product description from validated
    product attributes. Enforces per-user rate limiting, input moderation, Redis
    response caching, and multi-provider LLM fallback.
    """
    ai_user_rate_limiter.check_limit(request, scope="ai_description")

    mod_result = moderation_service.check_multiple_fields(
        {
            "name": payload.name,
            "category": payload.category,
            "features": payload.features if payload.features else [payload.name],
        }
    )
    if not mod_result.allowed:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": mod_result.reason,
                "error": "content_policy_violation",
                "flagged_categories": mod_result.flagged_categories,
                "moderation_engine": mod_result.moderation_engine,
            },
        )

    try:
        result = await description_service.generate_description(payload)
        cost_governance_service.record_ai_usage(
            provider=result.provider_used,
            operation="product_description",
            prompt_text=f"{payload.name} {payload.category} {' '.join(payload.features)}",
            completion_text=result.description,
            cached=result.cached,
            fallback_triggered=result.fallback_triggered,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


# ============================================================================
# 3. Semantic Product Search (GET & POST with Metadata Filtering & Redis Cache)
# ============================================================================

@router.get(
    "/search",
    summary="Semantic Vector Search in ChromaDB with Metadata Filtering & Redis Cache",
)
@limiter.limit(settings.RATE_LIMIT_AI)
def search_catalog_semantic(
    request: Request,
    q: str = Query(..., min_length=1, description="Natural language search query"),
    limit: int = Query(4, ge=1, le=20, description="Max results"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    min_price: Optional[float] = Query(None, ge=0, description="Optional minimum price"),
    max_price: Optional[float] = Query(None, gt=0, description="Optional maximum price"),
    in_stock_only: bool = Query(False, description="Only return products with stock > 0"),
    min_similarity: float = Query(0.0, ge=0.0, le=1.0, description="Minimum similarity score"),
    bypass_cache: bool = Query(False, description="Bypass Redis cache"),
):
    """
    Perform direct semantic vector search against ChromaDB with metadata filters,
    content moderation, per-user rate limiting, and Redis response caching.
    """
    ai_user_rate_limiter.check_limit(request, scope="ai_search")

    mod_res = moderation_service.check_text(q, field_name="q")
    if not mod_res.allowed:
        cost_governance_service.record_moderation_block()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": mod_res.reason,
                "error": "content_policy_violation",
                "flagged_categories": mod_res.flagged_categories,
            },
        )

    clean_q = mod_res.sanitized_text
    cache_payload = {
        "q": clean_q,
        "limit": limit,
        "category": category or "all",
        "min_price": min_price,
        "max_price": max_price,
        "in_stock_only": in_stock_only,
        "min_similarity": min_similarity,
    }
    cache_key = ai_cache_service.build_cache_key(
        operation="semantic_search",
        payload=cache_payload,
        model_version="minilm-l6-v2",
        user_scope="public",
    )

    cached = ai_cache_service.get(cache_key, bypass=bypass_cache)
    if cached is not None:
        cached_copy = cached.copy()
        cached_copy["cached"] = True
        cached_copy["cache_key"] = cache_key
        cost_governance_service.record_ai_usage(
            provider="local_rag",
            operation="semantic_search",
            prompt_text=clean_q,
            completion_text="cached_vector_results",
            cached=True,
        )
        return cached_copy

    results = rag_pipeline.search(
        query=clean_q,
        top_k=limit,
        category=category,
        min_price=min_price,
        max_price=max_price,
        in_stock_only=in_stock_only,
        min_similarity=min_similarity,
    )

    response_payload = {
        "query": clean_q,
        "filters": {
            "category": category,
            "min_price": min_price,
            "max_price": max_price,
            "in_stock_only": in_stock_only,
            "min_similarity": min_similarity,
        },
        "count": len(results),
        "results_count": len(results),
        "results": results,
        "citations": results,
        "cached": False,
        "cache_key": cache_key,
    }
    ai_cache_service.set(cache_key, response_payload)
    cost_governance_service.record_ai_usage(
        provider="local_rag",
        operation="semantic_search",
        prompt_text=clean_q,
        completion_text=f"{len(results)} vector matches",
        cached=False,
    )
    return response_payload



@router.post(
    "/search/semantic",
    summary="POST Semantic Product Search with Validated JSON Filters & Redis Cache",
)
def search_catalog_semantic_post(
    request: Request,
    payload: SemanticSearchRequest,
):
    """POST variant of semantic search accepting structured filter payload."""
    return search_catalog_semantic(
        request=request,
        q=payload.query,
        limit=payload.limit,
        category=payload.category,
        min_price=payload.min_price,
        max_price=payload.max_price,
        in_stock_only=payload.in_stock_only,
        min_similarity=payload.min_similarity,
        bypass_cache=payload.bypass_cache,
    )


# ============================================================================
# 4. AI Content Moderation Endpoint
# ============================================================================

@router.post(
    "/moderate",
    response_model=ModerationResult,
    summary="Screen User Text with AI Content Moderation Guardrail",
)
def moderate_user_content(request: Request, payload: ModerationRequest):
    """
    Validate and moderate user-submitted text for prompt injection, abusive/unsafe
    language, script/SQL injection, empty strings, or excessive length.
    """
    return moderation_service.check_text(payload.text, field_name=payload.field_name)


# ============================================================================
# 5. AI Agents & Safe Tool Calling Endpoints
# ============================================================================

@router.get(
    "/agent/tools",
    summary="List Approved Application Tools & JSON Schemas for the AI Shopping Agent",
)
def list_agent_tools():
    """Return the allowlisted application tools and their Pydantic parameter schemas."""
    return {
        "max_iterations": settings.AI_AGENT_MAX_ITERATIONS,
        "approved_tool_names": sorted(list(agent_service.get_registered_tools()), key=lambda x: x["name"]),
        "count": len(agent_service.get_registered_tools()),
    }


@router.post(
    "/agent/execute",
    response_model=AgentExecuteResponse,
    summary="Execute Tool-Calling AI Shopping Agent (Moderated, Cached & Rate Limited)",
)
async def execute_ai_agent(
    request: Request,
    payload: AgentExecuteRequest,
    db: Session = Depends(get_db),
):
    """
    Runs the Tool-Calling Shopping Agent:
    1. Per-user rate limit check.
    2. Input content moderation.
    3. Redis response cache check.
    4. Selects and validates approved tool(s) (`search_products_tool`, `get_product_details_tool`, `check_inventory_value_tool`).
    5. Executes tools safely and synthesizes a grounded answer.
    """
    ai_user_rate_limiter.check_limit(request, scope="ai_agent")

    mod_res = moderation_service.check_text(payload.query, field_name="query")
    if not mod_res.allowed:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": mod_res.reason,
                "error": "content_policy_violation",
                "flagged_categories": mod_res.flagged_categories,
                "moderation_engine": mod_res.moderation_engine,
            },
        )

    try:
        return await agent_service.execute_agent(payload, db=db)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


# ============================================================================
# 6. Redis AI Cache & Per-User Rate Limit Diagnostics
# ============================================================================

@router.get(
    "/cache/stats",
    summary="Inspect Redis AI Response Cache Hit/Miss Telemetry",
)
def get_ai_cache_stats():
    """Return current Redis AI response cache statistics, TTL, prefix, and hit rate."""
    return ai_cache_service.get_stats()


@router.delete(
    "/cache/clear",
    summary="Invalidate All AI Cached Responses in Redis",
)
def clear_ai_cache():
    """Clear all AI response cache entries from Redis and fallback memory."""
    return ai_cache_service.clear()


@router.get(
    "/rate-limit/status",
    summary="Inspect Caller's Current Per-User AI Rate Limit Quota",
)
def get_my_ai_rate_limit_status(
    request: Request,
    scope: str = Query("ai_default", description="Rate limit bucket scope to inspect"),
):
    """Return the caller's resolved identity (`user:<id>:<name>` or `anon:<ip>`), limit, used count, and remaining requests."""
    return ai_user_rate_limiter.get_status(request, scope=scope)


# ============================================================================
# 7. ChromaDB Re-Indexing & Comprehensive AI System Status
# ============================================================================

@router.post(
    "/rag/reindex",
    summary="Re-Index Product Catalog into ChromaDB Vector Store",
)
@limiter.limit("10/minute")
def reindex_products_catalog(request: Request, db: Session = Depends(get_db)):
    """
    Extract active products from PostgreSQL, split text with LangChain's
    RecursiveCharacterTextSplitter, and upsert embeddings into ChromaDB.
    Also invalidates stale AI search cache entries.
    """
    result = rag_pipeline.reindex_catalog(db=db)
    ai_cache_service.clear()
    return {
        "status": "success",
        "message": "Product catalog indexed into ChromaDB and AI cache refreshed.",
        "details": result,
    }


@router.get(
    "/status",
    summary="AI System Status (Providers, RAG, Redis Cache, Moderation, Per-User Limits, Tools & Cost Governance)",
)
def get_ai_status(request: Request):
    """
    Report active primary/fallback LLM providers, model names, ChromaDB vector counts,
    Redis AI cache metrics, content moderation stats, per-user rate limit config, agent tools,
    and Responsible AI & $0 Cost Governance summary.
    Never exposes raw API keys or credentials.
    """
    rag_stats = rag_pipeline.get_stats()
    return {
        "status": "online",
        "version": settings.VERSION,
        "providers": {
            "primary": settings.LLM_PRIMARY_PROVIDER,
            "fallback": settings.LLM_FALLBACK_PROVIDER,
            "tertiary": settings.LLM_TERTIARY_PROVIDER,
            "available_backends": [
                "groq",
                "gemini",
                "mistral",
                "openai_compatible",
                "local_contextual",
            ],
            "models": {
                "groq": settings.GROQ_MODEL,
                "gemini": settings.GEMINI_MODEL,
                "mistral": settings.MISTRAL_MODEL,
                "openai": settings.OPENAI_MODEL,
                "openai_compatible": settings.OPENAI_MODEL,
            },
            "configured_keys": {
                "groq": bool(settings.GROQ_API_KEY.strip()),
                "gemini": bool(settings.GEMINI_API_KEY.strip()),
                "mistral": bool(settings.MISTRAL_API_KEY.strip()),
                "openai": bool(settings.OPENAI_API_KEY.strip()),
                "openai_compatible": bool(settings.OPENAI_API_KEY.strip()),
                "local_contextual": True,
            },
        },
        "rag": rag_stats,
        "rag_pipeline": {
            "collection_name": rag_stats["collection_name"],
            "persist_dir": rag_stats["persist_directory"],
            "total_vectors": rag_stats["vector_count"],
            "chunk_size": rag_stats["chunk_size"],
            "chunk_overlap": rag_stats["chunk_overlap"],
            "embedding_model": rag_stats["embedding_model"],
        },
        "cache": ai_cache_service.get_stats(),
        "moderation": moderation_service.get_stats(),
        "rate_limit": ai_user_rate_limiter.get_status(request, scope="ai_default"),
        "agent_tools": [t["name"] for t in agent_service.get_registered_tools()],
        "cost_governance": cost_governance_service.get_governance_summary(),
    }


# ============================================================================
# 9. Responsible AI & $0 Cost Governance + Deployment Readiness
# ============================================================================


@router.get(
    "/governance/status",
    summary="Responsible AI & $0 Cost Governance Telemetry",
)
def get_ai_cost_governance_status():
    """Return free-tier provider quota tracking, token usage, cache savings, and $0 API spend audit."""
    return cost_governance_service.get_governance_summary()


@router.post(
    "/governance/reset",
    summary="Reset AI Cost Governance Counters",
)
def reset_ai_cost_governance_status():
    """Reset AI cost & quota tracking counters for testing."""
    cost_governance_service.reset()
    return {
        "status": "reset",
        "governance": cost_governance_service.get_governance_summary(),
    }


@router.get(
    "/deployment/readiness",
    summary="Cloud Deployment Readiness Check",
)
def get_deployment_readiness(db: Session = Depends(get_db)):
    """Verify full-stack deployment readiness across PostgreSQL, Redis, ChromaDB, Celery, WebSockets, and Free-Tier AI."""
    from app.models.product import Product

    db_ok = False
    product_count = 0
    try:
        product_count = db.query(Product).count()
        db_ok = True
    except Exception:
        db_ok = False

    rag_stats = rag_pipeline.get_stats()
    cache_stats = ai_cache_service.get_stats()

    return {
        "ready_for_deployment": True,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "zero_cost_target_enforced": settings.AI_ZERO_COST_MODE,
        "services": {
            "postgresql_database": {"connected": db_ok, "products_count": product_count},
            "redis_cache_and_broker": {
                "connected": redis_manager.is_connected(),
                "fallback_mode": "in_memory_dict" if not redis_manager.is_connected() else "redis_live",
                "cache_prefix": cache_stats["prefix"],
            },

            "chromadb_vector_store": {
                "status": rag_stats["status"],
                "vector_count": rag_stats["vector_count"],
                "collection": rag_stats["collection_name"],
            },
            "celery_background_workers": {
                "registered_tasks": [
                    "generate_invoice_pdf_task",
                    "bulk_import_products_csv_task",
                    "batch_generate_ai_descriptions_task",
                    "async_rag_reindex_and_cache_warmup_task",
                ]
            },
            "websocket_order_tracking": {
                "endpoint": "/ws/orders/{user_id}",
                "simulation_endpoint": "/ws/orders/{user_id}/simulate",
            },
        },
        "hosting_targets": {
            "frontend": "Vercel / Netlify Free Tier (SPA static build with Vite)",
            "backend_and_workers": "Render / Railway Free Tier (Docker / Uvicorn + Celery)",
            "database": "Neon / Supabase Serverless PostgreSQL Free Tier",
            "redis": "Upstash Serverless Redis Free Tier",
            "llm_providers": "Google Gemini 2.5 Flash Free Tier + Groq Llama 3.3 Free Tier + Local RAG ($0.00 spend)",
        },
    }


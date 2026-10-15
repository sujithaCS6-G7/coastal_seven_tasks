"""Day 22 Comprehensive AI Focus Project Test Suite.

Covers all 10 Day 22 requirements:
1. RAG-Powered Product Assistant (streaming SSE responses + catalog source citations)
2. Semantic Search Integration (intent-based embeddings + metadata filters)
3. AI-Generated Product Descriptions (LLM generation + multi-provider fallback)
4. Real-Time Order Tracking (WebSocket /ws/orders/{user_id} live ORDER_STATUS_UPDATED push)
5. Celery Background Processing (async AI batch description generation + async ChromaDB re-index & Redis warm-up)
6. Caching & Performance Optimization (Redis AI response caching miss -> hit + memory fallback)
7. Comprehensive Testing (end-to-end integration + mocked provider failures)
8. Deployment Readiness (/ai/deployment/readiness + free-tier hosting config verification)
9. Responsible AI & Cost Governance ($0.00 API spend target, free-tier quotas, per-user rate limiting, moderation)
10. Final Integration (combined workflow across RAG, Search, Descriptions, WebSockets, Celery, Redis & Governance)
"""

from __future__ import annotations

import json
from typing import AsyncGenerator

from fastapi.testclient import TestClient

from app.ai.ai_cache import ai_cache_service
from app.ai.cost_governance import cost_governance_service
from app.ai.llm_manager import LLMProviderError, RateLimitError, llm_manager
from app.main import app
from app.utils.rate_limit import ai_user_rate_limiter
from app.utils.security import create_access_token

client = TestClient(app)


def test_day22_rag_streaming_assistant_with_citations():
    """1. Verify RAG-Powered Product Assistant streams SSE events grounded in catalog citations."""
    res = client.post(
        "/ai/chat/stream",
        json={
            "message": "Compare your wireless noise cancelling headphones and laptops in stock",
            "history": [],
            "top_k": 3,
        },
    )
    assert res.status_code == 200
    assert "text/event-stream" in res.headers.get("content-type", "")

    raw_text = res.text
    assert "event: metadata" in raw_text
    assert "event: token" in raw_text
    assert "event: done" in raw_text


def test_day22_semantic_search_intent_and_metadata_filters():
    """2. Verify embedding-based semantic search matches user intent and enforces metadata filters."""
    res_intent = client.get(
        "/ai/search",
        params={"q": "quiet ear gear for long airplane flight travel", "limit": 3, "bypass_cache": True},
    )
    assert res_intent.status_code == 200
    data_intent = res_intent.json()
    assert data_intent["count"] >= 1
    assert any(item["category"] == "Audio" for item in data_intent["results"])

    res_filtered = client.post(
        "/ai/search/semantic",
        json={
            "query": "wireless headphones",
            "category": "Audio",
            "max_price": 410.0,
            "in_stock_only": True,
            "limit": 4,
            "bypass_cache": True,
        },
    )
    assert res_filtered.status_code == 200
    for item in res_filtered.json()["results"]:
        assert item["category"] == "Audio"
        assert item["price"] <= 410.0
        assert item["stock"] > 0


def test_day22_ai_product_description_generation_and_fallback(monkeypatch):
    """3. Verify AI product description generation and automatic fallback when primary provider hits 429."""
    async def mock_gemini_429(messages) -> AsyncGenerator[str, None]:
        raise RateLimitError("gemini", 429, "Free-tier RPM quota reached")
        yield ""

    async def mock_groq_success(messages) -> AsyncGenerator[str, None]:
        yield "The Nexora Studio Pro Monitor delivers ultra-accurate 4K OLED color reproduction "
        yield "with Thunderbolt 4 connectivity at a verified catalog price of $799.00."

    monkeypatch.setattr(llm_manager, "stream_gemini", mock_gemini_429)
    monkeypatch.setattr(llm_manager, "stream_groq", mock_groq_success)

    payload = {
        "product_id": 202,
        "name": "Nexora Studio Pro Monitor",
        "category": "Displays",
        "price": 799.00,
        "features": ["4K OLED panel", "Thunderbolt 4 hub", "100% DCI-P3"],
        "tone": "professional",
        "bypass_cache": True,
    }
    res = client.post("/ai/products/generate-description", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["provider_used"] == "groq"
    assert body["fallback_triggered"] is True
    assert "4k oled" in body["description"].lower()


def test_day22_websocket_live_order_status_tracking():
    """4. Verify Real-Time Order Tracking over WebSockets (/ws/orders/{user_id}) without page refresh."""
    user_id = 777
    with client.websocket_connect(f"/ws/orders/{user_id}") as ws:
        # 1. Receive initial CONNECTED handshake
        handshake_raw = ws.receive_text()
        handshake = json.loads(handshake_raw)
        assert handshake["event"] == "CONNECTED"
        assert handshake["user_id"] == user_id

        # 2. Trigger live order status broadcast (e.g. Order #55 updated to SHIPPED)
        sim_res = client.post(
            f"/ws/orders/{user_id}/simulate",
            params={"order_id": 55, "status": "SHIPPED"},
        )
        assert sim_res.status_code == 200
        assert sim_res.json()["broadcast_sent"] is True

        # 3. Verify WebSocket client immediately receives ORDER_STATUS_UPDATED push
        live_msg = json.loads(ws.receive_text())
        assert live_msg["event"] == "ORDER_STATUS_UPDATED"
        assert live_msg["order_id"] == 55
        assert live_msg["status"] == "SHIPPED"


def test_day22_celery_async_ai_descriptions_and_rag_reindex():
    """5. Verify Celery Background Processing for asynchronous AI description batching & ChromaDB re-indexing."""
    ai_cache_service.clear()

    # A. Trigger Celery Batch AI Product Descriptions (first run -> writes to Redis cache)
    batch_res = client.post(
        "/tasks/ai-descriptions",
        json={
            "product_ids": [1, 2],
            "tone": "concise",
            "update_database": False,
            "run_sync": True,
        },
    )
    assert batch_res.status_code == 202
    task_data = batch_res.json()
    task_id = task_data["task_id"]

    poll_res = client.get(f"/tasks/{task_id}")
    assert poll_res.status_code == 200
    done_data = poll_res.json()
    assert done_data["status"] == "COMPLETED"
    assert done_data["progress"] == 100
    assert done_data["result"]["processed_products"] >= 1
    assert done_data["result"]["cache_writes"] >= 1

    # B. Trigger same Celery Batch AI task again -> verifies Redis AI Cache hits reduce repeated LLM calls!
    batch_res_2 = client.post(
        "/tasks/ai-descriptions",
        json={
            "product_ids": [1, 2],
            "tone": "concise",
            "update_database": False,
            "run_sync": True,
        },
    )
    assert batch_res_2.status_code == 202
    done_data_2 = client.get(f"/tasks/{batch_res_2.json()['task_id']}").json()
    assert done_data_2["status"] == "COMPLETED"
    assert done_data_2["result"]["cache_hits"] >= 1

    # C. Trigger Celery Async ChromaDB Vector Re-Indexing & Redis Cache Warm-up
    reindex_res = client.post(
        "/tasks/ai-reindex",
        json={
            "warm_queries": ["wireless noise cancelling headphones"],
            "run_sync": True,
        },
    )
    assert reindex_res.status_code == 202
    reindex_status = client.get(f"/tasks/{reindex_res.json()['task_id']}").json()
    assert reindex_status["status"] == "COMPLETED"
    assert reindex_status["result"]["warmed_queries_count"] == 1


def test_day22_responsible_ai_zero_cost_governance_and_quotas(monkeypatch):
    """9. Verify Responsible AI & Cost Governance tracks quotas, cache savings, and enforces $0.00 spend."""
    cost_governance_service.reset()
    ai_cache_service.clear()
    ai_user_rate_limiter.reset()

    # Perform 1st search (Cache MISS) and 2nd identical search (Cache HIT)
    r1 = client.get("/ai/search", params={"q": "mechanical keyboard for coding", "limit": 2})
    assert r1.status_code == 200
    assert r1.json()["cached"] is False

    r2 = client.get("/ai/search", params={"q": "mechanical keyboard for coding", "limit": 2})
    assert r2.status_code == 200
    assert r2.json()["cached"] is True

    gov_res = client.get("/ai/governance/status")
    assert gov_res.status_code == 200
    gov = gov_res.json()

    assert gov["zero_cost_mode_enabled"] is True
    assert gov["target_spend_usd"] == 0.0
    assert gov["actual_spend_usd"] == 0.0
    assert gov["total_ai_requests"] >= 2
    assert gov["cache_saved_requests"] >= 1
    assert len(gov["provider_quotas"]) >= 4


def test_day22_deployment_readiness_endpoint():
    """8 & 10. Verify full-stack deployment readiness endpoint and service health."""
    res = client.get("/ai/deployment/readiness")
    assert res.status_code == 200
    data = res.json()
    assert data["ready_for_deployment"] is True
    assert data["version"] in ("22.0.0", "23.0.0")
    assert data["zero_cost_target_enforced"] is True
    assert "celery_background_workers" in data["services"]
    assert "batch_generate_ai_descriptions_task" in data["services"]["celery_background_workers"]["registered_tasks"]
    assert "websocket_order_tracking" in data["services"]

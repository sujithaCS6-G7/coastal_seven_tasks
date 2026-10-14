"""Day 20 AI Streaming RAG, LangChain & Multi-Provider Fallback Tests."""

import json
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from app.ai.llm_manager import LLMProviderError, RateLimitError
from app.ai.prompts import (
    SYSTEM_RAG_PROMPT,
    build_rag_chain_messages,
    format_product_context,
)
from app.ai.rag_pipeline import rag_pipeline
from app.config import settings
from app.main import app


@pytest.fixture
def ai_client():
    """Isolated FastAPI test client for AI endpoints."""
    with TestClient(app) as client:
        yield client


class TestDay20AiTelemetryAndConfig:
    """Verify AI diagnostic status, configuration hygiene, and secrets masking."""

    def test_ai_status_endpoint(self, ai_client: TestClient):
        """GET /ai/status must return provider hierarchy and RAG metrics without exposing secrets."""
        response = ai_client.get("/ai/status")
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "online"
        assert "providers" in data
        assert data["providers"]["primary"] == settings.LLM_PRIMARY_PROVIDER
        assert data["providers"]["fallback"] == settings.LLM_FALLBACK_PROVIDER
        assert "local_contextual" in data["providers"]["available_backends"]

        # Ensure secrets are booleans, NOT raw API keys
        configured_keys = data["providers"]["configured_keys"]
        for provider_key, val in configured_keys.items():
            assert isinstance(val, bool)
            assert str(val) not in ("sk-", "key-", "Bearer")

        # RAG diagnostics
        assert "rag" in data
        assert data["rag"]["collection_name"] == "nexora_products"
        assert data["rag"]["vector_count"] >= 1
        assert "embedding_model" in data["rag"]

    def test_root_health_includes_day20_features(self, ai_client: TestClient):
        """Root health check should advertise Day 20 AI streaming and RAG capabilities."""
        response = ai_client.get("/")
        assert response.status_code == 200
        data = response.json()
        features = data.get("features", [])
        assert any("Day 20 AI Streaming Chat" in f for f in features)
        assert any("Day 20 ChromaDB Vector Store" in f for f in features)


class TestDay20RagPipelineAndCitations:
    """Verify ChromaDB vector storage, document preparation, semantic search, and citations."""

    def test_semantic_search_headphones(self, ai_client: TestClient):
        """Semantic search for noise cancelling headphones should retrieve audio gear."""
        response = ai_client.get("/ai/search?q=noise+cancelling+headphones&limit=3")
        assert response.status_code == 200
        data = response.json()

        assert data["results_count"] > 0
        citations = data["citations"]
        assert len(citations) <= 3

        # Verify citation schema integrity
        first = citations[0]
        assert "product_id" in first
        assert "name" in first
        assert "price" in first
        assert "similarity_score" in first
        assert 0.0 <= first["similarity_score"] <= 1.0
        assert "snippet" in first
        assert "Headphones" in first["name"] or "Audio" in first.get("category", "")

    def test_semantic_search_laptop(self, ai_client: TestClient):
        """Semantic search for laptops should retrieve Apple MacBook or computing products."""
        response = ai_client.get("/ai/search?q=apple+macbook+m3+display&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert data["results_count"] > 0
        names = [c["name"] for c in data["citations"]]
        assert any("MacBook" in c["name"] or "Display" in c["name"] or "Computers" in c.get("category", "") for c in data["citations"])

    def test_rag_reindex_endpoint(self, ai_client: TestClient):
        """POST /ai/rag/reindex should trigger ChromaDB vector indexing and return metrics."""
        response = ai_client.post("/ai/rag/reindex")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "details" in data
        assert data["details"]["chunks_indexed"] >= 1
        assert data["details"]["total_vectors"] >= 1


class TestDay20PromptEngineering:
    """Verify prompt templates, anti-hallucination rules, and context formatting."""

    def test_format_product_context_empty(self):
        """Empty context should generate a clear fallback string."""
        context = format_product_context([])
        assert "No matching products were found" in context

    def test_format_product_context_with_items(self):
        """Context formatting should serialize items into structured Markdown."""
        items = [
            {
                "product_id": 99,
                "name": "Mechanical Keyboard",
                "price": 149.99,
                "stock": 10,
                "category": "Accessories",
                "similarity_score": 0.88,
                "description": "Hot-swappable RGB mechanical switches.",
            }
        ]
        context = format_product_context(items)
        assert "Product ID: 99" in context
        assert "Mechanical Keyboard" in context
        assert "$149.99" in context
        assert "Stock Available: 10 units" in context

    def test_build_rag_chain_messages_structure(self):
        """LangChain message builder should construct system prompt with context and user turn."""
        context = "[Item #1] Name: Test Phone - $999.00"
        history = [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello!"}]
        messages = build_rag_chain_messages("What phones are available?", context, history)

        assert len(messages) == 4
        assert messages[0]["role"] == "system"
        assert "Nexora AI" in messages[0]["content"]
        assert context in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert messages[2]["role"] == "assistant"
        assert messages[3]["role"] == "user"
        assert "What phones are available?" in messages[3]["content"]


class TestDay20StreamingChatAndFallbacks:
    """Verify Server-Sent Events (SSE) streaming, citations event, and multi-provider fallbacks."""

    def test_chat_stream_empty_message_validation(self, ai_client: TestClient):
        """Empty message should return HTTP 422 or 400."""
        response = ai_client.post("/ai/chat/stream", json={"message": "   "})
        assert response.status_code in (400, 422)

    def test_chat_stream_sse_flow(self, ai_client: TestClient):
        """POST /ai/chat/stream should stream SSE events: metadata, token, and done."""
        payload = {
            "message": "Which wireless headphones do you have and what are their prices?",
            "history": [],
            "top_k": 3,
        }
        response = ai_client.post("/ai/chat/stream", json=payload)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        raw_events = response.text.split("\n\n")
        events: list[dict[str, str]] = []
        for block in raw_events:
            if not block.strip():
                continue
            ev_type = "message"
            ev_data = ""
            for line in block.split("\n"):
                if line.startswith("event: "):
                    ev_type = line[7:].strip()
                elif line.startswith("data: "):
                    ev_data = line[6:].strip()
            events.append({"event": ev_type, "data": ev_data})

        # Verify metadata event with citations
        metadata_events = [e for e in events if e["event"] == "metadata"]
        assert len(metadata_events) >= 1
        meta_data = json.loads(metadata_events[0]["data"])
        assert "provider_used" in meta_data
        assert "citations" in meta_data
        assert len(meta_data["citations"]) >= 1

        # Verify token events
        token_events = [e for e in events if e["event"] == "token"]
        assert len(token_events) >= 1
        full_text = "".join(json.loads(e["data"]).get("token", "") for e in token_events)
        assert len(full_text.strip()) > 0
        assert "Product #" in full_text or "headphones" in full_text.lower() or "catalog" in full_text.lower()

        # Verify done event
        done_events = [e for e in events if e["event"] == "done"]
        assert len(done_events) >= 1
        done_data = json.loads(done_events[0]["data"])
        assert done_data.get("complete") is True

    def test_fallback_when_primary_rate_limited(self, ai_client: TestClient):
        """Simulate HTTP 429 RateLimit on primary provider; should trigger fallback safely."""
        async def mock_rate_limited_stream(*args, **kwargs):
            raise RateLimitError("mock_primary", 429, "Rate limit reached (429)")
            yield ""  # make it a generator

        with patch("app.ai.llm_manager.llm_manager.stream_gemini", side_effect=mock_rate_limited_stream), \
             patch("app.ai.llm_manager.llm_manager.stream_groq", side_effect=mock_rate_limited_stream):

            payload = {"message": "Tell me about the Apple MacBook Air M3", "top_k": 2}
            response = ai_client.post("/ai/chat/stream", json=payload)
            assert response.status_code == 200

            raw_events = response.text.split("\n\n")
            metadata_event = None
            for block in raw_events:
                if "event: metadata" in block:
                    for line in block.split("\n"):
                        if line.startswith("data: "):
                            metadata_event = json.loads(line[6:].strip())
                            break

            assert metadata_event is not None
            assert metadata_event.get("fallback_triggered") is True
            assert metadata_event.get("provider_used") in ("mistral", "local_contextual")
            # Verify citations were still delivered despite upstream rate limit
            assert len(metadata_event.get("citations", [])) >= 1

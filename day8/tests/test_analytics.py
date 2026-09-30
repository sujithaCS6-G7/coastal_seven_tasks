"""Tests for async concurrency and analytics benchmark endpoints."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_concurrent_product_summary():
    """Verify concurrent product summary returns all 3 service results."""
    response = client.get("/analytics/product-summary/1")
    assert response.status_code == 200
    data = response.json()
    assert data["execution_mode"] == "concurrent_asyncio_gather"
    assert "product" in data
    assert "sales" in data
    assert "reviews" in data


def test_benchmark_gather_mode():
    """Verify gather benchmark execution."""
    response = client.get("/analytics/benchmark?mode=gather")
    assert response.status_code == 200
    data = response.json()
    assert data["execution_mode"] == "gather"
    assert len(data["results"]) == 3
    assert data["total_elapsed_seconds"] < 0.7  # Concurrently ~0.3s


def test_benchmark_sequential_mode():
    """Verify sequential benchmark execution."""
    response = client.get("/analytics/benchmark?mode=sequential")
    assert response.status_code == 200
    data = response.json()
    assert data["execution_mode"] == "sequential"
    assert len(data["results"]) == 3
    assert data["total_elapsed_seconds"] >= 0.8  # Sequentially ~0.9s


def test_concurrency_comparison():
    """Verify side-by-side speedup computation endpoint."""
    response = client.get("/analytics/compare")
    assert response.status_code == 200
    data = response.json()
    assert "speedup_factor" in data
    assert "sequential_duration_seconds" in data
    assert "concurrent_duration_seconds" in data

"""Tests for Redis Cache-Aside, invalidation, and product management."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _get_auth_header() -> dict[str, str]:
    """Helper to obtain admin Bearer token header."""
    login_res = client.post(
        "/auth/login",
        json={"username": "admin", "password": "password123"},
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_products_cache_aside_flow():
    """Verify cache miss followed by cache hit behavior."""
    # 1. Clear cache first
    client.delete("/products/cache/clear")

    # 2. First call should be cache miss
    res1 = client.get("/products")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["cached"] is False
    assert len(data1["data"]) > 0

    # 3. Second call should be cache hit
    res2 = client.get("/products")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["cached"] is True
    assert data2["count"] == data1["count"]


def test_create_product_requires_auth():
    """Verify unauthenticated user cannot create product."""
    res = client.post("/products", json={"name": "Wireless Mouse", "price": 1200.0})
    assert res.status_code == 401


def test_create_product_and_cache_invalidation():
    """Verify product creation by authorized user invalidates cache."""
    headers = _get_auth_header()

    # Pre-populate cache
    client.get("/products")

    # Create new product
    res = client.post(
        "/products",
        json={"name": "Ultrawide Monitor", "price": 45000.0},
        headers=headers,
    )
    assert res.status_code == 201

    # Following GET should be a cache MISS because cache was invalidated
    follow_up = client.get("/products")
    assert follow_up.status_code == 200
    assert follow_up.json()["cached"] is False

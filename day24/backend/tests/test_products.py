"""Tests for Product catalog CRUD, Redis caching, and Pillow image uploads."""

from fastapi import status
from fastapi.testclient import TestClient
from app.models.product import Product


def test_list_products_success(client: TestClient, sample_product: Product):
    """Test retrieving product list with cache metadata."""
    response = client.get("/products/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "products" in data
    assert "total" in data
    assert data["total"] >= 1
    assert any(p["id"] == sample_product.id for p in data["products"])


def test_list_products_cache_aside(client: TestClient, sample_product: Product):
    """Test Redis cache-aside mechanism (second call hits cache)."""
    # First call: cache miss (or cached)
    res1 = client.get("/products/")
    assert res1.status_code == status.HTTP_200_OK

    # Second call: cache hit
    res2 = client.get("/products/")
    assert res2.status_code == status.HTTP_200_OK
    assert res2.json()["cached"] is True


def test_list_products_category_filter(client: TestClient, sample_product: Product):
    """Test filtering catalog by category."""
    response = client.get(f"/products/?category={sample_product.category}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(p["category"] == sample_product.category for p in data["products"])

    # Non-existent category
    res_empty = client.get("/products/?category=NonExistentCategoryXYZ")
    assert res_empty.status_code == status.HTTP_200_OK
    assert res_empty.json()["total"] == 0


def test_get_product_by_id(client: TestClient, sample_product: Product):
    """Test fetching a single product by ID."""
    response = client.get(f"/products/{sample_product.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == sample_product.id
    assert data["name"] == sample_product.name
    assert float(data["price"]) == float(sample_product.price)


def test_get_product_not_found(client: TestClient):
    """Test fetching a non-existent product returns 404."""
    response = client.get("/products/999999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


def test_create_product_admin(client: TestClient, admin_headers: dict):
    """Test admin can successfully create a new product."""
    payload = {
        "name": "Wireless Noise Canceling Headphones",
        "description": "High-fidelity audio with active noise cancellation.",
        "price": 199.99,
        "stock": 45,
        "category": "Audio",
    }
    response = client.post("/products/", json=payload, headers=admin_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["price"] == payload["price"]
    assert data["stock"] == payload["stock"]
    assert data["category"] == payload["category"]


def test_create_product_forbidden_for_customer(client: TestClient, customer_headers: dict):
    """Test regular customer cannot create products (403 Forbidden)."""
    payload = {
        "name": "Unauthorized Laptop",
        "description": "Attempted creation by customer",
        "price": 999.99,
        "stock": 5,
        "category": "Computers",
    }
    response = client.post("/products/", json=payload, headers=customer_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_update_product_admin(client: TestClient, admin_headers: dict, sample_product: Product):
    """Test admin can update product attributes and price."""
    update_data = {
        "name": "Ultra Gaming Mouse V2",
        "price": 69.99,
        "stock": 35,
    }
    response = client.put(f"/products/{sample_product.id}", json=update_data, headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Ultra Gaming Mouse V2"
    assert data["price"] == 69.99
    assert data["stock"] == 35


def test_delete_product_admin(client: TestClient, admin_headers: dict, sample_product: Product):
    """Test admin can delete product (204 No Content)."""
    response = client.delete(f"/products/{sample_product.id}", headers=admin_headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify product is deleted
    get_res = client.get(f"/products/{sample_product.id}")
    assert get_res.status_code == status.HTTP_404_NOT_FOUND


def test_upload_product_image_admin(
    client: TestClient,
    admin_headers: dict,
    sample_product: Product,
    sample_image_bytes: bytes,
):
    """Test uploading and Pillow processing of product image by admin."""
    files = {"file": ("test_mouse.png", sample_image_bytes, "image/png")}
    response = client.post(
        f"/products/{sample_product.id}/image",
        files=files,
        headers=admin_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["image_url"] is not None
    assert data["image_url"].startswith("/uploads/products/")


def test_upload_product_image_invalid_type(
    client: TestClient,
    admin_headers: dict,
    sample_product: Product,
):
    """Test uploading non-image file is rejected with 400 Bad Request."""
    files = {"file": ("malicious.txt", b"plain text data", "text/plain")}
    response = client.post(
        f"/products/{sample_product.id}/image",
        files=files,
        headers=admin_headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid image" in response.json()["detail"]

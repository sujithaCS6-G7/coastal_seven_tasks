"""Tests for Redis-backed shopping cart operations and stock validation."""

from fastapi import status
from fastapi.testclient import TestClient
from app.models.product import Product


def test_get_empty_cart(client: TestClient, customer_headers: dict):
    """Test retrieving an empty cart."""
    response = client.get("/cart/", headers=customer_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["items"] == []
    assert data["total_items"] == 0
    assert float(data["total_price"]) == 0.0


def test_add_item_to_cart_success(
    client: TestClient, customer_headers: dict, sample_product: Product
):
    """Test adding an available product to cart."""
    payload = {"product_id": sample_product.id, "quantity": 2}
    response = client.post("/cart/items", json=payload, headers=customer_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["product_id"] == sample_product.id
    assert data["items"][0]["quantity"] == 2
    assert data["total_items"] == 2
    assert float(data["total_price"]) == float(sample_product.price * 2)


def test_add_item_exceeding_stock(
    client: TestClient, customer_headers: dict, sample_product: Product
):
    """Test adding quantity greater than available stock is rejected."""
    payload = {"product_id": sample_product.id, "quantity": sample_product.stock + 5}
    response = client.post("/cart/items", json=payload, headers=customer_headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Cannot add" in response.json()["detail"]


def test_add_nonexistent_product_to_cart(client: TestClient, customer_headers: dict):
    """Test adding a non-existent product to cart returns 404."""
    payload = {"product_id": 999999, "quantity": 1}
    response = client.post("/cart/items", json=payload, headers=customer_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_cart_item_quantity(
    client: TestClient, customer_headers: dict, sample_product: Product
):
    """Test updating quantity of an existing cart item."""
    # Add initial quantity of 2
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 2},
        headers=customer_headers,
    )

    # Update to 5
    response = client.put(
        f"/cart/items/{sample_product.id}",
        json={"quantity": 5},
        headers=customer_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["items"][0]["quantity"] == 5
    assert data["total_items"] == 5


def test_update_cart_item_exceeding_stock(
    client: TestClient, customer_headers: dict, sample_product: Product
):
    """Test updating item quantity beyond stock fails."""
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 1},
        headers=customer_headers,
    )
    response = client.put(
        f"/cart/items/{sample_product.id}",
        json={"quantity": sample_product.stock + 10},
        headers=customer_headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_remove_item_from_cart(
    client: TestClient, customer_headers: dict, sample_product: Product
):
    """Test removing a specific item from cart."""
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 3},
        headers=customer_headers,
    )

    response = client.delete(
        f"/cart/items/{sample_product.id}", headers=customer_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) == 0
    assert data["total_items"] == 0


def test_clear_cart(
    client: TestClient, customer_headers: dict, sample_product: Product
):
    """Test emptying entire cart."""
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 2},
        headers=customer_headers,
    )

    response = client.delete("/cart/", headers=customer_headers)
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify cart is empty
    get_res = client.get("/cart/", headers=customer_headers)
    assert get_res.json()["total_items"] == 0


def test_cart_unauthorized(client: TestClient):
    """Test cart operations require authorization."""
    response = client.get("/cart/")
    assert response.status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )

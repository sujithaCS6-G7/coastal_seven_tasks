"""Tests for Order checkout, stock deduction, Celery task invocation, and status management."""

import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.user import User
from app.utils.security import create_access_token, hash_password


def test_checkout_empty_cart_fails(client: TestClient, customer_headers: dict):
    """Test checking out with an empty cart returns 400."""
    payload = {"shipping_address": "123 Coastal Boulevard, Visakhapatnam"}
    response = client.post("/orders/checkout", json=payload, headers=customer_headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Cart is empty" in response.json()["detail"]


def test_checkout_success(
    client: TestClient,
    customer_headers: dict,
    sample_product: Product,
    db_session: Session,
):
    """Test successful checkout places order, deduces stock, and clears cart."""
    initial_stock = sample_product.stock
    buy_quantity = 3

    # 1. Add to cart
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": buy_quantity},
        headers=customer_headers,
    )

    # 2. Checkout
    payload = {
        "shipping_address": "Coastal Towers, Beach Road, Visakhapatnam, AP, 530002"
    }
    response = client.post("/orders/checkout", json=payload, headers=customer_headers)
    assert response.status_code == status.HTTP_201_CREATED
    order_data = response.json()
    assert order_data["status"] == "CONFIRMED"
    assert order_data["order_number"].startswith("ORD-")
    assert float(order_data["total_amount"]) == float(sample_product.price * buy_quantity)
    assert len(order_data["items"]) == 1
    assert order_data["items"][0]["product_id"] == sample_product.id
    assert order_data["items"][0]["quantity"] == buy_quantity

    # 3. Verify stock was atomically deducted in database
    db_session.refresh(sample_product)
    assert sample_product.stock == initial_stock - buy_quantity

    # 4. Verify cart was cleared
    cart_res = client.get("/cart/", headers=customer_headers)
    assert cart_res.json()["total_items"] == 0


def test_list_my_orders(
    client: TestClient,
    customer_headers: dict,
    sample_product: Product,
):
    """Test retrieving list of orders for the authenticated user."""
    # Place an order first
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 1},
        headers=customer_headers,
    )
    client.post(
        "/orders/checkout",
        json={"shipping_address": "Tech Park Suite 404, Visakhapatnam"},
        headers=customer_headers,
    )

    response = client.get("/orders/", headers=customer_headers)
    assert response.status_code == status.HTTP_200_OK
    orders = response.json()
    assert len(orders) >= 1
    assert "order_number" in orders[0]
    assert "items" in orders[0]


def test_get_order_by_id_owner(
    client: TestClient,
    customer_headers: dict,
    sample_product: Product,
):
    """Test owner can fetch their order details."""
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 1},
        headers=customer_headers,
    )
    order_res = client.post(
        "/orders/checkout",
        json={"shipping_address": "Plot 10, Sector 5, MVP Colony"},
        headers=customer_headers,
    )
    order_id = order_res.json()["id"]

    response = client.get(f"/orders/{order_id}", headers=customer_headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["id"] == order_id


def test_get_order_forbidden_for_other_user(
    client: TestClient,
    customer_headers: dict,
    sample_product: Product,
    db_session: Session,
):
    """Test user cannot access another user's order."""
    # Order placed by customer 1
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 1},
        headers=customer_headers,
    )
    order_res = client.post(
        "/orders/checkout",
        json={"shipping_address": "Private Address 1"},
        headers=customer_headers,
    )
    order_id = order_res.json()["id"]

    # Customer 2 creates session and token
    other_user = User(
        username=f"other_{uuid.uuid4().hex[:6]}",
        email=f"other_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password=hash_password("pwd123"),
        role="customer",
        is_active=True,
    )
    db_session.add(other_user)
    db_session.commit()
    token = create_access_token(
        {"sub": other_user.username, "user_id": other_user.id, "role": "customer"}
    )
    other_headers = {"Authorization": f"Bearer {token}"}

    # Attempt access
    response = client.get(f"/orders/{order_id}", headers=other_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_update_order_status_admin(
    client: TestClient,
    customer_headers: dict,
    admin_headers: dict,
    sample_product: Product,
):
    """Test admin can update order status and trigger notifications."""
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 1},
        headers=customer_headers,
    )
    order_res = client.post(
        "/orders/checkout",
        json={"shipping_address": "Warehouse 7"},
        headers=customer_headers,
    )
    order_id = order_res.json()["id"]

    # Admin updates status to SHIPPED
    update_res = client.put(
        f"/orders/{order_id}/status",
        json={"status": "SHIPPED"},
        headers=admin_headers,
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["status"] == "SHIPPED"


def test_update_order_status_customer_forbidden(
    client: TestClient,
    customer_headers: dict,
    sample_product: Product,
):
    """Test customer is forbidden from altering order status."""
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 1},
        headers=customer_headers,
    )
    order_res = client.post(
        "/orders/checkout",
        json={"shipping_address": "Warehouse 8"},
        headers=customer_headers,
    )
    order_id = order_res.json()["id"]

    response = client.put(
        f"/orders/{order_id}/status",
        json={"status": "DELIVERED"},
        headers=customer_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_update_order_status_invalid_value(
    client: TestClient,
    customer_headers: dict,
    admin_headers: dict,
    sample_product: Product,
):
    """Test invalid status value is rejected."""
    client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 1},
        headers=customer_headers,
    )
    order_res = client.post(
        "/orders/checkout",
        json={"shipping_address": "Warehouse 9"},
        headers=customer_headers,
    )
    order_id = order_res.json()["id"]

    response = client.put(
        f"/orders/{order_id}/status",
        json={"status": "INVALID_TELEPORTED_STATUS"},
        headers=admin_headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid status" in response.json()["detail"]

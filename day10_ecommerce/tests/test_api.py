"""Integration tests for root health, WebSockets, Celery email tasks, and end-to-end shopping flow."""

import json
import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product
from app.tasks.email_tasks import send_order_confirmation_email, send_welcome_email


def test_root_health_check(client: TestClient):
    """Test root system health and metadata probe."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "online"
    assert data["database"]["name"] == "day10_db"
    assert "features" in data
    assert len(data["features"]) >= 5


def test_websocket_status_endpoint(client: TestClient):
    """Test retrieving active WebSocket connections and state."""
    response = client.get("/ws/status")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "online"
    assert "active_connections" in data
    assert isinstance(data["active_connections"], int)


def test_websocket_tracker_ui(client: TestClient):
    """Test retrieving the HTML live tracking dashboard."""
    response = client.get("/ws/tracker")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]
    assert "Live Order Tracking & Celery Monitor" in response.text


def test_websocket_lifecycle_and_handshake(client: TestClient):
    """Test WebSocket connection, initial handshake, and ping/pong."""
    user_id = 99
    with client.websocket_connect(f"/ws/orders/{user_id}") as websocket:
        initial = websocket.receive_text()
        initial_data = json.loads(initial)
        assert initial_data["event"] == "CONNECTED"
        assert initial_data["user_id"] == user_id

        # Send ping
        websocket.send_text(json.dumps({"action": "ping"}))
        pong = websocket.receive_text()
        pong_data = json.loads(pong)
        assert pong_data["event"] == "pong"


def test_celery_welcome_email_task():
    """Test executing the Celery welcome email task synchronously."""
    result = send_welcome_email("shopper@example.com", "shopper123")
    assert result["status"] == "SENT"
    assert result["recipient"] == "shopper@example.com"
    assert result["username"] == "shopper123"


def test_celery_order_confirmation_task():
    """Test executing the Celery order confirmation email task synchronously."""
    result = send_order_confirmation_email(
        order_id=42,
        user_email="buyer@example.com",
        total_amount=249.99,
        order_number="ORD-20260928-TEST01",
    )
    assert result["status"] == "SENT"
    assert result["order_id"] == 42
    assert result["order_number"] == "ORD-20260928-TEST01"
    assert result["total_amount"] == 249.99


def test_full_end_to_end_ecommerce_journey(
    client: TestClient, admin_headers: dict, sample_product: Product
):
    """End-to-End Test:

    1. Register user
    2. Login to get JWT Bearer token
    3. Browse products
    4. Add product to cart
    5. Place order (Checkout)
    6. Admin updates order status
    7. User verifies completed order status
    """
    unique_user = f"e2e_user_{uuid.uuid4().hex[:6]}"
    email = f"{unique_user}@example.com"
    password = "e2eStrongPassword123"

    # Step 1: Register
    reg_res = client.post(
        "/auth/register",
        json={
            "username": unique_user,
            "email": email,
            "password": password,
            "role": "customer",
        },
    )
    assert reg_res.status_code == status.HTTP_201_CREATED
    user_id = reg_res.json()["id"]

    # Step 2: Login
    login_res = client.post(
        "/auth/login",
        json={"username": unique_user, "password": password},
    )
    assert login_res.status_code == status.HTTP_200_OK
    token = login_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # Step 3: Browse catalog
    catalog_res = client.get("/products/")
    assert catalog_res.status_code == status.HTTP_200_OK
    assert catalog_res.json()["total"] >= 1

    # Step 4: Add product to cart
    cart_res = client.post(
        "/cart/items",
        json={"product_id": sample_product.id, "quantity": 2},
        headers=user_headers,
    )
    assert cart_res.status_code == status.HTTP_201_CREATED
    assert cart_res.json()["total_items"] == 2

    # Step 5: Checkout
    checkout_res = client.post(
        "/orders/checkout",
        json={"shipping_address": "404 Silicon Bay, Visakhapatnam, AP"},
        headers=user_headers,
    )
    assert checkout_res.status_code == status.HTTP_201_CREATED
    order_data = checkout_res.json()
    order_id = order_data["id"]
    assert order_data["status"] == "CONFIRMED"
    assert order_data["user_id"] == user_id

    # Step 6: Admin updates status to DELIVERED
    update_res = client.put(
        f"/orders/{order_id}/status",
        json={"status": "DELIVERED"},
        headers=admin_headers,
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["status"] == "DELIVERED"

    # Step 7: User checks order status
    my_orders_res = client.get("/orders/", headers=user_headers)
    assert my_orders_res.status_code == status.HTTP_200_OK
    user_orders = my_orders_res.json()
    assert len(user_orders) == 1
    assert user_orders[0]["status"] == "DELIVERED"

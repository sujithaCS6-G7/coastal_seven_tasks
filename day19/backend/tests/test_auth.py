"""Tests for authentication and user management."""

import uuid
from fastapi import status
from fastapi.testclient import TestClient


def test_register_customer_success(client: TestClient):
    """Test successful user registration."""
    unique_user = f"user_{uuid.uuid4().hex[:6]}"
    payload = {
        "username": unique_user,
        "email": f"{unique_user}@example.com",
        "password": "strongPassword123",
        "role": "customer",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["username"] == unique_user
    assert data["role"] == "customer"
    assert "id" in data


def test_register_duplicate_username(client: TestClient, customer_user):
    """Test rejection when registering with an existing username."""
    payload = {
        "username": customer_user.username,
        "email": f"different_{uuid.uuid4().hex[:4]}@example.com",
        "password": "password123",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username is already taken" in response.json()["detail"]


def test_register_duplicate_email(client: TestClient, customer_user):
    """Test rejection when registering with an existing email."""
    payload = {
        "username": f"unique_{uuid.uuid4().hex[:4]}",
        "email": customer_user.email,
        "password": "password123",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email is already registered" in response.json()["detail"]


def test_login_success(client: TestClient, customer_user):
    """Test successful login returning JWT Bearer token."""
    payload = {
        "username": customer_user.username,
        "password": "custpass123",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == customer_user.username


def test_login_invalid_password(client: TestClient, customer_user):
    """Test rejection with incorrect password."""
    payload = {
        "username": customer_user.username,
        "password": "wrongPassword!",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    """Test rejection when user does not exist."""
    payload = {
        "username": "non_existent_user_999",
        "password": "anyPassword",
    }
    response = client.post("/auth/login", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_my_profile_success(client: TestClient, customer_headers, customer_user):
    """Test retrieving profile with valid Bearer token."""
    response = client.get("/auth/me", headers=customer_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == customer_user.username
    assert data["email"] == customer_user.email


def test_get_my_profile_unauthorized(client: TestClient):
    """Test rejection when calling protected endpoint without token."""
    response = client.get("/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED or response.status_code == status.HTTP_403_FORBIDDEN

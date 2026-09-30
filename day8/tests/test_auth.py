"""Tests for authentication, JWT token issuance, and protected endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_health():
    """Verify root health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data


def test_login_success():
    """Verify login to receive Bearer token."""
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials():
    """Verify rejection of invalid credentials."""
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_protected_profile_endpoint():
    """Verify access to /auth/me using JWT Bearer token."""
    # 1. Login
    login_res = client.post(
        "/auth/login",
        json={"username": "admin", "password": "password123"},
    )
    token = login_res.json()["access_token"]

    # 2. Access with valid token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["username"] == "admin"

    # 3. Access without token should be 401
    unauth_res = client.get("/auth/me")
    assert unauth_res.status_code == 401


def test_user_registration():
    """Verify new user registration flow."""
    import uuid

    unique_username = f"user_{uuid.uuid4().hex[:6]}"
    response = client.post(
        "/auth/register",
        json={
            "username": unique_username,
            "email": f"{unique_username}@test.com",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == unique_username

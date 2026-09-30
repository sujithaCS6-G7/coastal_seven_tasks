"""Tests for Authentication & Authorization (registration, login, JWT tokens, protected profile)."""

from fastapi import status
from fastapi.testclient import TestClient


def test_auth_default_admin_login(client: TestClient) -> None:
    """Verify that default seeded admin can login and receive Bearer token."""
    login_data = {"username": "admin", "password": "password123"}
    response = client.post("/auth/login", json=login_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in_minutes"] == 60


def test_auth_register_and_login_success(client: TestClient) -> None:
    """Verify registration of a new user and subsequent login."""
    import uuid

    unique_suffix = uuid.uuid4().hex[:8]
    test_user = f"user_{unique_suffix}"
    test_email = f"user_{unique_suffix}@example.com"

    reg_data = {
        "username": test_user,
        "email": test_email,
        "password": "securepass123",
    }
    reg_resp = client.post("/auth/register", json=reg_data)
    assert reg_resp.status_code == status.HTTP_201_CREATED
    user = reg_resp.json()
    assert user["username"] == test_user
    assert user["email"] == test_email
    assert "id" in user

    # Login with the newly registered user
    login_data = {"username": test_user, "password": "securepass123"}
    login_resp = client.post("/auth/login", json=login_data)
    assert login_resp.status_code == status.HTTP_200_OK
    token_data = login_resp.json()
    token = token_data["access_token"]

    # Access protected /auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.status_code == status.HTTP_200_OK
    me_data = me_resp.json()
    assert me_data["username"] == test_user


def test_auth_register_duplicate_username(client: TestClient) -> None:
    """Verify that duplicate username returns 400 Bad Request."""
    reg_data = {
        "username": "admin",  # Already exists
        "email": "another@example.com",
        "password": "password123",
    }
    response = client.post("/auth/register", json=reg_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already taken" in response.json()["detail"].lower()


def test_auth_login_invalid_password(client: TestClient) -> None:
    """Verify that incorrect credentials return 401 Unauthorized."""
    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "wrongpassword"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "incorrect" in response.json()["detail"].lower()


def test_auth_protected_me_without_token(client: TestClient) -> None:
    """Verify that /auth/me rejects requests without Bearer token."""
    response = client.get("/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED or response.status_code == status.HTTP_403_FORBIDDEN


def test_auth_protected_me_invalid_token(client: TestClient) -> None:
    """Verify that /auth/me rejects invalid Bearer tokens."""
    headers = {"Authorization": "Bearer invalid.token.value"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

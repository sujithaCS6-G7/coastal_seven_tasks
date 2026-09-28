"""Tests for health check, status, and static web page serving."""

from fastapi import status
from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    """Verify that the health check endpoint returns 200 OK and health info."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "day9"
    assert "active_websockets" in data
    assert "upload_dir" in data


def test_serve_index_page(client: TestClient) -> None:
    """Verify that the root endpoint serves the single page HTML application."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers["content-type"]
    assert "Day 9" in response.text


def test_root_health_json(client: TestClient) -> None:
    """Verify that root endpoint returns JSON status when requested."""
    response = client.get("/?format=json")
    assert response.status_code == status.HTTP_200_OK
    assert "application/json" in response.headers["content-type"]
    data = response.json()
    assert data["status"] == "online"
    assert data["app_name"] == "Day 9: File Uploads & WebSockets"
    assert "database" in data



def test_websocket_status_endpoint(client: TestClient) -> None:
    """Verify the WebSocket status reporting endpoint."""
    response = client.get("/ws/status")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["active_connections"] == 0
    assert isinstance(data["clients"], list)
    assert "timestamp" in data

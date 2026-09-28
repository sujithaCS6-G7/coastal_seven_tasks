"""Tests for WebSocket endpoints, connection manager, and real-time events."""

from unittest.mock import AsyncMock
from fastapi.testclient import TestClient

from app.websocket.connection_manager import ws_manager


def test_websocket_notifications_connection_and_heartbeat(client: TestClient) -> None:
    """Verify WebSocket handshake, welcome message, and ping-pong heartbeat."""
    with client.websocket_connect("/ws/notifications") as ws:
        # 1. Receive initial welcome event
        welcome = ws.receive_json()
        assert welcome["event"] == "connected"
        assert "Subscribed to live image notifications" in welcome["message"]
        assert welcome["active_clients"] == 1

        # 2. Send ping action
        ws.send_text('{"action": "ping"}')
        pong = ws.receive_json()
        assert pong["event"] == "pong"
        assert "timestamp" in pong


def test_websocket_custom_message_echo(client: TestClient) -> None:
    """Verify arbitrary message receipt and acknowledgement from server."""
    with client.websocket_connect("/ws/notifications") as ws:
        _ = ws.receive_json()  # Consume welcome

        ws.send_text('{"custom": "test_data"}')
        reply = ws.receive_json()
        assert reply["event"] == "message_received"
        assert reply["data"] == {"custom": "test_data"}


def test_websocket_realtime_upload_notification(
    client: TestClient, sample_png_bytes: bytes
) -> None:
    """Verify that uploading a file triggers an immediate WebSocket broadcast event."""
    with client.websocket_connect("/ws/notifications") as ws:
        # Consume welcome message
        welcome = ws.receive_json()
        assert welcome["event"] == "connected"

        # Trigger file upload via HTTP while WebSocket client is active
        files = {"file": ("stream_photo.png", sample_png_bytes, "image/png")}
        upload_resp = client.post("/api/v1/files/upload", files=files)
        assert upload_resp.status_code == 201
        uploaded_data = upload_resp.json()

        # WebSocket client should receive the real-time notification
        broadcast_msg = ws.receive_json()
        assert broadcast_msg["event"] == "file_uploaded"
        assert "timestamp" in broadcast_msg
        assert broadcast_msg["data"]["id"] == uploaded_data["id"]
        assert broadcast_msg["data"]["original_filename"] == "stream_photo.png"
        assert broadcast_msg["data"]["format"] == "PNG"
        assert broadcast_msg["data"]["thumbnail_url"] == uploaded_data["thumbnail_url"]


def test_websocket_realtime_delete_notification(
    client: TestClient, sample_png_bytes: bytes
) -> None:
    """Verify that deleting a file triggers a WebSocket deletion broadcast."""
    # First upload an image
    files = {"file": ("to_delete.png", sample_png_bytes, "image/png")}
    upload_resp = client.post("/api/v1/files/upload", files=files)
    file_id = upload_resp.json()["id"]

    with client.websocket_connect("/ws/notifications") as ws:
        _ = ws.receive_json()  # Consume welcome

        # Delete image via HTTP
        del_resp = client.delete(f"/api/v1/files/{file_id}")
        assert del_resp.status_code == 200

        # Receive WebSocket deletion broadcast
        broadcast_msg = ws.receive_json()
        assert broadcast_msg["event"] == "file_deleted"
        assert broadcast_msg["data"]["id"] == file_id


def test_websocket_chat_endpoint(client: TestClient) -> None:
    """Verify bidirectional chat WebSocket endpoint join and message broadcasting."""
    with client.websocket_connect("/ws/chat/user_alice") as ws:
        # 1. Should receive user_joined broadcast
        join_msg = ws.receive_json()
        assert join_msg["event"] == "user_joined"
        assert join_msg["data"]["client_id"] == "user_alice"

        # 2. Send chat message
        ws.send_text('{"message": "Hello everyone!"}')
        chat_msg = ws.receive_json()
        assert chat_msg["event"] == "chat_message"
        assert chat_msg["data"]["sender"] == "user_alice"
        assert chat_msg["data"]["message"] == "Hello everyone!"


def test_manual_broadcast_endpoint(client: TestClient) -> None:
    """Verify administrative REST broadcast endpoint dispatches to connected clients."""
    with client.websocket_connect("/ws/notifications") as ws:
        _ = ws.receive_json()  # Consume welcome

        # Post broadcast trigger
        post_resp = client.post(
            "/ws/broadcast",
            params={"event": "server_maintenance", "message": "Down for 5 mins"},
        )
        assert post_resp.status_code == 200
        assert post_resp.json()["clients_reached"] >= 1

        # Receive message on WS
        msg = ws.receive_json()
        assert msg["event"] == "server_maintenance"
        assert msg["data"]["message"] == "Down for 5 mins"


async def test_connection_manager_dead_connection_pruning() -> None:
    """Verify ConnectionManager safely prunes dead connections during broadcast."""
    mock_ws = AsyncMock()
    mock_ws.send_json.side_effect = RuntimeError("Socket disconnected")

    manager = ws_manager
    manager.active_connections.append(mock_ws)
    manager.client_info[mock_ws] = {"client_id": "mock_dead"}

    # Broadcast should catch error and remove dead connection
    successful = await manager.broadcast("ping", {"test": True})
    assert successful == 0
    assert mock_ws not in manager.active_connections


def test_websocket_plain_text_notifications(client: TestClient) -> None:
    """Verify plain string handling when client sends non-JSON text."""
    with client.websocket_connect("/ws/notifications") as ws:
        _ = ws.receive_json()
        ws.send_text("raw non json string")
        reply = ws.receive_json()
        assert reply["event"] == "message_received"
        assert reply["data"] == {"raw": "raw non json string"}


def test_websocket_chat_plain_text(client: TestClient) -> None:
    """Verify plain string chat broadcasting."""
    with client.websocket_connect("/ws/chat/charlie") as ws:
        _ = ws.receive_json()  # Consume user_joined
        ws.send_text("just simple text")
        msg = ws.receive_json()
        assert msg["event"] == "chat_message"
        assert msg["data"]["message"] == "just simple text"


async def test_connection_manager_send_personal_error() -> None:
    """Verify send_personal_json catches errors and returns False."""
    mock_ws = AsyncMock()
    mock_ws.send_json.side_effect = Exception("Write error")

    manager = ws_manager
    manager.active_connections.append(mock_ws)
    success = await manager.send_personal_json({"ping": 1}, mock_ws)
    assert success is False
    assert mock_ws not in manager.active_connections

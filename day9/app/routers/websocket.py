"""WebSocket router for live notifications, health status, and bidirectional chat."""

import json
import uuid
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.notification_service import NotificationService
from app.websocket.connection_manager import ws_manager

websocket_router = APIRouter(tags=["WebSockets"])


@websocket_router.get(
    "/ws/status",
    summary="Check WebSocket service status and active connection count",
    description="Returns total active connections and metadata of connected clients.",
)
async def get_websocket_status() -> dict[str, Any]:
    """Return active connection count and connected clients metadata."""
    return {
        "status": "healthy",
        "active_connections": ws_manager.get_active_count(),
        "clients": ws_manager.get_clients_summary(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@websocket_router.post(
    "/ws/broadcast",
    summary="Manually trigger a broadcast event to all clients",
    description="Sends a broadcast event to all connected WebSocket subscribers.",
)
async def trigger_broadcast(
    event: str = "custom_alert", message: str = "Hello everyone!"
) -> dict[str, Any]:
    """REST endpoint to trigger manual broadcast for testing and admin actions."""
    clients_reached = await NotificationService.broadcast_alert(message=message, event=event)
    return {
        "message": "Broadcast sent successfully",
        "clients_reached": clients_reached,
    }


@websocket_router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint for receiving real-time upload, resize, and delete notifications."""
    client_id = f"subscriber-{uuid.uuid4().hex[:8]}"
    await ws_manager.connect(websocket, client_id=client_id)

    # Send welcome / subscription acknowledgement
    await ws_manager.send_personal_json(
        {
            "event": "connected",
            "message": "Subscribed to live image notifications.",
            "client_id": client_id,
            "active_clients": ws_manager.get_active_count(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        websocket,
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_json = json.loads(data)
                if msg_json.get("action") == "ping" or msg_json.get("type") == "ping":
                    await ws_manager.send_personal_json(
                        {
                            "event": "pong",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                        websocket,
                    )
                else:
                    await ws_manager.send_personal_json(
                        {
                            "event": "message_received",
                            "data": msg_json,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                        websocket,
                    )
            except Exception:
                # Client sent non-JSON raw text
                await ws_manager.send_personal_json(
                    {
                        "event": "message_received",
                        "data": {"raw": data},
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                    websocket,
                )
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@websocket_router.websocket("/ws/chat/{client_id}")
async def websocket_chat_endpoint(websocket: WebSocket, client_id: str) -> None:
    """Bidirectional interactive chat endpoint for pair programming and collaboration."""
    await ws_manager.connect(websocket, client_id=client_id)

    # Notify others that client joined
    await ws_manager.broadcast(
        event="user_joined",
        data={
            "client_id": client_id,
            "message": f"User {client_id} joined the room.",
        },
    )

    try:
        while True:
            text = await websocket.receive_text()
            try:
                chat_data = json.loads(text)
                msg_text = chat_data.get("message", text)
            except Exception:
                msg_text = text

            # Echo broadcast to all connected clients
            await ws_manager.broadcast(
                event="chat_message",
                data={
                    "sender": client_id,
                    "message": msg_text,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        await ws_manager.broadcast(
            event="user_left",
            data={
                "client_id": client_id,
                "message": f"User {client_id} left the room.",
            },
        )

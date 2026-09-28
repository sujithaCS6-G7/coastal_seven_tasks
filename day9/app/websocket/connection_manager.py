"""WebSocket connection manager for real-time notifications and chat."""

import logging
from datetime import datetime, timezone
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections, heartbeats, and broadcasts."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []
        self.client_info: dict[WebSocket, dict[str, Any]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str = "anonymous",
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Accept WebSocket connection and register client metadata."""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_info[websocket] = {
            "client_id": client_id,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {},
        }
        logger.info(f"WebSocket client connected: {client_id} (Total: {len(self.active_connections)})")

    def disconnect(self, websocket: WebSocket) -> None:
        """Unregister closed WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        client = self.client_info.pop(websocket, None)
        client_id = client.get("client_id", "unknown") if client else "unknown"
        logger.info(f"WebSocket client disconnected: {client_id} (Remaining: {len(self.active_connections)})")

    async def send_personal_json(self, message: dict[str, Any], websocket: WebSocket) -> bool:
        """Send JSON message to a specific connected WebSocket client."""
        try:
            await websocket.send_json(message)
            return True
        except Exception as exc:
            logger.warning(f"Error sending message to client: {exc}")
            self.disconnect(websocket)
            return False

    async def broadcast(self, event: str, data: dict[str, Any]) -> int:
        """Broadcast an event payload to all currently connected WebSocket clients."""
        if not self.active_connections:
            return 0

        payload = {
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }

        disconnected: list[WebSocket] = []
        sent_count = 0

        for connection in list(self.active_connections):
            try:
                await connection.send_json(payload)
                sent_count += 1
            except Exception as exc:
                logger.warning(f"Failed to broadcast to a connection: {exc}")
                disconnected.append(connection)

        for stale in disconnected:
            self.disconnect(stale)

        return sent_count

    def get_active_count(self) -> int:
        """Return total count of active WebSocket subscribers."""
        return len(self.active_connections)

    def get_clients_summary(self) -> list[dict[str, Any]]:
        """Return summary of all currently connected clients."""
        return list(self.client_info.values())


# Singleton instance
manager = ConnectionManager()
ws_manager = manager

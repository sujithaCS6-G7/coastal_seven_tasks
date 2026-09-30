"""WebSocket notification dispatch service."""

from typing import Any
from app.websocket.connection_manager import ws_manager


class NotificationService:
    """Dispatches asynchronous broadcast notifications to subscribed WebSocket clients."""

    @staticmethod
    async def notify_upload(data: dict[str, Any]) -> int:
        """Broadcast file upload event."""
        return await ws_manager.broadcast(event="file_uploaded", data=data)

    @staticmethod
    async def notify_delete(file_id: str) -> int:
        """Broadcast file deletion event."""
        return await ws_manager.broadcast(event="file_deleted", data={"id": file_id})

    @staticmethod
    async def broadcast_alert(message: str, event: str = "custom_alert") -> int:
        """Broadcast arbitrary alert to all subscribers."""
        return await ws_manager.broadcast(event=event, data={"message": message})

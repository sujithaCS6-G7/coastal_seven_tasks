"""Order service managing checkout, stock deduction, Celery emails & WebSocket updates."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, WebSocket, status
from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderCreate, OrderOut
from app.tasks.email_tasks import send_order_confirmation_email
from app.utils.redis_client import redis_manager

logger = logging.getLogger(__name__)


class WebSocketOrderManager:
    """Manages WebSocket client connections and order event broadcasts."""

    def __init__(self):
        # Maps user_id -> list of active WebSocket connections
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept and register client connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket client connected for user {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove disconnected client connection."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket client disconnected for user {user_id}")

    async def send_order_update(self, user_id: int, payload: dict[str, Any]):
        """Send order event to user's connected WebSocket clients."""
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(payload, default=str))
                except Exception:
                    dead_connections.append(connection)

            for dead in dead_connections:
                self.disconnect(dead, user_id)

    def get_active_count(self) -> int:
        """Count total connected WebSocket clients."""
        return sum(len(conns) for conns in self.active_connections.values())


ws_order_manager = WebSocketOrderManager()


class OrderService:
    """Core logic for checkout, stock management, and order notifications."""

    @staticmethod
    async def checkout(db: Session, user: User, data: OrderCreate) -> Order:
        """Checkout current user's Redis cart and create order with stock deduction."""
        cart = redis_manager.get_cart(user.id)
        if not cart["items"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty. Add products to cart before checkout.",
            )

        # 1. Validate stock availability for all cart items atomically
        products_to_update: list[tuple[Product, int]] = []
        for item in cart["items"]:
            product = db.query(Product).filter(Product.id == item["product_id"]).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {item['product_id']} no longer exists.",
                )
            if product.stock < item["quantity"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}'. Requested: {item['quantity']}, Available: {product.stock}.",
                )
            products_to_update.append((product, item["quantity"]))

        # 2. Deduct stock from database
        for product, quantity in products_to_update:
            product.stock -= quantity

        # 3. Create Order record
        order_number = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        order = Order(
            order_number=order_number,
            user_id=user.id,
            total_amount=cart["total_price"],
            status="CONFIRMED",
            shipping_address=data.shipping_address,
        )
        db.add(order)
        db.flush()  # Generate order.id

        # 4. Create OrderItem records
        for item in cart["items"]:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item["product_id"],
                product_name=item["name"],
                quantity=item["quantity"],
                unit_price=item["price"],
                total_price=item["subtotal"],
            )
            db.add(order_item)

        db.commit()
        db.refresh(order)

        # 5. Clear shopping cart in Redis
        redis_manager.clear_cart(user.id)

        # 6. Invalidate product catalog cache (inventory changed)
        redis_manager.invalidate_product_cache()

        # 7. Trigger Celery email background task safely
        try:
            send_order_confirmation_email.delay(
                order_id=order.id,
                user_email=user.email,
                total_amount=order.total_amount,
                order_number=order.order_number,
            )
        except Exception as exc:
            logger.warning(f"Could not dispatch Celery task: {exc}")

        # 8. Broadcast order update over WebSocket
        event_payload = {
            "event": "ORDER_CREATED",
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": order.total_amount,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await ws_order_manager.send_order_update(user.id, event_payload)

        return order

    @staticmethod
    def get_user_orders(db: Session, user: User) -> list[Order]:
        """Retrieve all orders placed by the current user."""
        return (
            db.query(Order)
            .filter(Order.user_id == user.id)
            .order_by(Order.created_at.desc())
            .all()
        )

    @staticmethod
    def get_order_by_id(db: Session, order_id: int, user: User) -> Order:
        """Retrieve order details if user is owner or administrator."""
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID {order_id} not found.",
            )
        if order.user_id != user.id and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order.",
            )
        return order

    @staticmethod
    async def update_order_status(
        db: Session, order_id: int, new_status: str, admin_user: User
    ) -> Order:
        """Update order lifecycle status and push WebSocket alert."""
        allowed_statuses = {
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
        }
        status_upper = new_status.upper()
        if status_upper not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{new_status}'. Allowed: {', '.join(allowed_statuses)}",
            )

        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID {order_id} not found.",
            )

        order.status = status_upper
        db.commit()
        db.refresh(order)

        # Broadcast status update to user via WebSocket
        event_payload = {
            "event": "ORDER_STATUS_UPDATED",
            "order_number": order.order_number,
            "status": order.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await ws_order_manager.send_order_update(order.user_id, event_payload)

        return order

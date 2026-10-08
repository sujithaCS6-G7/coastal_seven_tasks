"""Orders router for checkout, order history, and lifecycle status management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.order import AdminOrderOut, OrderCreate, OrderOut, OrderStatusUpdate
from app.services.auth_service import get_current_admin, get_current_user
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders & Checkout"])


@router.post(
    "/checkout",
    response_model=OrderOut,
    status_code=status.HTTP_201_CREATED,
    summary="Checkout Cart & Place Order",
)
async def checkout_cart(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Place order from user's Redis cart with stock verification, Celery email, and WebSockets."""
    return await OrderService.checkout(db, user=current_user, data=data)


@router.get(
    "/",
    response_model=list[OrderOut],
    summary="List My Orders",
)
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all purchase orders placed by the current user."""
    return OrderService.get_user_orders(db, user=current_user)


@router.get(
    "/admin/all",
    response_model=list[AdminOrderOut],
    summary="List All Customer Orders (Admin Only)",
)
def list_all_customer_orders(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Retrieve all customer purchase orders across the platform for Administrator inspection."""
    return OrderService.get_all_orders(db)


@router.get(
    "/{order_id}",
    response_model=OrderOut,
    summary="Get Order Details",
)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve specific order details (requires owner or admin access)."""
    return OrderService.get_order_by_id(db, order_id=order_id, user=current_user)


@router.put(
    "/{order_id}/status",
    response_model=OrderOut,
    summary="Update Order Status (Admin Only)",
)
async def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update order delivery status and broadcast notification over WebSockets."""
    return await OrderService.update_order_status(
        db, order_id=order_id, new_status=data.status, admin_user=admin
    )

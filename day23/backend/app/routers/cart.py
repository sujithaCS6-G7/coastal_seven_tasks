"""Cart router for Redis-backed temporary shopping cart operations."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartOut
from app.services.auth_service import get_current_user
from app.services.cart_service import CartService

router = APIRouter(prefix="/cart", tags=["Redis Shopping Cart"])


@router.get(
    "/",
    response_model=CartOut,
    summary="Get Current User's Cart",
)
def get_cart(current_user: User = Depends(get_current_user)):
    """Retrieve shopping cart stored in Redis for authenticated user."""
    return CartService.get_cart(current_user.id)


@router.post(
    "/items",
    response_model=CartOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add Product to Cart",
)
def add_to_cart(
    item: CartItemAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add item to Redis shopping cart after validating stock in PostgreSQL."""
    return CartService.add_to_cart(
        db, user_id=current_user.id, product_id=item.product_id, quantity=item.quantity
    )


@router.put(
    "/items/{product_id}",
    response_model=CartOut,
    summary="Update Cart Item Quantity",
)
def update_quantity(
    product_id: int,
    item: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update quantity of an existing item in the shopping cart."""
    return CartService.update_quantity(
        db, user_id=current_user.id, product_id=product_id, quantity=item.quantity
    )


@router.delete(
    "/items/{product_id}",
    response_model=CartOut,
    summary="Remove Item from Cart",
)
def remove_from_cart(
    product_id: int,
    current_user: User = Depends(get_current_user),
):
    """Delete an item line from the user's shopping cart in Redis."""
    return CartService.remove_item(user_id=current_user.id, product_id=product_id)


@router.delete(
    "/",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear Shopping Cart",
)
def clear_cart(current_user: User = Depends(get_current_user)):
    """Completely empty the user's shopping cart in Redis."""
    CartService.clear_cart(user_id=current_user.id)

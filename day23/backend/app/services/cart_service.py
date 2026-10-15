"""Cart service managing Redis-backed shopping carts with stock validation."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.cart import CartOut
from app.utils.redis_client import redis_manager


class CartService:
    """Business logic for shopping cart operations backed by Redis."""

    @staticmethod
    def get_cart(user_id: int) -> CartOut:
        """Fetch active shopping cart from Redis."""
        cart_data = redis_manager.get_cart(user_id)
        return CartOut(**cart_data)

    @staticmethod
    def add_to_cart(
        db: Session, user_id: int, product_id: int, quantity: int
    ) -> CartOut:
        """Add product to Redis cart after stock verification."""
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} does not exist.",
            )

        if product.stock <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is currently out of stock.",
            )

        # Check total quantity doesn't exceed available stock
        current_cart = redis_manager.get_cart(user_id)
        existing_item = next(
            (i for i in current_cart["items"] if i["product_id"] == product_id), None
        )
        total_requested = quantity + (existing_item["quantity"] if existing_item else 0)

        if total_requested > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add {quantity} items. Available stock: {product.stock}, in cart: {existing_item['quantity'] if existing_item else 0}.",
            )

        cart_data = redis_manager.add_to_cart(
            user_id=user_id,
            product_id=product.id,
            quantity=quantity,
            product_name=product.name,
            price=product.price,
            image_url=product.image_url,
        )
        return CartOut(**cart_data)

    @staticmethod
    def update_quantity(
        db: Session, user_id: int, product_id: int, quantity: int
    ) -> CartOut:
        """Update quantity of an existing cart item."""
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found.",
            )

        if quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot set quantity to {quantity}. Only {product.stock} items in stock.",
            )

        cart_data = redis_manager.update_cart_quantity(user_id, product_id, quantity)
        return CartOut(**cart_data)

    @staticmethod
    def remove_item(user_id: int, product_id: int) -> CartOut:
        """Remove item from cart."""
        cart_data = redis_manager.remove_from_cart(user_id, product_id)
        return CartOut(**cart_data)

    @staticmethod
    def clear_cart(user_id: int) -> None:
        """Empty the user's cart."""
        redis_manager.clear_cart(user_id)

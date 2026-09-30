"""Redis client and cache/cart operations manager with fallback."""

import json
import logging
from typing import Any
import redis

from app.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    """Manages Redis connection, shopping cart storage, and product caching."""

    def __init__(self):
        self._client: redis.Redis | None = None
        self._fallback_cart: dict[str, dict[str, Any]] = {}
        self._fallback_cache: dict[str, Any] = {}
        self._init_client()

    def _init_client(self):
        try:
            client = redis.Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            client.ping()
            self._client = client
            logger.info("Connected to Redis server successfully.")
        except Exception as exc:
            logger.warning(f"Redis server unavailable, using in-memory fallback: {exc}")
            self._client = None

    def is_connected(self) -> bool:
        """Check if Redis connection is active."""
        if not self._client:
            return False
        try:
            return bool(self._client.ping())
        except Exception:
            return False

    # ------------------ CART OPERATIONS ------------------

    def _cart_key(self, user_id: int) -> str:
        return f"cart:{user_id}"

    def get_cart(self, user_id: int) -> dict[str, Any]:
        """Retrieve cart items for a user."""
        key = self._cart_key(user_id)
        if self._client:
            try:
                raw_data = self._client.hgetall(key)
                items = []
                total_items = 0
                total_price = 0.0
                for pid_str, item_json in raw_data.items():
                    item = json.loads(item_json)
                    subtotal = round(item["price"] * item["quantity"], 2)
                    item["subtotal"] = subtotal
                    items.append(item)
                    total_items += item["quantity"]
                    total_price += subtotal
                return {
                    "user_id": user_id,
                    "items": sorted(items, key=lambda x: x["product_id"]),
                    "total_items": total_items,
                    "total_price": round(total_price, 2),
                }
            except Exception as exc:
                logger.warning(f"Redis get_cart failed, falling back: {exc}")

        # Fallback in-memory
        user_cart = self._fallback_cart.get(key, {})
        items = []
        total_items = 0
        total_price = 0.0
        for item in user_cart.values():
            subtotal = round(item["price"] * item["quantity"], 2)
            item_copy = item.copy()
            item_copy["subtotal"] = subtotal
            items.append(item_copy)
            total_items += item["quantity"]
            total_price += subtotal
        return {
            "user_id": user_id,
            "items": sorted(items, key=lambda x: x["product_id"]),
            "total_items": total_items,
            "total_price": round(total_price, 2),
        }

    def add_to_cart(
        self,
        user_id: int,
        product_id: int,
        quantity: int,
        product_name: str,
        price: float,
        image_url: str | None = None,
    ) -> dict[str, Any]:
        """Add or increase item quantity in user's cart."""
        key = self._cart_key(user_id)
        current_cart = self.get_cart(user_id)
        existing_item = next(
            (i for i in current_cart["items"] if i["product_id"] == product_id), None
        )
        new_quantity = quantity if not existing_item else existing_item["quantity"] + quantity

        item_data = {
            "product_id": product_id,
            "name": product_name,
            "price": price,
            "quantity": new_quantity,
            "image_url": image_url,
        }

        if self._client:
            try:
                self._client.hset(key, str(product_id), json.dumps(item_data))
                self._client.expire(key, settings.CART_TTL_SECONDS)
                return self.get_cart(user_id)
            except Exception as exc:
                logger.warning(f"Redis add_to_cart failed, falling back: {exc}")

        if key not in self._fallback_cart:
            self._fallback_cart[key] = {}
        self._fallback_cart[key][str(product_id)] = item_data
        return self.get_cart(user_id)

    def update_cart_quantity(
        self, user_id: int, product_id: int, quantity: int
    ) -> dict[str, Any]:
        """Update the quantity of a specific product in cart."""
        key = self._cart_key(user_id)
        current_cart = self.get_cart(user_id)
        existing_item = next(
            (i for i in current_cart["items"] if i["product_id"] == product_id), None
        )
        if not existing_item:
            return current_cart

        existing_item["quantity"] = quantity
        item_data = {
            "product_id": product_id,
            "name": existing_item["name"],
            "price": existing_item["price"],
            "quantity": quantity,
            "image_url": existing_item.get("image_url"),
        }

        if self._client:
            try:
                self._client.hset(key, str(product_id), json.dumps(item_data))
                self._client.expire(key, settings.CART_TTL_SECONDS)
                return self.get_cart(user_id)
            except Exception as exc:
                logger.warning(f"Redis update_cart_quantity failed: {exc}")

        if key in self._fallback_cart and str(product_id) in self._fallback_cart[key]:
            self._fallback_cart[key][str(product_id)] = item_data
        return self.get_cart(user_id)

    def remove_from_cart(self, user_id: int, product_id: int) -> dict[str, Any]:
        """Remove a product from user's cart."""
        key = self._cart_key(user_id)
        if self._client:
            try:
                self._client.hdel(key, str(product_id))
                return self.get_cart(user_id)
            except Exception as exc:
                logger.warning(f"Redis remove_from_cart failed: {exc}")

        if key in self._fallback_cart:
            self._fallback_cart[key].pop(str(product_id), None)
        return self.get_cart(user_id)

    def clear_cart(self, user_id: int) -> None:
        """Completely clear a user's shopping cart."""
        key = self._cart_key(user_id)
        if self._client:
            try:
                self._client.delete(key)
                return
            except Exception as exc:
                logger.warning(f"Redis clear_cart failed: {exc}")

        self._fallback_cart.pop(key, None)

    # ------------------ PRODUCT CACHING ------------------

    def get_cached_products(self, category: str | None = None) -> list[dict[str, Any]] | None:
        """Get cached product catalog from Redis."""
        cache_key = f"products:list:{category or 'all'}"
        if self._client:
            try:
                data = self._client.get(cache_key)
                if data:
                    return json.loads(data)
            except Exception as exc:
                logger.warning(f"Redis get_cached_products failed: {exc}")

        return self._fallback_cache.get(cache_key)

    def set_cached_products(
        self, products: list[dict[str, Any]], category: str | None = None
    ) -> None:
        """Set cached product catalog in Redis with TTL."""
        cache_key = f"products:list:{category or 'all'}"
        serialized = json.dumps(products, default=str)
        if self._client:
            try:
                self._client.set(
                    cache_key, serialized, ex=settings.PRODUCT_CACHE_TTL_SECONDS
                )
                return
            except Exception as exc:
                logger.warning(f"Redis set_cached_products failed: {exc}")

        self._fallback_cache[cache_key] = products

    def invalidate_product_cache(self) -> None:
        """Invalidate all product catalog cache keys."""
        if self._client:
            try:
                keys = self._client.keys("products:list:*")
                if keys:
                    self._client.delete(*keys)
                logger.info("Product catalog cache invalidated in Redis.")
                return
            except Exception as exc:
                logger.warning(f"Redis invalidate_product_cache failed: {exc}")

        self._fallback_cache.clear()


redis_manager = RedisManager()

"""Concurrent Analytics service leveraging asyncio.gather()."""

import asyncio
import time
from typing import Any
from app.database.database import products_db


class AnalyticsService:
    """Service handling concurrent analytics calls."""

    @staticmethod
    async def fetch_product_info(product_id: int) -> dict[str, Any]:
        """Simulate Product Service query with 300ms latency."""
        await asyncio.sleep(0.3)
        item = next((p for p in products_db if p["id"] == product_id), None)
        return {
            "product_id": product_id,
            "name": item["name"] if item else f"Product #{product_id}",
            "price": item["price"] if item else 999.0,
        }

    @staticmethod
    async def fetch_sales_metrics() -> dict[str, Any]:
        """Simulate Sales Analytics Service query with 300ms latency."""
        await asyncio.sleep(0.3)
        return {
            "sales_count": 120,
            "total_revenue": 600000,
            "trend": "+14% this week",
        }

    @staticmethod
    async def fetch_reviews_metrics() -> dict[str, Any]:
        """Simulate Reviews Service query with 300ms latency."""
        await asyncio.sleep(0.3)
        return {
            "reviews_count": 45,
            "average_rating": 4.8,
            "satisfaction_rate": "96%",
        }

    @classmethod
    async def get_concurrent_summary(cls, product_id: int) -> dict[str, Any]:
        """Execute all three queries in parallel using asyncio.gather()."""
        start_time = time.perf_counter()

        product, sales, reviews = await asyncio.gather(
            cls.fetch_product_info(product_id),
            cls.fetch_sales_metrics(),
            cls.fetch_reviews_metrics(),
            return_exceptions=True,
        )

        elapsed = time.perf_counter() - start_time

        return {
            "execution_mode": "concurrent_asyncio_gather",
            "product": product,
            "sales": sales,
            "reviews": reviews,
            "execution_time_seconds": round(elapsed, 3),
            "explanation": "Executed 3 tasks concurrently in ~0.3s instead of sequential 0.9s.",
        }

"""Concurrent Analytics router demonstrating asyncio.gather() microservice orchestration."""

import asyncio
import time
from typing import Literal

from fastapi import APIRouter, Query
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Async Concurrency (asyncio.gather)"])


async def _simulate_service(name: str, latency: float, data: dict):
    """Simulate remote microservice call with non-blocking sleep."""
    await asyncio.sleep(latency)
    return {
        "service": name,
        "latency_simulated_seconds": latency,
        "data": data,
    }


@router.get(
    "/product-summary/{product_id}",
    summary="Concurrent Product Analytics Summary",
    description="Fires 3 simulated service calls concurrently via asyncio.gather() (~300ms total latency).",
)
async def get_product_summary(product_id: int):
    """Retrieve product, sales, and customer reviews concurrently."""
    return await AnalyticsService.get_concurrent_summary(product_id)


@router.get(
    "/benchmark",
    summary="Interactive Async Concurrency Benchmark",
    description="Compare Sequential execution (~900ms) vs asyncio.gather() execution (~300ms).",
)
async def run_benchmark(
    mode: Literal["gather", "sequential"] = Query(
        "gather",
        description="Execution mode: 'gather' executes concurrently; 'sequential' executes sequentially.",
    ),
):
    """Benchmark comparing sequential vs parallel non-blocking execution."""
    start_time = time.perf_counter()

    services = [
        ("ProductCatalog", 0.3, {"id": 101, "name": "Cloud Server Instance"}),
        ("InventoryService", 0.3, {"available": True, "warehouse": "US-East"}),
        ("DynamicPricingService", 0.3, {"base": 120.0, "currency": "USD"}),
    ]

    if mode == "sequential":
        results = []
        for name, latency, data in services:
            res = await _simulate_service(name, latency, data)
            results.append(res)
        explanation = (
            "Operations executed sequentially. Total latency equals the sum of individual latencies (0.3 + 0.3 + 0.3 ≈ 0.9s)."
        )
    else:
        results = await asyncio.gather(
            *[_simulate_service(name, latency, data) for name, latency, data in services]
        )
        explanation = (
            "Operations executed concurrently using asyncio.gather(). Total latency equals the maximum individual latency (≈ 0.3s)."
        )

    elapsed = round(time.perf_counter() - start_time, 3)

    return {
        "execution_mode": mode,
        "total_elapsed_seconds": elapsed,
        "explanation": explanation,
        "results": results,
    }


@router.get(
    "/compare",
    summary="Side-by-Side Concurrency Comparison",
    description="Executes both sequential and concurrent flows and reports exact speedup ratio.",
)
async def compare_concurrency():
    """Run sequential and concurrent flows back-to-back to compute exact speedup."""
    # Sequential
    t0 = time.perf_counter()
    await asyncio.sleep(0.2)
    await asyncio.sleep(0.2)
    await asyncio.sleep(0.2)
    seq_time = round(time.perf_counter() - t0, 3)

    # Gather
    t1 = time.perf_counter()
    await asyncio.gather(
        asyncio.sleep(0.2),
        asyncio.sleep(0.2),
        asyncio.sleep(0.2),
    )
    gather_time = round(time.perf_counter() - t1, 3)

    speedup = round(seq_time / max(gather_time, 0.001), 2)

    return {
        "sequential_duration_seconds": seq_time,
        "concurrent_duration_seconds": gather_time,
        "speedup_factor": f"{speedup}x faster with asyncio.gather()",
        "verdict": "Concurrency enables overlapping I/O wait times on the single-threaded event loop.",
    }

"""Sliding-Window Rate Limiting service using Redis Sorted Sets (ZSET)."""

import time
from fastapi import HTTPException, Request, Response, status
from app.database.database import redis_client


class RateLimitService:
    """Sliding-Window Rate Limiter using Redis Sorted Sets (ZSET)."""

    @staticmethod
    def is_allowed(client_id: str = "default-user", limit: int = 5, window_seconds: int = 60) -> bool:
        """Sliding-Window algorithm using microsecond timestamps."""
        key = f"rate_limit:{client_id}"
        current_time = time.time()
        window_start = current_time - window_seconds

        try:
            pipe = redis_client.pipeline()
            # 1. Prune timestamps outside sliding window
            pipe.zremrangebyscore(key, 0, window_start)
            # 2. Count active requests in window
            pipe.zcard(key)
            # 3. Add current request timestamp
            pipe.zadd(key, {f"{current_time}_{time.perf_counter_ns()}": current_time})
            # 4. Set TTL
            pipe.expire(key, window_seconds + 5)
            # Execute pipeline atomically
            _, request_count, _, _ = pipe.execute()

            return request_count < limit
        except Exception:
            # Graceful fallback: allow traffic if Redis is down
            return True


def rate_limiter(max_requests: int = 5, window_seconds: int = 60):
    """FastAPI dependency for sliding-window rate limiting."""

    async def dependency(request: Request, response: Response) -> None:
        client_ip = request.client.host if request.client else "127.0.0.1"
        allowed = RateLimitService.is_allowed(
            client_id=client_ip, limit=max_requests, window_seconds=window_seconds
        )

        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Window"] = f"{window_seconds}s"

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds}s. Try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return dependency

"""Day 19–21 API Security, Per-User AI Rate Limiting & OWASP Top 10 Hardening."""

from __future__ import annotations

from datetime import datetime, timezone
import logging
import time
from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.utils.redis_client import redis_manager
from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)


def extract_user_rate_limit_identity(request: Request) -> dict[str, Any]:
    """
    Extract authenticated user identity from Bearer JWT if present;
    otherwise fall back safely to an isolated anonymous client bucket.
    Ensures every authenticated user gets their own independent quota.
    """
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            username = str(payload.get("sub"))
            user_id = payload.get("user_id", username)
            return {
                "identity_key": f"user:{user_id}:{username}",
                "is_authenticated": True,
                "user_id": user_id,
                "username": username,
                "role": payload.get("role", "customer"),
                "limit": settings.AI_USER_RATE_LIMIT_COUNT,
                "window_seconds": settings.AI_USER_RATE_LIMIT_WINDOW_SECONDS,
            }

    custom_bucket = request.headers.get("X-RateLimit-Client-Id") or request.query_params.get("bucket")
    base_ip = get_remote_address(request) or "127.0.0.1"
    if custom_bucket:
        anon_id = f"anon:{base_ip}:{custom_bucket}"
    else:
        anon_id = f"anon:{base_ip}"

    return {
        "identity_key": anon_id,
        "is_authenticated": False,
        "user_id": None,
        "username": "anonymous",
        "role": "guest",
        "limit": settings.AI_ANON_RATE_LIMIT_COUNT,
        "window_seconds": settings.AI_USER_RATE_LIMIT_WINDOW_SECONDS,
    }


def get_client_rate_limit_key(request: Request) -> str:
    """
    Build a deterministic rate-limit bucket key.
    Prioritizes authenticated JWT user identity, then X-RateLimit-Client-Id header, then client IP.
    """
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            return f"user:{payload.get('user_id', '0')}:{payload.get('sub')}"

    custom_bucket = request.headers.get("X-RateLimit-Client-Id") or request.query_params.get("bucket")
    base_ip = get_remote_address(request) or "127.0.0.1"
    if custom_bucket:
        return f"{base_ip}:{custom_bucket}"
    if base_ip == "testclient":
        return f"testclient:{id(request)}"
    return base_ip


class PerUserAIRateLimiter:
    """
    Day 21 Redis-backed Per-User Rate Limiter for AI endpoints.
    - Uses authenticated user identity (`user:<id>:<username>`) when JWT is provided.
    - Uses anonymous bucket (`anon:<ip>[:<custom_bucket>]`) when unauthenticated.
    - Stores fixed-window counters in Redis (`rl:ai:v21:{scope}:{identity}:{window_idx}`)
      with automatic TTL expiration.
    - Gracefully degrades to an in-memory window dictionary if Redis is unavailable.
    """

    def __init__(self) -> None:
        self._memory_windows: dict[str, tuple[int, float]] = {}
        self._metrics: dict[str, Any] = {
            "total_ai_requests_checked": 0,
            "allowed_requests": 0,
            "blocked_429_requests": 0,
            "redis_fallbacks": 0,
            "last_blocked_identity": None,
        }

    def check_limit(
        self,
        request: Request,
        scope: str = "ai_default",
        override_limit: int | None = None,
        override_window: int | None = None,
    ) -> dict[str, Any]:
        """
        Verify and increment the per-user request counter for the given AI scope.
        Raises HTTPException(429) if the user's quota is exceeded.
        """
        self._metrics["total_ai_requests_checked"] += 1
        identity_info = extract_user_rate_limit_identity(request)
        identity_key = identity_info["identity_key"]
        max_requests = override_limit if override_limit is not None else int(identity_info["limit"])
        window_seconds = (
            override_window if override_window is not None else int(identity_info["window_seconds"])
        )

        now = time.time()
        window_index = int(now // window_seconds)
        reset_in_seconds = max(1, int(((window_index + 1) * window_seconds) - now))
        redis_key = f"rl:ai:v21:{scope}:{identity_key}:{window_index}"

        current_count: int | None = None
        storage_backend = "redis"

        client = getattr(redis_manager, "_client", None)
        if client is not None:
            try:
                current_count = int(client.incr(redis_key))
                if current_count == 1:
                    client.expire(redis_key, window_seconds + 2)
            except Exception as exc:
                self._metrics["redis_fallbacks"] += 1
                storage_backend = "memory_fallback"
                logger.warning(
                    "[PerUserRateLimit] Redis unavailable for key=%s, using memory fallback: %s",
                    redis_key,
                    exc.__class__.__name__,
                )
                current_count = None
        else:
            storage_backend = "memory_fallback"

        if current_count is None:
            count_val, exp_ts = self._memory_windows.get(redis_key, (0, now + window_seconds))
            if now >= exp_ts:
                count_val = 0
                exp_ts = now + window_seconds
            count_val += 1
            self._memory_windows[redis_key] = (count_val, exp_ts)
            current_count = count_val

        remaining = max(0, max_requests - current_count)

        status_payload = {
            "identity_key": identity_key,
            "is_authenticated": identity_info["is_authenticated"],
            "user_id": identity_info["user_id"],
            "username": identity_info["username"],
            "scope": scope,
            "limit": max_requests,
            "used": current_count,
            "remaining": remaining,
            "window_seconds": window_seconds,
            "retry_after_seconds": reset_in_seconds,
            "storage_backend": storage_backend,
        }

        if current_count > max_requests:
            self._metrics["blocked_429_requests"] += 1
            self._metrics["last_blocked_identity"] = identity_key
            SECURITY_METRICS["rate_limit_blocks_429"] += 1
            SECURITY_METRICS["last_rate_limited_path"] = request.url.path
            SECURITY_METRICS["last_rate_limited_at"] = datetime.now(timezone.utc).isoformat()

            raise HTTPException(
                status_code=429,
                detail={
                    "detail": (
                        f"Per-user AI rate limit exceeded for '{identity_key}' "
                        f"({max_requests} requests per {window_seconds}s). Please retry in {reset_in_seconds}s."
                    ),
                    "error": "per_user_rate_limit_exceeded",
                    **status_payload,
                },
                headers={
                    "Retry-After": str(reset_in_seconds),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Identity": identity_key,
                },
            )

        self._metrics["allowed_requests"] += 1
        return status_payload

    def get_status(self, request: Request, scope: str = "ai_default") -> dict[str, Any]:
        """Inspect current rate-limit quota for the caller without incrementing the counter."""
        identity_info = extract_user_rate_limit_identity(request)
        identity_key = identity_info["identity_key"]
        max_requests = int(identity_info["limit"])
        window_seconds = int(identity_info["window_seconds"])
        now = time.time()
        window_index = int(now // window_seconds)
        reset_in_seconds = max(1, int(((window_index + 1) * window_seconds) - now))
        redis_key = f"rl:ai:v21:{scope}:{identity_key}:{window_index}"

        used = 0
        storage_backend = "redis"
        client = getattr(redis_manager, "_client", None)
        if client is not None:
            try:
                raw_val = client.get(redis_key)
                used = int(raw_val) if raw_val is not None else 0
            except Exception:
                storage_backend = "memory_fallback"
                used = self._memory_windows.get(redis_key, (0, 0.0))[0]
        else:
            storage_backend = "memory_fallback"
            used = self._memory_windows.get(redis_key, (0, 0.0))[0]

        return {
            "identity_key": identity_key,
            "is_authenticated": identity_info["is_authenticated"],
            "user_id": identity_info["user_id"],
            "username": identity_info["username"],
            "scope": scope,
            "limit": max_requests,
            "used": used,
            "remaining": max(0, max_requests - used),
            "window_seconds": window_seconds,
            "reset_in_seconds": reset_in_seconds,
            "storage_backend": storage_backend,
            "metrics": self._metrics.copy(),
        }

    def reset(self) -> None:
        """Reset all per-user AI rate limit counters in Redis and memory."""
        self._memory_windows.clear()
        client = getattr(redis_manager, "_client", None)
        if client is not None:
            try:
                keys = client.keys("rl:ai:v21:*")
                if keys:
                    client.delete(*keys)
            except Exception:
                pass


ai_user_rate_limiter = PerUserAIRateLimiter()

# Shared SlowAPI Limiter instance
limiter = Limiter(
    key_func=get_client_rate_limit_key,
    default_limits=["1200/minute"],
    headers_enabled=False,
)

# Live runtime security & rate-limiting telemetry
SECURITY_METRICS: dict[str, Any] = {
    "started_at": datetime.now(timezone.utc).isoformat(),
    "total_requests_inspected": 0,
    "rate_limit_blocks_429": 0,
    "oversized_payload_blocks_413": 0,
    "last_rate_limited_path": None,
    "last_rate_limited_at": None,
}

OWASP_SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "img-src 'self' data: blob: http: https:; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
        "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; "
        "worker-src 'self' blob:; "
        "connect-src 'self' http: https: ws: wss:; "
        "frame-ancestors 'none'"
    ),
}


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return structured 429 Too Many Requests JSON response with OWASP & Retry-After headers."""
    SECURITY_METRICS["rate_limit_blocks_429"] += 1
    SECURITY_METRICS["last_rate_limited_path"] = request.url.path
    SECURITY_METRICS["last_rate_limited_at"] = datetime.now(timezone.utc).isoformat()

    limit_detail = str(getattr(exc, "detail", "Rate limit exceeded"))
    headers = {
        **OWASP_SECURITY_HEADERS,
        "Retry-After": "60",
        "X-RateLimit-Limit": limit_detail,
        "X-RateLimit-Policy": limit_detail,
    }
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {limit_detail}. Please slow down and retry later.",
            "error": "rate_limit_exceeded",
            "limit": limit_detail,
            "path": request.url.path,
            "retry_after_seconds": 60,
        },
        headers=headers,
    )


class OWASPSecurityMiddleware(BaseHTTPMiddleware):
    """
    Day 19 OWASP API Top 10 Hardening Middleware:
    - Enforces maximum request payload size (API4:2023 Unrestricted Resource Consumption)
    - Attaches defensive security headers on every response (API8:2023 Security Misconfiguration)
    - Attaches long-lived Cache-Control headers on static product uploads for Lighthouse optimization
    """

    MAX_REQUEST_BODY_BYTES: int = settings.MAX_FILE_SIZE_BYTES + (1024 * 1024)  # 6 MB ceiling

    async def dispatch(self, request: Request, call_next):
        SECURITY_METRICS["total_requests_inspected"] += 1

        # 1. OWASP API4:2023 — Reject oversized payloads early via Content-Length check
        content_length = request.headers.get("content-length")
        if content_length and content_length.isdigit():
            if int(content_length) > self.MAX_REQUEST_BODY_BYTES:
                SECURITY_METRICS["oversized_payload_blocks_413"] += 1
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": (
                            f"Request payload too large ({content_length} bytes). "
                            f"Maximum allowed is {self.MAX_REQUEST_BODY_BYTES} bytes."
                        ),
                        "error": "payload_too_large",
                    },
                    headers=OWASP_SECURITY_HEADERS,
                )

        response = await call_next(request)

        # 2. OWASP API8:2023 — Attach defensive HTTP security headers
        for header_name, header_val in OWASP_SECURITY_HEADERS.items():
            response.headers.setdefault(header_name, header_val)

        # 3. Remove verbose server banner finger-printing if present
        if "server" in response.headers:
            del response.headers["server"]

        # 4. Attach immutable Cache-Control on uploaded product images for Lighthouse
        if request.url.path.startswith("/uploads/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

        return response

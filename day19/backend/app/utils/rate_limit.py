"""Day 19 API Security & Rate Limiting (SlowAPI + OWASP API Top 10 Hardening)."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


def get_client_rate_limit_key(request: Request) -> str:
    """
    Build a deterministic rate-limit bucket key per client IP and optional bucket scope.
    Allows isolated testing via X-RateLimit-Client-Id header without interfering with other users.
    """
    custom_bucket = request.headers.get("X-RateLimit-Client-Id") or request.query_params.get("bucket")
    base_ip = get_remote_address(request) or "127.0.0.1"
    if custom_bucket:
        return f"{base_ip}:{custom_bucket}"
    if base_ip == "testclient":
        return f"testclient:{id(request)}"
    return base_ip


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

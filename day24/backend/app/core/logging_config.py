"""Day 24: Enterprise Structured JSON Logging Module for AWS CloudWatch & Centralized Aggregation."""

import json
import logging
from datetime import datetime, timezone
import time
from typing import Any, Dict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import uuid


class JsonFormatter(logging.Formatter):
    """Formats log records as structured, single-line JSON objects for AWS CloudWatch."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": getattr(record, "environment", "production"),
            "service": "nexora-backend",
        }

        # Contextual metadata injected via extra={}
        for field in ("request_id", "client_ip", "method", "path", "status_code", "latency_ms", "user_id"):
            if hasattr(record, field):
                log_obj[field] = getattr(record, field)

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)


def configure_structured_logging(level: int = logging.INFO) -> logging.Logger:
    """Configures the root logger with the structured JSON formatter."""
    root_logger = logging.getLogger("nexora")
    root_logger.setLevel(level)

    # Avoid duplicate handlers if reloaded
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        root_logger.addHandler(handler)

    return root_logger


logger = configure_structured_logging()


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """FastAPI Middleware that logs every incoming HTTP request and response in structured JSON."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.perf_counter()

        client_ip = request.client.host if request.client else "unknown"

        response = await call_next(request)

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        # Skip spamming logs for frequent healthcheck pings
        if request.url.path not in {"/health/liveness", "/nginx-health"}:
            logger.info(
                f"{request.method} {request.url.path} responded {response.status_code} in {latency_ms}ms",
                extra={
                    "request_id": request_id,
                    "client_ip": client_ip,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "latency_ms": latency_ms,
                },
            )

        return response

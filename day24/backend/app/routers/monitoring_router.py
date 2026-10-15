"""Day 24: Production Health Checks, Prometheus Metrics, and Sentry Error Diagnostics."""

from datetime import datetime, timezone
import time
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.redis_client import redis_manager
from app.core.sentry import is_sentry_active, capture_exception

router = APIRouter(tags=["Cloud Monitoring, Health & Observability"])

# Prometheus in-memory metric counters
METRICS_DATA = {
    "requests_total": 0,
    "errors_total": 0,
    "ai_requests_total": 0,
    "start_time": time.time(),
}


def increment_metric(metric_name: str, count: int = 1) -> None:
    """Helper to increment in-memory Prometheus metrics."""
    if metric_name in METRICS_DATA:
        METRICS_DATA[metric_name] += count


@router.get(
    "/health/liveness",
    summary="Fast Liveness Check for UptimeRobot & Route53 DNS Failover",
    status_code=status.HTTP_200_OK,
)
def liveness_probe() -> Dict[str, Any]:
    """
    Lightweight ping endpoint that returns 200 OK immediately if FastAPI process is alive.
    Does not touch databases or caches, minimizing overhead for 60s/300s polling.
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - METRICS_DATA["start_time"], 2),
    }


@router.get(
    "/health/readiness",
    summary="Deep Readiness Check for AWS ALB Target Groups & Auto Scaling",
    status_code=status.HTTP_200_OK,
)
def readiness_probe(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Deep readiness check verifying active connections to:
    1. PostgreSQL (SELECT 1 via connection pool)
    2. Redis Cache & Broker (PING command)
    Returns HTTP 200 when ready to receive live user traffic, or HTTP 503 if degraded.
    """
    checks: Dict[str, Any] = {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {},
    }

    # 1. PostgreSQL Check
    try:
        db.execute(text("SELECT 1"))
        checks["components"]["database"] = {"status": "healthy", "type": "PostgreSQL"}
    except Exception as exc:
        checks["status"] = "unhealthy"
        checks["components"]["database"] = {"status": "unhealthy", "error": str(exc)}

    # 2. Redis Check
    try:
        redis_ok = redis_manager.is_connected()
        if redis_ok:
            checks["components"]["redis"] = {"status": "healthy", "type": "Redis"}
        else:
            checks["status"] = "degraded"
            checks["components"]["redis"] = {"status": "unhealthy", "warning": "Redis ping failed"}
    except Exception as exc:
        checks["status"] = "degraded"
        checks["components"]["redis"] = {"status": "unhealthy", "error": str(exc)}

    if checks["status"] == "unhealthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=checks,
        )

    return checks


@router.get(
    "/metrics",
    summary="Prometheus Text-Format Metrics Exporter Endpoint",
    response_class=Response,
)
def prometheus_metrics(db: Session = Depends(get_db)) -> Response:
    """
    Exposes application metrics in standard Prometheus exposition text format
    for scraping by Prometheus Server, AWS CloudWatch Container Insights, or Grafana Agent.
    """
    METRICS_DATA["requests_total"] += 1
    uptime = time.time() - METRICS_DATA["start_time"]
    redis_status = 1 if redis_manager.is_connected() else 0

    lines = [
        "# HELP nexora_uptime_seconds Total seconds the backend application has been running",
        "# TYPE nexora_uptime_seconds gauge",
        f"nexora_uptime_seconds {uptime:.2f}",
        "",
        "# HELP nexora_http_requests_total Total HTTP requests served by this instance",
        "# TYPE nexora_http_requests_total counter",
        f'nexora_http_requests_total{{environment="production"}} {METRICS_DATA["requests_total"]}',
        "",
        "# HELP nexora_http_errors_total Total HTTP 5xx errors recorded",
        "# TYPE nexora_http_errors_total counter",
        f'nexora_http_errors_total{{environment="production"}} {METRICS_DATA["errors_total"]}',
        "",
        "# HELP nexora_redis_connected Status of Redis connection (1 = connected, 0 = disconnected)",
        "# TYPE nexora_redis_connected gauge",
        f"nexora_redis_connected {redis_status}",
        "",
        "# HELP nexora_sentry_active Status of Sentry error tracking integration",
        "# TYPE nexora_sentry_active gauge",
        f"nexora_sentry_active {1 if is_sentry_active() else 0}",
    ]

    body = "\n".join(lines) + "\n"
    return Response(content=body, media_type="text/plain; version=0.0.4; charset=utf-8")


@router.get(
    "/api/v1/system/sentry-debug",
    summary="Sentry Error Tracking Verification Endpoint",
)
def trigger_sentry_debug_exception() -> Dict[str, Any]:
    """
    Deliberately triggers and captures an exception to verify Sentry alert delivery
    and error grouping without taking down the server.
    """
    try:
        # Deliberate ZeroDivisionError for diagnostic verification
        _ = 1 / 0
    except ZeroDivisionError as exc:
        event_id = capture_exception(
            exc,
            context={"module": "monitoring_router", "trigger": "sentry-debug-endpoint"},
        )
        METRICS_DATA["errors_total"] += 1
        return {
            "status": "captured",
            "message": "Deliberate test exception captured and dispatched to Sentry/Logger.",
            "error_type": "ZeroDivisionError",
            "sentry_active": is_sentry_active(),
            "event_id": event_id,
        }
    return {"status": "ok"}

"""Day 19 E-Commerce Application - Main FastAPI App with SlowAPI Rate Limiting, OWASP Hardening & GZip Compression."""

from contextlib import asynccontextmanager
import csv
import gzip
import json
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session

from app.config import settings
from app.database import check_db_connection, get_db, init_db
from app.routers import (
    auth_router,
    cart_router,
    orders_router,
    products_router,
    tasks_router,
    websocket_router,
)
from app.services.order_service import ws_order_manager
from app.services.product_service import ProductService
from app.utils.rate_limit import (
    OWASP_SECURITY_HEADERS,
    SECURITY_METRICS,
    OWASPSecurityMiddleware,
    limiter,
    rate_limit_exceeded_handler,
)
from app.utils.redis_client import redis_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to initialize database and seed catalog."""
    init_db()
    yield


tags_metadata = [
    {"name": "System Status"},
    {"name": "Day 19 Security, Compression & Load Audit"},
    {"name": "Authentication & Users"},
    {"name": "Products & Catalog"},
    {"name": "Redis Shopping Cart"},
    {"name": "Orders & Checkout"},
    {"name": "Background Tasks (Celery)"},
    {"name": "WebSockets"},
]

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description=(
        "Full-stack Day 19 Hardened E-Commerce API with SlowAPI Rate Limiting, "
        "OWASP API Top 10 Security Headers, GZip Response Compression, "
        "Celery Background Tasks (PDF Invoices & CSV Import), "
        "PostgreSQL Full-Text & pg_trgm Fuzzy Search, SQLAlchemy N+1 Optimization, "
        "and Real-Time WebSockets."
    ),
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 1. Register SlowAPI Rate Limiter & Custom 429 Exception Handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# 2. Register OWASP Security Headers & Request Size Guard Middleware
app.add_middleware(OWASPSecurityMiddleware)

# 3. Register Response Compression (GZipMiddleware) for payloads >= 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)

# 4. Environment-driven CORS configuration (allows configured frontend origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Accept-Encoding",
        "Origin",
        "X-Requested-With",
        "X-RateLimit-Client-Id",
    ],
    expose_headers=[
        "Retry-After",
        "X-RateLimit-Limit",
        "X-RateLimit-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
    ],
)

# Mount product uploads folder for static serving
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR.parent)), name="uploads")


def _read_bundle_assets_summary() -> dict[str, Any]:
    """Inspect real compiled JS/CSS bundle files from frontend/dist/assets if built."""
    dist_assets_dir = settings.PROJECT_ROOT.parent / "frontend" / "dist" / "assets"
    if not dist_assets_dir.exists():
        return {"built": False, "chunks": [], "total_raw_bytes": 0, "total_gzip_bytes": 0}

    chunks: list[dict[str, Any]] = []
    total_raw = 0
    total_gzip = 0
    for f in sorted(dist_assets_dir.iterdir()):
        if f.is_file() and f.suffix in {".js", ".css"}:
            raw_bytes = f.read_bytes()
            gz_bytes = gzip.compress(raw_bytes, compresslevel=6)
            raw_len = len(raw_bytes)
            gz_len = len(gz_bytes)
            total_raw += raw_len
            total_gzip += gz_len
            chunks.append(
                {
                    "filename": f.name,
                    "type": f.suffix.lstrip("."),
                    "raw_bytes": raw_len,
                    "raw_kb": round(raw_len / 1024, 2),
                    "gzip_bytes": gz_len,
                    "gzip_kb": round(gz_len / 1024, 2),
                }
            )
    return {
        "built": True,
        "chunks": chunks,
        "total_raw_bytes": total_raw,
        "total_raw_kb": round(total_raw / 1024, 2),
        "total_gzip_bytes": total_gzip,
        "total_gzip_kb": round(total_gzip / 1024, 2),
    }


def _safe_float(val: Any) -> float:
    """Safely convert CSV string values (including 'N/A' or empty strings) to float."""
    if val is None:
        return 0.0
    text = str(val).strip()
    if not text or text.upper() == "N/A":
        return 0.0
    try:
        return float(text)
    except (ValueError, TypeError):
        return 0.0


def _read_locust_stats_summary() -> dict[str, Any]:
    """Read real Locust 50-user CSV test output if present in backend/."""
    csv_path = settings.PROJECT_ROOT / "locust_day19_stats.csv"
    if not csv_path.exists():
        return {"executed": False, "rows": []}

    rows: list[dict[str, Any]] = []
    aggregated: dict[str, Any] = {}
    try:
        with csv_path.open("r", encoding="utf-8") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                item = {
                    "type": row.get("Type") or "GET",
                    "name": row.get("Name") or "",
                    "request_count": int(_safe_float(row.get("Request Count"))),
                    "failure_count": int(_safe_float(row.get("Failure Count"))),
                    "median_ms": round(_safe_float(row.get("Median Response Time")), 2),
                    "average_ms": round(_safe_float(row.get("Average Response Time")), 2),
                    "min_ms": round(_safe_float(row.get("Min Response Time")), 2),
                    "max_ms": round(_safe_float(row.get("Max Response Time")), 2),
                    "p95_ms": round(_safe_float(row.get("95%")), 2),
                    "rps": round(_safe_float(row.get("Requests/s")), 2),
                }
                if item["name"] == "Aggregated":
                    aggregated = item
                else:
                    rows.append(item)
    except Exception:
        return {"executed": False, "rows": []}

    return {
        "executed": True,
        "concurrent_users": 50,
        "spawn_rate": 10,
        "aggregated": aggregated,
        "endpoints": rows,
    }


def _read_lighthouse_summary() -> dict[str, Any]:
    """Read real Lighthouse JSON audit scores from frontend/lighthouse-day19.json if present."""
    lh_path = settings.PROJECT_ROOT.parent / "frontend" / "lighthouse-day19.json"
    if not lh_path.exists():
        return {"executed": False, "scores": {}}

    try:
        raw = json.loads(lh_path.read_text(encoding="utf-8"))
        cats = raw.get("categories", {})
        audits = raw.get("audits", {})
        scores = {
            key: int(round((val.get("score") or 0) * 100))
            for key, val in cats.items()
            if isinstance(val, dict) and val.get("score") is not None
        }
        metrics = {
            "fcp": audits.get("first-contentful-paint", {}).get("displayValue"),
            "lcp": audits.get("largest-contentful-paint", {}).get("displayValue"),
            "tbt": audits.get("total-blocking-time", {}).get("displayValue"),
            "cls": audits.get("cumulative-layout-shift", {}).get("displayValue"),
            "speed_index": audits.get("speed-index", {}).get("displayValue"),
        }
        return {
            "executed": True,
            "final_url": raw.get("finalDisplayedUrl") or raw.get("requestedUrl"),
            "fetch_time": raw.get("fetchTime"),
            "scores": scores,
            "metrics": metrics,
        }
    except Exception:
        return {"executed": False, "scores": {}}


@app.get(
    "/",
    tags=["System Status"],
    summary="Root Health Check",
)
def root_health():
    """Verify application, PostgreSQL, Redis, CORS, Security, Compression, Celery Tasks, and WebSocket health."""
    pg_ok = check_db_connection()
    redis_ok = redis_manager.is_connected()
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "cors_allowed_origins": settings.cors_origins_list,
        "database": {
            "name": "day10_db",
            "type": "PostgreSQL",
            "connected": pg_ok,
        },
        "redis": {
            "status": "connected" if redis_ok else "fallback_active",
            "connected": redis_ok,
        },
        "security": {
            "rate_limiter": "SlowAPI (active)",
            "owasp_headers_enabled": True,
            "gzip_compression_minimum_bytes": settings.GZIP_MINIMUM_SIZE,
        },
        "active_websockets": ws_order_manager.get_active_count(),
        "docs_url": "/docs",
        "features": [
            "Day 19 SlowAPI Rate Limiting & Custom 429 Handler",
            "Day 19 OWASP API Top 10 Security Headers & Payload Size Guard",
            "Day 19 GZip Response Compression (GZipMiddleware >= 500B)",
            "Environment-Configured CORS & JWT Bearer Authentication",
            "Product CRUD & Pillow Image Processing",
            "Redis Fast Shopping Cart (24h TTL) & Catalog Cache-Aside",
            "PostgreSQL Atomic Stock Validation & Order Checkout",
            "Celery Task Lifecycle Polling (PENDING -> STARTED -> COMPLETED / FAILED)",
            "Asynchronous PDF Invoice Generation & Bulk CSV Product Import",
            "PostgreSQL Full-Text Search (tsvector + GIN) & Fuzzy Search (pg_trgm + GIN)",
            "SQLAlchemy N+1 Query Optimization (joinedload + selectinload)",
            "Real-Time WebSocket Order Tracking & Admin-Customer Live Chat",
        ],
    }


@app.get(
    "/system/security-status",
    tags=["Day 19 Security, Compression & Load Audit"],
    summary="Live Day 19 Security, GZip Compression, Bundle, Lighthouse & Locust Telemetry",
)
def get_security_and_performance_status(db: Session = Depends(get_db)):
    """
    Return real-time Day 19 inspection data:
    - Active OWASP security headers and runtime protection counters
    - Active SlowAPI rate limits per endpoint
    - Live GZip compression ratio measured on the actual product catalog payload
    - Compiled Vite bundle chunk sizes, Lighthouse audit scores, and Locust 50-user results
    """
    catalog = ProductService.list_products(db, limit=100, offset=0)
    raw_json_bytes = json.dumps(catalog.model_dump(mode="json")).encode("utf-8")
    compressed_bytes = gzip.compress(raw_json_bytes, compresslevel=6)
    raw_size = len(raw_json_bytes)
    gz_size = len(compressed_bytes)
    saved_bytes = max(0, raw_size - gz_size)
    savings_pct = round((saved_bytes / raw_size) * 100, 1) if raw_size > 0 else 0.0

    return {
        "status": "hardened",
        "rate_limiting": {
            "library": "slowapi (limits backend)",
            "rules": {
                "POST /auth/login": settings.RATE_LIMIT_AUTH,
                "POST /auth/register": settings.RATE_LIMIT_REGISTER,
                "GET /products/": settings.RATE_LIMIT_CATALOG,
                "GET /products/search": settings.RATE_LIMIT_SEARCH,
                "POST /tasks/csv-import": settings.RATE_LIMIT_TASKS,
                "POST /tasks/invoices/{order_id}": settings.RATE_LIMIT_TASKS,
                "GET /system/rate-limit-probe": settings.RATE_LIMIT_PROBE,
            },
            "metrics": SECURITY_METRICS,
        },
        "owasp_security": {
            "headers": OWASP_SECURITY_HEADERS,
            "max_request_body_bytes": OWASPSecurityMiddleware.MAX_REQUEST_BODY_BYTES,
            "practices_enforced": [
                "API1:2023 Broken Object Level Authorization — Order ownership verified in OrderService.get_order_by_id",
                "API2:2023 Broken Authentication — bcrypt password hashing + HS256 JWT expiration + SlowAPI login rate limiting",
                "API3:2023 Broken Object Property Level Authorization — Strict Pydantic v2 input/output schemas",
                "API4:2023 Unrestricted Resource Consumption — SlowAPI rate limits + 6MB payload ceiling + pagination limits",
                "API5:2023 Broken Function Level Authorization — Admin RBAC enforced via get_current_admin dependency",
                "API8:2023 Security Misconfiguration — Defensive CSP, X-Frame-Options, nosniff, Referrer-Policy & CORS allowlist",
            ],
        },
        "compression": {
            "middleware": "GZipMiddleware",
            "minimum_size_bytes": settings.GZIP_MINIMUM_SIZE,
            "catalog_sample_products": catalog.total,
            "uncompressed_bytes": raw_size,
            "gzip_compressed_bytes": gz_size,
            "bytes_saved": saved_bytes,
            "compression_savings_percent": savings_pct,
        },
        "bundle_analysis": _read_bundle_assets_summary(),
        "lighthouse": _read_lighthouse_summary(),
        "locust_load_test": _read_locust_stats_summary(),
    }


@app.get(
    "/system/rate-limit-probe",
    tags=["Day 19 Security, Compression & Load Audit"],
    summary="Rate-Limited Probe Endpoint (5/minute) for Live SlowAPI 429 Verification",
)
@limiter.limit(settings.RATE_LIMIT_PROBE)
def rate_limit_probe(request: Request):
    """
    Endpoint with a strict 5/minute limit per client bucket so automated tests and the UI
    can trigger and verify HTTP 429 Too Many Requests without locking out normal browsing.
    """
    return {
        "status": "allowed",
        "message": "Request permitted by SlowAPI rate limiter.",
        "limit": settings.RATE_LIMIT_PROBE,
        "client_bucket": request.headers.get("X-RateLimit-Client-Id") or "default",
    }


# Include Routers in logical order
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(tasks_router)
app.include_router(websocket_router)

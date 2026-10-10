"""Day 19 Verification Tests: SlowAPI Rate Limiting, OWASP API Security Headers, Payload Size Guard & GZip Compression."""

import uuid
from fastapi.testclient import TestClient

from app.database import init_db
from app.main import app

init_db()
client = TestClient(app)


def test_day19_owasp_security_headers_and_cors():
    """Verify OWASP API Top 10 defensive HTTP headers and Day 19 CORS port 5180 configuration."""
    resp = client.get("/", headers={"Origin": "http://localhost:5180"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "online"
    assert body["version"] == "19.0.0"
    assert "http://localhost:5180" in body["cors_allowed_origins"]
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5180"

    # OWASP API8:2023 Security Headers
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("x-xss-protection") == "1; mode=block"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in (resp.headers.get("permissions-policy") or "")
    assert resp.headers.get("cross-origin-opener-policy") == "same-origin"
    assert "default-src 'self'" in (resp.headers.get("content-security-policy") or "")


def test_day19_static_uploads_immutable_cache_headers():
    """Verify static product image responses include immutable Cache-Control and OWASP headers."""
    resp = client.get("/uploads/products/laptop.jpg")
    assert resp.status_code == 200
    assert resp.headers.get("cache-control") == "public, max-age=31536000, immutable"
    assert resp.headers.get("x-content-type-options") == "nosniff"


def test_day19_gzip_response_compression():
    """Verify GZipMiddleware compresses catalog and security-status JSON responses (>= 500 bytes)."""
    resp = client.get(
        "/products/",
        headers={"Accept-Encoding": "gzip"},
    )
    assert resp.status_code == 200
    assert resp.headers.get("content-encoding") == "gzip"
    data = resp.json()
    assert "products" in data
    assert data["total"] >= 1


def test_day19_slowapi_rate_limiting_probe_returns_429():
    """Verify SlowAPI rate limiter permits 5 requests/minute on /system/rate-limit-probe and blocks the 6th with 429."""
    bucket_id = f"test-probe-{uuid.uuid4().hex[:8]}"
    headers = {"X-RateLimit-Client-Id": bucket_id}

    for attempt in range(5):
        ok_resp = client.get("/system/rate-limit-probe", headers=headers)
        assert ok_resp.status_code == 200, f"Attempt {attempt + 1} failed unexpectedly"
        assert ok_resp.json()["status"] == "allowed"

    # 6th request within the same minute must be rejected with 429 Too Many Requests
    blocked_resp = client.get("/system/rate-limit-probe", headers=headers)
    assert blocked_resp.status_code == 429
    err_body = blocked_resp.json()
    assert err_body["error"] == "rate_limit_exceeded"
    assert "5 per 1 minute" in err_body["detail"]
    assert blocked_resp.headers.get("retry-after") == "60"
    assert blocked_resp.headers.get("x-content-type-options") == "nosniff"


def test_day19_slowapi_login_brute_force_protection_429():
    """Verify POST /auth/login is protected by SlowAPI against brute-force credential stuffing."""
    bucket_id = f"test-login-{uuid.uuid4().hex[:8]}"
    headers = {"X-RateLimit-Client-Id": bucket_id}

    # RATE_LIMIT_AUTH default is 3/minute
    for _ in range(3):
        r = client.post(
            "/auth/login",
            json={"username": "admin", "password": "wrong_password_attempt"},
            headers=headers,
        )
        assert r.status_code == 401

    # 4th brute-force attempt in the same minute must be throttled with HTTP 429
    throttled = client.post(
        "/auth/login",
        json={"username": "admin", "password": "wrong_password_attempt"},
        headers=headers,
    )
    assert throttled.status_code == 429
    assert throttled.json()["error"] == "rate_limit_exceeded"


def test_day19_owasp_oversized_payload_rejected_413():
    """Verify OWASPSecurityMiddleware rejects requests declaring Content-Length > 6MB with HTTP 413."""
    resp = client.post(
        "/auth/login",
        content=b"{}",
        headers={
            "Content-Type": "application/json",
            "Content-Length": str(7 * 1024 * 1024),  # 7 MB > 6 MB limit
        },
    )
    assert resp.status_code == 413
    body = resp.json()
    assert body["error"] == "payload_too_large"
    assert resp.headers.get("x-frame-options") == "DENY"


def test_day19_security_and_performance_telemetry_endpoint():
    """Verify GET /system/security-status reports live rate limits, OWASP headers, and GZip savings."""
    resp = client.get("/system/security-status", headers={"Accept-Encoding": "gzip"})
    assert resp.status_code == 200
    assert resp.headers.get("content-encoding") == "gzip"
    data = resp.json()
    assert data["status"] == "hardened"
    assert data["rate_limiting"]["rules"]["POST /auth/login"] == "20/minute"
    assert data["rate_limiting"]["metrics"]["rate_limit_blocks_429"] >= 2
    assert data["owasp_security"]["headers"]["X-Frame-Options"] == "DENY"
    assert data["compression"]["middleware"] == "GZipMiddleware"
    assert data["compression"]["uncompressed_bytes"] > data["compression"]["gzip_compressed_bytes"]
    assert data["compression"]["compression_savings_percent"] > 40.0

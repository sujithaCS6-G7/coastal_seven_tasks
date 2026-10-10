"""
Day 19 Locust Load Testing Suite — 50 Concurrent Users.

Simulates realistic e-commerce shoppers concurrently browsing the Redis-cached catalog,
executing PostgreSQL Full-Text & pg_trgm Fuzzy searches, viewing product details,
and querying system health & security telemetry with GZip compression enabled.

Run command (50 concurrent users, spawn rate 10/s, duration 15s):
    python -m locust -f locustfile.py --headless -u 50 -r 10 -t 15s --host http://127.0.0.1:8003 --csv=locust_day19
"""

import os
import sys
import uuid
from pathlib import Path

os.environ.setdefault("PURE_PYTHON", "1")
_BACKEND_DIR = Path(__file__).resolve().parent
_DAY19_PACKAGES = _BACKEND_DIR.parent / ".packages"
_DAY10_SITE_PACKAGES = _BACKEND_DIR.parent.parent / "day10_ecommerce" / ".venv" / "Lib" / "site-packages"
for _p in (_DAY10_SITE_PACKAGES, _DAY19_PACKAGES, _BACKEND_DIR):
    if _p.exists() and str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from locust import HttpUser, between, task


class NexoraEcommerceLoadUser(HttpUser):
    """Simulated concurrent shopper interacting with the Day 19 FastAPI backend."""

    wait_time = between(0.2, 0.8)

    def on_start(self):
        """Assign each of the 50 virtual users a unique client ID header."""
        self.virtual_user_id = f"locust-vu-{uuid.uuid4().hex[:8]}"
        self.default_headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-RateLimit-Client-Id": self.virtual_user_id,
        }

    @task(5)
    def browse_product_catalog_gzip(self):
        """Fetch product catalog with GZip compression and Redis cache-aside."""
        with self.client.get(
            "/products/?limit=20&offset=0",
            headers=self.default_headers,
            name="GET /products/ (Catalog + GZip)",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Unexpected status {response.status_code}")

    @task(3)
    def search_products_combined_fts_trgm(self):
        """Execute PostgreSQL combined Full-Text + pg_trgm search."""
        with self.client.get(
            "/products/search?q=laptop&mode=combined",
            headers=self.default_headers,
            name="GET /products/search (Combined FTS+Trgm)",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Search failed with {response.status_code}")

    @task(2)
    def search_products_fuzzy_typo(self):
        """Execute PostgreSQL pg_trgm typo-tolerant fuzzy search."""
        with self.client.get(
            "/products/search?q=iphon&mode=fuzzy",
            headers=self.default_headers,
            name="GET /products/search (Fuzzy Typo)",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Fuzzy search failed with {response.status_code}")

    @task(2)
    def view_single_product_detail(self):
        """Fetch individual product details."""
        with self.client.get(
            "/products/1",
            headers=self.default_headers,
            name="GET /products/1 (Product Detail)",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 404):
                response.success()
            else:
                response.failure(f"Product detail failed with {response.status_code}")

    @task(1)
    def check_security_and_health_status(self):
        """Verify root health and security/compression telemetry endpoint."""
        with self.client.get(
            "/system/security-status",
            headers=self.default_headers,
            name="GET /system/security-status",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Security status failed with {response.status_code}")

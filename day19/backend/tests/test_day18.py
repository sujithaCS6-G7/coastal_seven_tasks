"""Day 18 Backend Verification Tests: Celery Tasks, PDF Invoices, CSV Import, PostgreSQL FTS/Fuzzy Search & N+1 Optimization."""

import io
import time
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import SessionLocal, init_db
from app.main import app

init_db()
client = TestClient(app)


def _get_auth_headers(username: str, password: str) -> dict[str, str]:
    resp = client.post(
        "/auth/login",
        json={"username": username, "password": password},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}



def test_health_and_cors_day18():
    """Verify Day 18 health endpoint and CORS origin configuration for port 5179."""
    resp = client.get("/", headers={"Origin": "http://localhost:5179"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert "http://localhost:5179" in data["cors_allowed_origins"]
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5179"


def test_postgresql_gin_indexes_created():
    """Verify that PostgreSQL GIN indexes for tsvector Full-Text Search and pg_trgm Fuzzy Search exist."""
    with SessionLocal() as db:
        rows = db.execute(
            text(
                "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products';"
            )
        ).mappings().all()
        index_names = {r["indexname"] for r in rows}
        assert "idx_products_search_vector_gin" in index_names
        assert "idx_products_trgm_gin" in index_names


def test_postgresql_fulltext_search():
    """Verify PostgreSQL Full-Text Search using tsvector, websearch_to_tsquery, and ts_rank."""
    resp = client.get(
        "/products/search",
        params={"q": "wireless noise cancelling headphones", "mode": "fulltext"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["search_mode"] == "fulltext"
    assert "idx_products_search_vector_gin" in body["index_used"]
    assert body["total"] >= 1
    top = body["products"][0]
    assert "Headphones" in top["name"]
    assert top["relevance_score"] is not None and top["relevance_score"] > 0
    assert top["match_type"] == "fulltext_tsvector"


def test_postgresql_fuzzy_trgm_search_typos():
    """Verify PostgreSQL pg_trgm fuzzy search matches typo queries like 'iphon' -> 'iPhone 16 Pro Max' and 'keybord' -> 'Keyboard'."""
    resp_iphone = client.get(
        "/products/search",
        params={"q": "iphon", "mode": "fuzzy"},
    )
    assert resp_iphone.status_code == 200
    body_iphone = resp_iphone.json()
    assert body_iphone["search_mode"] == "fuzzy"
    assert "idx_products_trgm_gin" in body_iphone["index_used"]
    assert body_iphone["total"] >= 1
    names = [p["name"] for p in body_iphone["products"]]
    assert any("iPhone" in n for n in names)

    resp_kbd = client.get(
        "/products/search",
        params={"q": "keybord", "mode": "fuzzy"},
    )
    assert resp_kbd.status_code == 200
    body_kbd = resp_kbd.json()
    assert body_kbd["total"] >= 1
    assert any("Keyboard" in p["name"] for p in body_kbd["products"])


def test_pdf_invoice_celery_lifecycle_and_download():
    """Verify non-blocking Celery PDF invoice task lifecycle (PENDING/STARTED -> COMPLETED) and PDF 1.4 download."""
    admin_headers = _get_auth_headers("admin", "password123")

    # Ensure at least one order exists
    orders_resp = client.get("/orders/admin/all", headers=admin_headers)
    assert orders_resp.status_code == 200
    orders = orders_resp.json()
    if not orders:
        # Place an order first
        products = client.get("/products/").json()["products"]
        client.post(
            "/cart/items",
            json={"product_id": products[0]["id"], "quantity": 1},
            headers=admin_headers,
        )
        checkout_resp = client.post(
            "/orders/checkout",
            json={"shipping_address": "100 Nexora Way, Tech City, TX 75001"},
            headers=admin_headers,
        )
        assert checkout_resp.status_code == 201
        order_id = checkout_resp.json()["id"]
    else:
        order_id = orders[0]["id"]

    # 1. Start PDF invoice generation task
    start_resp = client.post(f"/tasks/invoices/{order_id}", headers=admin_headers)
    assert start_resp.status_code == 202
    task_data = start_resp.json()
    task_id = task_data["task_id"]
    assert task_id
    assert task_data["status"] in {"PENDING", "STARTED", "COMPLETED"}

    # 2. Poll task status until COMPLETED
    final_status = None
    for _ in range(30):
        poll_resp = client.get(f"/tasks/{task_id}", headers=admin_headers)
        assert poll_resp.status_code == 200
        final_status = poll_resp.json()
        if final_status["status"] in {"COMPLETED", "FAILED"}:
            break
        time.sleep(0.15)

    assert final_status is not None
    assert final_status["status"] == "COMPLETED"
    assert final_status["progress"] == 100
    assert final_status["result"]["order_id"] == order_id
    assert final_status["result"]["filename"].endswith(".pdf")

    # 3. Download generated PDF invoice and verify valid PDF header
    dl_resp = client.get(f"/tasks/invoices/{order_id}/download", headers=admin_headers)
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"].startswith("application/pdf")
    assert dl_resp.content.startswith(b"%PDF-1.4")


def test_bulk_csv_import_celery_lifecycle():
    """Verify Bulk CSV Import Celery task tracks row progress, imports valid rows, and reports invalid row errors."""
    admin_headers = _get_auth_headers("admin", "password123")

    csv_content = (
        "name,category,price,stock,description\n"
        "CSV Pro Studio Microphone,Audio,159.99,35,Broadcast-grade USB/XLR condenser microphone\n"
        "CSV UltraWide Curved Monitor,Displays,549.50,14,34-inch WQHD 165Hz curved productivity monitor\n"
        "CSV Invalid Negative Price Item,Accessories,-25.00,10,Row with invalid negative price\n"
    )

    files = {"file": ("day18_catalog_import.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    start_resp = client.post("/tasks/csv-import", files=files, headers=admin_headers)
    assert start_resp.status_code == 202
    task_id = start_resp.json()["task_id"]

    final_status = None
    for _ in range(30):
        poll_resp = client.get(f"/tasks/{task_id}", headers=admin_headers)
        assert poll_resp.status_code == 200
        final_status = poll_resp.json()
        if final_status["status"] in {"COMPLETED", "FAILED"}:
            break
        time.sleep(0.15)

    assert final_status is not None
    assert final_status["status"] == "COMPLETED"
    assert final_status["progress"] == 100
    res = final_status["result"]
    assert res["total_rows"] == 3
    assert res["processed_rows"] == 3
    assert res["success_count"] == 2
    assert res["failure_count"] == 1
    assert len(res["errors"]) == 1
    assert res["errors"][0]["row"] == 3


def test_n1_query_optimization_benchmark():
    """Verify SQLAlchemy joinedload + selectinload eliminates the N+1 query problem on orders."""
    admin_headers = _get_auth_headers("admin", "password123")
    resp = client.get("/orders/admin/n1-benchmark", headers=admin_headers)
    assert resp.status_code == 200
    bench = resp.json()
    assert bench["orders_inspected"] >= 1
    assert bench["optimized_eager_loading"]["sql_queries_executed"] <= 2
    if bench["orders_inspected"] >= 2:
        assert (
            bench["unoptimized_lazy_loading"]["sql_queries_executed"]
            > bench["optimized_eager_loading"]["sql_queries_executed"]
        )
        assert bench["queries_saved"] > 0


def test_csv_import_with_valid_invalid_and_missing_image_urls():
    """
    Verify Bulk CSV Import with image_url column:
    - Downloads valid HTTP image URLs and saves files into uploads/products/
    - Links saved image path (/uploads/products/csv_...) to imported product in PostgreSQL
    - Continues processing remaining rows when an image URL fails (404 / bad scheme / non-image)
    - Handles missing image_url gracefully with fallback image
    - Tracks row progress and separates image_errors from row validation errors
    """
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    import threading
    from PIL import Image
    from app.config import settings
    from app.models.product import Product

    png_buf = io.BytesIO()
    Image.new("RGB", (80, 80), color=(35, 115, 210)).save(png_buf, format="PNG")
    valid_png_bytes = png_buf.getvalue()

    jpg_buf = io.BytesIO()
    Image.new("RGB", (80, 80), color=(20, 160, 95)).save(jpg_buf, format="JPEG")
    valid_jpg_bytes = jpg_buf.getvalue()

    class _MockImageHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/valid-headphones.png":
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.end_headers()
                self.wfile.write(valid_png_bytes)
            elif self.path == "/valid-monitor.jpg":
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.end_headers()
                self.wfile.write(valid_jpg_bytes)
            elif self.path == "/corrupted-image.jpg":
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(b"not-a-valid-image-binary")
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *args):
            return

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), _MockImageHandler)
    port = httpd.server_port
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    try:
        admin_headers = _get_auth_headers("admin", "password123")
        csv_content = (
            "name,category,price,stock,description,image_url\n"
            f"CSV Image Studio Headphones,Audio,249.99,20,Studio headphones with downloaded PNG,http://127.0.0.1:{port}/valid-headphones.png\n"
            f"CSV Image 4K Display,Displays,499.00,15,4K monitor with downloaded JPEG,http://127.0.0.1:{port}/valid-monitor.jpg\n"
            f"CSV Broken 404 Image Speaker,Audio,129.50,18,Product with 404 image URL,http://127.0.0.1:{port}/missing-404.jpg\n"
            f"CSV Corrupted Image Webcam,Accessories,89.00,25,Product with corrupted image bytes,http://127.0.0.1:{port}/corrupted-image.jpg\n"
            "CSV Missing Image URL Dock,Accessories,119.00,30,Product with empty image_url,\n"
            f"CSV Invalid Price Product,Electronics,-99.00,5,Invalid negative price row,http://127.0.0.1:{port}/valid-headphones.png\n"
        )

        files = {
            "file": (
                "day18_images_import.csv",
                io.BytesIO(csv_content.encode("utf-8")),
                "text/csv",
            )
        }
        start_resp = client.post("/tasks/csv-import", files=files, headers=admin_headers)
        assert start_resp.status_code == 202
        start_payload = start_resp.json()
        task_id = start_payload["task_id"]
        assert start_payload["status"] in {"PENDING", "STARTED", "COMPLETED"}

        observed_progress_values = [start_payload["progress"]]
        final_status = None
        for _ in range(40):
            poll_resp = client.get(f"/tasks/{task_id}", headers=admin_headers)
            assert poll_resp.status_code == 200
            final_status = poll_resp.json()
            observed_progress_values.append(final_status["progress"])
            if final_status["status"] in {"COMPLETED", "FAILED"}:
                break
            time.sleep(0.12)

        assert final_status is not None
        assert final_status["status"] == "COMPLETED"
        assert final_status["progress"] == 100
        assert observed_progress_values[-1] == 100

        res = final_status["result"]
        assert res["total_rows"] == 6
        assert res["processed_rows"] == 6
        assert res["success_count"] == 5
        assert res["failure_count"] == 1
        assert res["image_downloaded_count"] == 2
        assert res["image_failed_count"] == 2
        assert res["image_missing_count"] == 1
        assert len(res["errors"]) == 1
        assert res["errors"][0]["row"] == 6
        assert len(res["image_errors"]) == 2
        assert {e["row"] for e in res["image_errors"]} == {3, 4}

        by_name = {item["name"]: item for item in res["imported_products"]}
        # 1. Valid PNG downloaded & saved in uploads/products/
        hp_item = by_name["CSV Image Studio Headphones"]
        assert hp_item["image_status"] == "downloaded"
        assert hp_item["saved_image_filename"].startswith("csv_")
        assert (settings.UPLOAD_DIR / hp_item["saved_image_filename"]).is_file()
        assert hp_item["image_url"] == f"/uploads/products/{hp_item['saved_image_filename']}"

        # 2. Valid JPG downloaded & saved in uploads/products/
        mon_item = by_name["CSV Image 4K Display"]
        assert mon_item["image_status"] == "downloaded"
        assert (settings.UPLOAD_DIR / mon_item["saved_image_filename"]).is_file()

        # 3. 404 image failed, but product still imported with fallback image
        spk_item = by_name["CSV Broken 404 Image Speaker"]
        assert spk_item["image_status"] == "failed"
        assert spk_item["image_url"].startswith("/uploads/products/")

        # 4. Missing image URL imported with fallback image
        dock_item = by_name["CSV Missing Image URL Dock"]
        assert dock_item["image_status"] == "missing"
        assert dock_item["image_url"].startswith("/uploads/products/")

        # Verify database record has the downloaded image path linked
        with SessionLocal() as db:
            db_prod = (
                db.query(Product)
                .filter(Product.name == "CSV Image Studio Headphones")
                .first()
            )
            assert db_prod is not None
            assert db_prod.image_url == hp_item["image_url"]
    finally:
        httpd.shutdown()
        httpd.server_close()


def test_csv_import_task_failure_on_missing_required_headers():
    """Verify Celery task transitions to FAILED when CSV headers are missing required columns."""
    from app.tasks.background_tasks import bulk_import_products_csv_task, get_task_status_payload

    bad_csv = "category,stock,description\nElectronics,10,Missing name and price columns\n"
    res = bulk_import_products_csv_task(
        csv_text=bad_csv,
        filename="invalid_headers.csv",
        task_id_override="test-failed-csv-headers",
        row_delay=0.0,
    )
    assert res["status"] == "FAILED"
    status_payload = get_task_status_payload("test-failed-csv-headers")
    assert status_payload["status"] == "FAILED"
    assert "missing required column" in (status_payload["error"] or "").lower()


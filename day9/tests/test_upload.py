"""Tests for file uploads, validation, resizing, static serving & deletion."""

import io
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import (
    get_upload_dir,
    settings,
)
from app.services.image_service import ImageService
from tests.conftest import create_image_bytes


def test_upload_png_success(client: TestClient, sample_png_bytes: bytes) -> None:
    """Test successful PNG image upload, variant generation, and metadata."""
    files = {"file": ("test_sample.png", sample_png_bytes, "image/png")}
    response = client.post("/api/v1/files/upload", files=files)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert "id" in data
    assert data["original_filename"] == "test_sample.png"
    assert data["format"] == "PNG"
    assert data["width"] == 300
    assert data["height"] == 200
    assert data["size_bytes"] == len(sample_png_bytes)
    assert data["original_url"].startswith("/uploads/originals/")
    assert data["thumbnail_url"].startswith("/uploads/thumbnails/")
    assert data["medium_url"].startswith("/uploads/medium/")

    # Check files exist on disk
    upload_root = get_upload_dir()
    stored_name = data["stored_filename"]
    original_path = upload_root / settings.ORIGINALS_SUBDIR / stored_name
    thumbnail_path = upload_root / settings.THUMBNAILS_SUBDIR / stored_name
    medium_path = upload_root / settings.MEDIUM_SUBDIR / stored_name

    assert original_path.exists()
    assert thumbnail_path.exists()
    assert medium_path.exists()

    # Verify thumbnail dimensions
    with Image.open(thumbnail_path) as thumb:
        assert thumb.width <= 150
        assert thumb.height <= 150


def test_upload_jpeg_success(client: TestClient, sample_jpeg_bytes: bytes) -> None:
    """Test successful JPEG image upload and processing."""
    files = {"file": ("banner.jpg", sample_jpeg_bytes, "image/jpeg")}
    response = client.post("/api/v1/files/upload", files=files)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["original_filename"] == "banner.jpg"
    assert data["format"] == "JPEG"
    assert data["width"] == 400
    assert data["height"] == 300


def test_upload_webp_success(client: TestClient, sample_webp_bytes: bytes) -> None:
    """Test successful WEBP image upload and processing."""
    files = {"file": ("graphic.webp", sample_webp_bytes, "image/webp")}
    response = client.post("/api/v1/files/upload", files=files)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["original_filename"] == "graphic.webp"
    assert data["format"] == "WEBP"


def test_list_uploaded_files(
    client: TestClient, sample_png_bytes: bytes, sample_jpeg_bytes: bytes
) -> None:
    """Test listing all uploaded files."""
    # Initially empty
    res_empty = client.get("/api/v1/files/")
    assert res_empty.status_code == status.HTTP_200_OK

    # Upload two files
    client.post(
        "/api/v1/files/upload",
        files={"file": ("one.png", sample_png_bytes, "image/png")},
    )
    client.post(
        "/api/v1/files/upload",
        files={"file": ("two.jpg", sample_jpeg_bytes, "image/jpeg")},
    )

    res = client.get("/api/v1/files/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total"] >= 2
    assert len(data["files"]) >= 2


def test_get_file_by_id_success(client: TestClient, sample_png_bytes: bytes) -> None:
    """Test retrieving image metadata by ID."""
    files = {"file": ("avatar.png", sample_png_bytes, "image/png")}
    upload_res = client.post("/api/v1/files/upload", files=files)
    file_id = upload_res.json()["id"]

    get_res = client.get(f"/api/v1/files/{file_id}")
    assert get_res.status_code == status.HTTP_200_OK
    assert get_res.json()["id"] == file_id
    assert get_res.json()["original_filename"] == "avatar.png"


def test_get_file_by_id_not_found(client: TestClient) -> None:
    """Test retrieving non-existent image ID returns 404."""
    response = client.get("/api/v1/files/non-existent-uuid-12345")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


def test_static_file_serving(client: TestClient, sample_png_bytes: bytes) -> None:
    """Verify uploaded files and variants are served over HTTP."""
    files = {"file": ("serve_me.png", sample_png_bytes, "image/png")}
    upload_res = client.post("/api/v1/files/upload", files=files)
    data = upload_res.json()

    # 1. Fetch original
    res_orig = client.get(data["original_url"])
    assert res_orig.status_code == status.HTTP_200_OK
    assert res_orig.content == sample_png_bytes

    # 2. Fetch thumbnail
    res_thumb = client.get(data["thumbnail_url"])
    assert res_thumb.status_code == status.HTTP_200_OK
    with Image.open(io.BytesIO(res_thumb.content)) as thumb_img:
        assert thumb_img.width <= 150
        assert thumb_img.height <= 150

    # 3. Fetch medium variant
    res_med = client.get(data["medium_url"])
    assert res_med.status_code == status.HTTP_200_OK
    with Image.open(io.BytesIO(res_med.content)) as med_img:
        assert med_img.width <= 800
        assert med_img.height <= 800


def test_delete_file_success(client: TestClient, sample_png_bytes: bytes) -> None:
    """Test file deletion removes records and files from disk."""
    files = {"file": ("delete_target.png", sample_png_bytes, "image/png")}
    upload_res = client.post("/api/v1/files/upload", files=files)
    data = upload_res.json()
    file_id = data["id"]
    stored_name = data["stored_filename"]

    upload_root = get_upload_dir()
    original_path = upload_root / settings.ORIGINALS_SUBDIR / stored_name
    assert original_path.exists()

    # Delete
    del_res = client.delete(f"/api/v1/files/{file_id}")
    assert del_res.status_code == status.HTTP_200_OK
    assert "deleted successfully" in del_res.json()["message"]

    # Verify removed from disk
    assert not original_path.exists()

    # Verify 404 on subsequent get
    assert client.get(f"/api/v1/files/{file_id}").status_code == status.HTTP_404_NOT_FOUND


def test_delete_file_not_found(client: TestClient) -> None:
    """Test deleting non-existent file ID returns 404."""
    response = client.delete("/api/v1/files/non-existent-uuid")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_upload_multiple_files_success(
    client: TestClient, sample_png_bytes: bytes, sample_jpeg_bytes: bytes
) -> None:
    """Test batch file upload endpoint."""
    files = [
        ("files", ("image1.png", sample_png_bytes, "image/png")),
        ("files", ("image2.jpg", sample_jpeg_bytes, "image/jpeg")),
    ]
    response = client.post("/api/v1/files/upload-multiple", files=files)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert len(data) == 2
    assert data[0]["original_filename"] == "image1.png"
    assert data[1]["original_filename"] == "image2.jpg"


def test_upload_invalid_extension(client: TestClient) -> None:
    """Test rejection of disallowed file extension."""
    files = {"file": ("malicious.exe", b"binary content", "image/png")}
    response = client.post("/api/v1/files/upload", files=files)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_upload_invalid_mime_type(client: TestClient, sample_png_bytes: bytes) -> None:
    """Test rejection of disallowed MIME type."""
    files = {"file": ("photo.png", sample_png_bytes, "application/pdf")}
    response = client.post("/api/v1/files/upload", files=files)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_upload_oversized_file(
    client: TestClient, oversized_image_bytes: bytes
) -> None:
    """Test rejection of file exceeding limit."""
    files = {"file": ("giant.png", oversized_image_bytes, "image/png")}
    response = client.post("/api/v1/files/upload", files=files)
    assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE


def test_upload_corrupted_image(
    client: TestClient, corrupted_image_bytes: bytes
) -> None:
    """Test rejection of corrupted/invalid bytes disguised with image extension."""
    files = {"file": ("corrupt.png", corrupted_image_bytes, "image/png")}
    response = client.post("/api/v1/files/upload", files=files)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_upload_oversized_dimensions(client: TestClient) -> None:
    """Test rejection when image dimensions exceed maximum limits."""
    large_dim_bytes = create_image_bytes(
        format_name="PNG", size=(settings.MAX_IMAGE_WIDTH + 10, 100)
    )
    files = {"file": ("too_wide.png", large_dim_bytes, "image/png")}
    response = client.post("/api/v1/files/upload", files=files)
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_upload_history(client: TestClient, sample_png_bytes: bytes) -> None:
    """Test the /files/history endpoint for aggregated metrics and audit log."""
    files = {"file": ("history_sample.png", sample_png_bytes, "image/png")}
    client.post("/files/upload", files=files)

    response = client.get("/files/history")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_files" in data
    assert data["total_files"] >= 1
    assert "total_size_bytes" in data
    assert "total_size_mb" in data
    assert "format_distribution" in data
    assert "PNG" in data["format_distribution"]
    assert "history" in data
    assert isinstance(data["history"], list)


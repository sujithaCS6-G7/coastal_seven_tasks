"""Pytest fixtures and configuration."""

import io
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import get_upload_dir, set_upload_dir, settings
from app.main import app
from app.services.image_service import ImageService
from app.websocket.connection_manager import ws_manager


@pytest.fixture(autouse=True)
def clean_environment(tmp_path: Path) -> Generator[Path, None, None]:
    """Isolate uploads to a temporary directory for each test and reset registries."""
    previous_dir = get_upload_dir()
    set_upload_dir(tmp_path)
    ImageService.clear_registry()
    ws_manager.active_connections.clear()
    ws_manager.client_info.clear()

    yield tmp_path

    # Cleanup after test execution
    ImageService.clear_registry()
    set_upload_dir(previous_dir)
    ws_manager.active_connections.clear()
    ws_manager.client_info.clear()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient instance."""
    with TestClient(app) as test_client:
        yield test_client


def create_image_bytes(
    format_name: str = "PNG",
    size: tuple[int, int] = (200, 200),
    color: tuple[int, int, int] = (50, 100, 150),
) -> bytes:
    """Helper utility to generate valid in-memory image bytes."""
    mode = "RGB"
    img = Image.new(mode, size, color=color)
    output = io.BytesIO()
    img.save(output, format=format_name)
    return output.getvalue()


@pytest.fixture
def sample_png_bytes() -> bytes:
    """Provide valid PNG image bytes."""
    return create_image_bytes(format_name="PNG", size=(300, 200), color=(34, 197, 94))


@pytest.fixture
def sample_jpeg_bytes() -> bytes:
    """Provide valid JPEG image bytes."""
    return create_image_bytes(format_name="JPEG", size=(400, 300), color=(59, 130, 246))


@pytest.fixture
def sample_webp_bytes() -> bytes:
    """Provide valid WEBP image bytes."""
    return create_image_bytes(format_name="WEBP", size=(250, 250), color=(234, 179, 8))


@pytest.fixture
def sample_gif_bytes() -> bytes:
    """Provide valid GIF image bytes."""
    return create_image_bytes(format_name="GIF", size=(100, 100), color=(239, 68, 68))


@pytest.fixture
def oversized_image_bytes() -> bytes:
    """Provide byte string exceeding MAX_FILE_SIZE_BYTES (5 MB)."""
    return b"0" * (5 * 1024 * 1024 + 1024)


@pytest.fixture
def corrupted_image_bytes() -> bytes:
    """Provide fake corrupted image data."""
    return b"\x89PNG\r\n\x1a\nCorrupted random header bytes without proper chunks"

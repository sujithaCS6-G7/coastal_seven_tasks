"""File upload validation utilities."""

import io
import re
import uuid
from pathlib import Path
from fastapi import HTTPException, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

# Protection against decompression bombs (DoS)
Image.MAX_IMAGE_PIXELS = 100_000_000


def validate_file_extension(filename: str | None) -> str:
    """Validate file extension against allowed extensions."""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty.",
        )

    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not allowed. Supported: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}",
        )
    return ext


def validate_mime_type(content_type: str | None) -> str:
    """Validate MIME content type."""
    if not content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content-Type header is required.",
        )

    normalized_mime = content_type.lower().split(";")[0].strip()
    if normalized_mime not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type '{content_type}' is not supported. Supported: {', '.join(sorted(settings.ALLOWED_MIME_TYPES))}",
        )
    return normalized_mime


def validate_file_size(content: bytes, max_bytes: int | None = None) -> None:
    """Verify file size is within limits."""
    max_limit = max_bytes or settings.MAX_FILE_SIZE_BYTES
    if len(content) > max_limit:
        max_mb = max_limit / (1024 * 1024)
        actual_mb = len(content) / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File size ({actual_mb:.2f} MB) exceeds maximum limit of {max_mb:.1f} MB.",
        )


def validate_image_content(content: bytes) -> tuple[str, int, int]:
    """Inspect magic bytes and decode image with Pillow.

    Returns:
        tuple[str, int, int]: (format, width, height)
    """
    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()

        # Reopen after verify() to read dimensions
        with Image.open(io.BytesIO(content)) as img:
            img_format = img.format or "UNKNOWN"
            width, height = img.size

            if width > settings.MAX_IMAGE_WIDTH or height > settings.MAX_IMAGE_HEIGHT:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image dimensions ({width}x{height}) exceed maximum allowed {settings.MAX_IMAGE_WIDTH}x{settings.MAX_IMAGE_HEIGHT} px.",
                )

            return img_format, width, height
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not contain a valid, recognizable image.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupt or unreadable image data: {exc}",
        )


def generate_secure_filename(original_filename: str) -> tuple[str, str]:
    """Generate a unique UUID and sanitized filename.

    Returns:
        tuple[str, str]: (uuid_str, secure_filename)
    """
    file_id = str(uuid.uuid4())
    ext = Path(original_filename).suffix.lower()
    base_stem = Path(original_filename).stem
    safe_stem = re.sub(r"[^a-zA-Z0-9_-]", "_", base_stem)[:30]
    secure_filename = f"{file_id[:8]}_{safe_stem}{ext}"
    return file_id, secure_filename

"""Image processing, resizing, and PostgreSQL persistence service using Pillow."""

import io
from datetime import datetime, timezone
from pathlib import Path
from fastapi import UploadFile
from PIL import Image

from app.core.config import settings
from app.database.database import SessionLocal
from app.database.models import UploadedFile
from app.schemas.upload import ImageMetadata
from app.services.file_service import FileService
from app.utils.validators import (
    generate_secure_filename,
    validate_file_extension,
    validate_file_size,
    validate_image_content,
    validate_mime_type,
)


class ImageService:
    """Orchestrates image validation, Pillow resizing, and PostgreSQL persistence."""

    _registry: dict[str, ImageMetadata] = {}

    @classmethod
    def clear_registry(cls) -> None:
        """Clear memory cache (useful for tests)."""
        cls._registry.clear()

    @classmethod
    def _create_variant(
        cls, original_image: Image.Image, target_size: tuple[int, int], format_name: str
    ) -> bytes:
        """Generate resized variant while preserving aspect ratio."""
        variant = original_image.copy()
        variant.thumbnail(target_size, Image.Resampling.LANCZOS)

        # Convert RGBA to RGB for JPEG format
        if format_name.upper() in ("JPEG", "JPG") and variant.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", variant.size, (255, 255, 255))
            background.paste(variant, mask=variant.split()[-1] if variant.mode == "RGBA" else None)
            variant = background

        output = io.BytesIO()
        variant.save(output, format=format_name, quality=85, optimize=True)
        return output.getvalue()

    @classmethod
    async def process_and_save(
        cls, file: UploadFile, uploaded_by: str = "anonymous"
    ) -> ImageMetadata:
        """Validate, resize with Pillow, save to disk, and persist into PostgreSQL (day9_db)."""
        # 1. Validate file extension and MIME type
        validate_file_extension(file.filename)
        validate_mime_type(file.content_type)

        # 2. Read content into memory
        content = await file.read()
        validate_file_size(content)

        # 3. Validate Pillow image structure
        img_format, width, height = validate_image_content(content)

        # 4. Generate unique ID and secure filename
        file_id, stored_filename = generate_secure_filename(file.filename or "upload.jpg")
        paths = FileService.get_paths(stored_filename)

        # 5. Save original
        FileService.save_bytes(paths["original"], content)

        # 6. Generate and save thumbnail and medium variants
        with Image.open(io.BytesIO(content)) as pil_img:
            thumbnail_bytes = cls._create_variant(pil_img, settings.THUMBNAIL_SIZE, img_format)
            medium_bytes = cls._create_variant(pil_img, settings.MEDIUM_SIZE, img_format)

        FileService.save_bytes(paths["thumbnail"], thumbnail_bytes)
        FileService.save_bytes(paths["medium"], medium_bytes)

        # 7. Build metadata response
        uploaded_at = datetime.now(timezone.utc).isoformat()
        metadata = ImageMetadata(
            id=file_id,
            original_filename=file.filename or "unknown",
            stored_filename=stored_filename,
            content_type=file.content_type or "image/jpeg",
            format=img_format,
            size_bytes=len(content),
            width=width,
            height=height,
            uploaded_at=uploaded_at,
            original_url=f"/uploads/originals/{stored_filename}",
            thumbnail_url=f"/uploads/thumbnails/{stored_filename}",
            medium_url=f"/uploads/medium/{stored_filename}",
            uploaded_by=uploaded_by,
        )

        # 8. Persist to PostgreSQL database (day9_db in pgAdmin)
        try:
            with SessionLocal() as db:
                record = UploadedFile(
                    id=metadata.id,
                    original_filename=metadata.original_filename,
                    stored_filename=metadata.stored_filename,
                    content_type=metadata.content_type,
                    format=metadata.format,
                    size_bytes=metadata.size_bytes,
                    width=metadata.width,
                    height=metadata.height,
                    uploaded_at=metadata.uploaded_at,
                    original_url=metadata.original_url,
                    thumbnail_url=metadata.thumbnail_url,
                    medium_url=metadata.medium_url,
                    uploaded_by=uploaded_by,
                )
                db.add(record)
                db.commit()
        except Exception:
            pass  # Fall back gracefully to memory registry if DB is temporarily offline

        # 9. Store in memory registry
        cls._registry[file_id] = metadata

        return metadata

    @classmethod
    def get_all_images(cls) -> list[ImageMetadata]:
        """Fetch all images from PostgreSQL (or memory registry fallback)."""
        try:
            with SessionLocal() as db:
                records = db.query(UploadedFile).order_by(UploadedFile.uploaded_at.desc()).all()
                if records:
                    return [
                        ImageMetadata(
                            id=r.id,
                            original_filename=r.original_filename,
                            stored_filename=r.stored_filename,
                            content_type=r.content_type,
                            format=r.format,
                            size_bytes=r.size_bytes,
                            width=r.width,
                            height=r.height,
                            uploaded_at=r.uploaded_at,
                            original_url=r.original_url,
                            thumbnail_url=r.thumbnail_url,
                            medium_url=r.medium_url,
                            uploaded_by=getattr(r, "uploaded_by", "anonymous") or "anonymous",
                        )
                        for r in records
                    ]
        except Exception:
            pass
        return sorted(list(cls._registry.values()), key=lambda x: x.uploaded_at, reverse=True)

    @classmethod
    def get_upload_history(cls) -> dict:
        """Calculate aggregated upload history and metrics from PostgreSQL."""
        images = cls.get_all_images()
        total_files = len(images)
        total_size_bytes = sum(img.size_bytes for img in images)
        total_size_mb = round(total_size_bytes / (1024 * 1024), 2)

        format_distribution: dict[str, int] = {}
        for img in images:
            fmt = (img.format or "UNKNOWN").upper()
            format_distribution[fmt] = format_distribution.get(fmt, 0) + 1

        return {
            "total_files": total_files,
            "total_size_bytes": total_size_bytes,
            "total_size_mb": total_size_mb,
            "format_distribution": format_distribution,
            "history": images,
        }


    @classmethod
    def get_image_by_id(cls, file_id: str) -> ImageMetadata | None:
        """Fetch single image metadata by ID from PostgreSQL or memory."""
        try:
            with SessionLocal() as db:
                r = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
                if r:
                    return ImageMetadata(
                        id=r.id,
                        original_filename=r.original_filename,
                        stored_filename=r.stored_filename,
                        content_type=r.content_type,
                        format=r.format,
                        size_bytes=r.size_bytes,
                        width=r.width,
                        height=r.height,
                        uploaded_at=r.uploaded_at,
                        original_url=r.original_url,
                        thumbnail_url=r.thumbnail_url,
                        medium_url=r.medium_url,
                        uploaded_by=getattr(r, "uploaded_by", "anonymous") or "anonymous",
                    )
        except Exception:
            pass
        return cls._registry.get(file_id)

    @classmethod
    def delete_image(cls, file_id: str) -> bool:
        """Delete image from PostgreSQL and disk."""
        meta = cls.get_image_by_id(file_id)
        if not meta:
            return False

        # Remove from disk
        FileService.delete_files(meta.stored_filename)

        # Remove from PostgreSQL
        try:
            with SessionLocal() as db:
                db.query(UploadedFile).filter(UploadedFile.id == file_id).delete()
                db.commit()
        except Exception:
            pass

        # Remove from memory registry
        cls._registry.pop(file_id, None)
        return True

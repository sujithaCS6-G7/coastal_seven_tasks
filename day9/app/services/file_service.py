"""Low-level file storage and persistence service."""

from pathlib import Path
from app.core.config import get_upload_dir, settings


class FileService:
    """Manages raw disk persistence for uploaded originals and processed variants."""

    @staticmethod
    def get_paths(stored_filename: str) -> dict[str, Path]:
        """Compute disk paths for original, thumbnail, and medium variants."""
        upload_root = get_upload_dir()
        return {
            "original": upload_root / settings.ORIGINALS_SUBDIR / stored_filename,
            "thumbnail": upload_root / settings.THUMBNAILS_SUBDIR / stored_filename,
            "medium": upload_root / settings.MEDIUM_SUBDIR / stored_filename,
        }

    @classmethod
    def save_bytes(cls, path: Path, data: bytes) -> None:
        """Persist byte array to target disk path."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    @classmethod
    def read_bytes(cls, path: Path) -> bytes | None:
        """Read bytes from disk if file exists."""
        if path.exists() and path.is_file():
            return path.read_bytes()
        return None

    @classmethod
    def delete_files(cls, stored_filename: str) -> bool:
        """Remove original and all variants from disk."""
        paths = cls.get_paths(stored_filename)
        deleted_any = False
        for path in paths.values():
            if path.exists() and path.is_file():
                try:
                    path.unlink()
                    deleted_any = True
                except Exception:
                    pass
        return deleted_any

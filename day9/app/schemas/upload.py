"""Pydantic schemas for file upload requests and responses."""

from pydantic import BaseModel, Field


class ImageVariantInfo(BaseModel):
    """Information regarding a generated image variant."""

    url: str
    width: int
    height: int
    size_bytes: int


class ImageMetadata(BaseModel):
    """Metadata response for an uploaded and processed image."""

    id: str = Field(..., description="Unique UUID identifier for the file")
    original_filename: str = Field(..., description="Original user submitted filename")
    stored_filename: str = Field(..., description="Sanitized stored filename")
    content_type: str = Field(..., description="MIME content type")
    format: str = Field(..., description="Detected image format (JPEG, PNG, etc.)")
    size_bytes: int = Field(..., description="Original file size in bytes")
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    uploaded_at: str = Field(..., description="ISO 8601 upload timestamp")
    original_url: str = Field(..., description="URL path to original image")
    thumbnail_url: str = Field(..., description="URL path to thumbnail (150x150)")
    medium_url: str = Field(..., description="URL path to medium variant (800x800)")
    uploaded_by: str = Field(default="anonymous", description="User who uploaded the file")


class FileListResponse(BaseModel):
    """Response model for file listing."""

    total: int
    files: list[ImageMetadata]


class UploadHistoryResponse(BaseModel):
    """Aggregated upload history and audit metrics."""

    total_files: int = Field(..., description="Total count of files uploaded")
    total_size_bytes: int = Field(..., description="Total storage consumed in bytes")
    total_size_mb: float = Field(..., description="Total storage consumed in Megabytes")
    format_distribution: dict[str, int] = Field(
        ..., description="Count of files grouped by format (PNG, JPEG, etc.)"
    )
    history: list[ImageMetadata] = Field(
        ..., description="Chronological upload audit log (most recent first)"
    )


class MessageResponse(BaseModel):
    """Standard message response."""

    message: str
    detail: str | None = None


class WebSocketBroadcastEvent(BaseModel):
    """Standard payload for WebSocket broadcasts."""

    event: str
    timestamp: str
    data: dict

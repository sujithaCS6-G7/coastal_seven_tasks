"""Upload router for secure image uploads, history tracking, and PostgreSQL management."""

from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.schemas.upload import (
    FileListResponse,
    ImageMetadata,
    MessageResponse,
    UploadHistoryResponse,
)
from app.services.auth_service import get_optional_current_user
from app.services.image_service import ImageService
from app.services.notification_service import NotificationService

upload_router = APIRouter(prefix="/files", tags=["Files & Image Processing"])


@upload_router.post(
    "/upload",
    response_model=ImageMetadata,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and process a single image",
    description="Validates image type, size, and magic bytes, creates thumbnail (150x150) and medium (800x800) variants with Pillow, records into PostgreSQL (day9_db), and broadcasts upload notification via WebSockets.",
)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> ImageMetadata:
    """Handle secure single image upload, resizing, and real-time notification."""
    username = current_user["username"] if current_user else "anonymous"
    metadata = await ImageService.process_and_save(file, uploaded_by=username)

    # Broadcast notification to all connected WebSocket clients
    await NotificationService.notify_upload(metadata.model_dump())

    return metadata


@upload_router.post(
    "/upload-multiple",
    response_model=list[ImageMetadata],
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
    summary="Upload and process multiple images in batch",
    description="Batch upload multiple images with automatic Pillow resizing, PostgreSQL records, and WebSocket broadcasts.",
)
async def upload_multiple_files(
    files: list[UploadFile] = File(...),
    current_user: dict[str, Any] | None = Depends(get_optional_current_user),
) -> list[ImageMetadata]:
    """Handle batch image upload, processing, and individual WebSocket notifications."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided.",
        )

    username = current_user["username"] if current_user else "anonymous"
    processed: list[ImageMetadata] = []
    for file in files:
        metadata = await ImageService.process_and_save(file, uploaded_by=username)
        await NotificationService.notify_upload(metadata.model_dump())
        processed.append(metadata)

    return processed


@upload_router.get(
    "/history",
    response_model=UploadHistoryResponse,
    summary="Get Upload History & Storage Statistics",
    description="Retrieves complete audit history of uploaded images from PostgreSQL (day9_db) with aggregated storage consumption, format distributions, and timestamps.",
)
async def get_upload_history() -> UploadHistoryResponse:
    """Retrieve audit history and aggregate metrics for all uploaded files."""
    history_data = ImageService.get_upload_history()
    return UploadHistoryResponse(**history_data)


@upload_router.get(
    "/",
    response_model=FileListResponse,
    summary="List all uploaded images",
    description="Retrieve all processed images stored in PostgreSQL (day9_db).",
)
async def list_files() -> FileListResponse:
    """Retrieve all processed images stored in the system."""
    files = ImageService.get_all_images()
    return FileListResponse(total=len(files), files=files)


@upload_router.get(
    "/{file_id}",
    response_model=ImageMetadata,
    include_in_schema=False,
    summary="Get image details by UUID",
    description="Retrieve metadata and variant URLs for a specific image from PostgreSQL (day9_db).",
)
async def get_file_details(file_id: str) -> ImageMetadata:
    """Retrieve metadata and variant URLs for a specific image."""
    image = ImageService.get_image_by_id(file_id)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image with ID '{file_id}' was not found.",
        )
    return image


@upload_router.delete(
    "/{file_id}",
    response_model=MessageResponse,
    include_in_schema=False,
    summary="Delete an image and its variants",
    description="Delete image originals and variants from disk, delete record from PostgreSQL, and notify WebSocket clients.",
)
async def delete_file(file_id: str) -> MessageResponse:
    """Delete image originals and variants from disk and notify WebSocket clients."""
    deleted = ImageService.delete_image(file_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image with ID '{file_id}' was not found.",
        )

    # Broadcast deletion event to connected WebSocket clients
    await NotificationService.notify_delete(file_id)

    return MessageResponse(message=f"Image '{file_id}' deleted successfully.")


# Backward-compatibility router for /api/v1/files (matching previous test clients)
legacy_upload_router = APIRouter(prefix="/api/v1/files", include_in_schema=False)
legacy_upload_router.add_api_route("/upload", upload_file, methods=["POST"], response_model=ImageMetadata, status_code=status.HTTP_201_CREATED)
legacy_upload_router.add_api_route("/upload-multiple", upload_multiple_files, methods=["POST"], response_model=list[ImageMetadata], status_code=status.HTTP_201_CREATED)
legacy_upload_router.add_api_route("/history", get_upload_history, methods=["GET"], response_model=UploadHistoryResponse)
legacy_upload_router.add_api_route("/", list_files, methods=["GET"], response_model=FileListResponse)
legacy_upload_router.add_api_route("/{file_id}", get_file_details, methods=["GET"], response_model=ImageMetadata)
legacy_upload_router.add_api_route("/{file_id}", delete_file, methods=["DELETE"], response_model=MessageResponse)

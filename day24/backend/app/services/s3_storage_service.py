"""Day 24: S3 Object Storage Service with Seamless Local Storage Fallback."""

import os
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger("nexora")


class S3StorageService:
    """
    Manages static asset uploads to Amazon S3 (product images, generated PDF invoices).
    Falls back gracefully to local disk storage if AWS_S3_BUCKET or boto3 credentials are unset.
    """

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        cdn_url: Optional[str] = None,
    ):
        self.bucket_name = bucket_name or os.getenv("AWS_S3_BUCKET", "nexora-assets-prod")
        self.region = region or os.getenv("AWS_REGION", "us-east-1")
        self.cdn_url = cdn_url or os.getenv("AWS_CLOUDFRONT_URL")
        self.is_s3_configured = bool(os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"))

    def upload_file(
        self,
        local_path: Path,
        s3_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Uploads a file to Amazon S3 or returns relative URL in local fallback mode.
        """
        if self.is_s3_configured:
            try:
                import boto3

                s3 = boto3.client("s3", region_name=self.region)
                s3.upload_file(
                    str(local_path),
                    self.bucket_name,
                    s3_key,
                    ExtraArgs={"ContentType": content_type, "CacheControl": "max-age=31536000, public"},
                )
                if self.cdn_url:
                    return f"{self.cdn_url.rstrip('/')}/{s3_key.lstrip('/')}"
                return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key.lstrip('/')}"
            except Exception as exc:
                logger.warning(f"S3 upload failed for {s3_key}: {exc}. Using local URL fallback.")

        # Local fallback URL
        return f"/uploads/{s3_key.lstrip('/')}"

    def get_public_url(self, s3_key: str) -> str:
        """Returns the public CDN or S3 URL for a given asset key."""
        if self.is_s3_configured:
            if self.cdn_url:
                return f"{self.cdn_url.rstrip('/')}/{s3_key.lstrip('/')}"
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key.lstrip('/')}"
        return f"/uploads/{s3_key.lstrip('/')}"


s3_service = S3StorageService()

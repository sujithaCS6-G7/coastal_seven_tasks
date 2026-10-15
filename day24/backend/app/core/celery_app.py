"""Celery application instance proxy for Docker Compose worker and beat services."""

from app.tasks.email_tasks import celery_app

__all__ = ["celery_app"]

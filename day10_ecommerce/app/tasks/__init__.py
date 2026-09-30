"""Tasks package exporting Celery application and background tasks."""

from app.tasks.email_tasks import (
    celery_app,
    send_order_confirmation_email,
    send_welcome_email,
)

__all__ = ["celery_app", "send_order_confirmation_email", "send_welcome_email"]

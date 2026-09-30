"""Celery background tasks for e-commerce email processing."""

import logging
import time
from celery import Celery

from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Celery app
celery_app = Celery(
    "ecommerce_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(bind=True, name="send_order_confirmation_email")
def send_order_confirmation_email(
    self, order_id: int, user_email: str, total_amount: float, order_number: str
) -> dict:
    """Asynchronous background task to dispatch order confirmation email."""
    logger.info(
        f"[CELERY EMAIL] Initiating order confirmation email for Order #{order_number} to {user_email}..."
    )
    # Simulate non-blocking email SMTP dispatch
    time.sleep(1.0)
    logger.info(
        f"[CELERY EMAIL] Order confirmation successfully sent to {user_email} (Total: ${total_amount:.2f})"
    )
    return {
        "status": "SENT",
        "task_id": self.request.id if self.request else "local-sync",
        "order_id": order_id,
        "order_number": order_number,
        "recipient": user_email,
        "total_amount": total_amount,
        "message": f"Confirmation email delivered to {user_email}",
    }


@celery_app.task(bind=True, name="send_welcome_email")
def send_welcome_email(self, user_email: str, username: str) -> dict:
    """Asynchronous background task to send welcome email upon registration."""
    logger.info(f"[CELERY EMAIL] Sending welcome email to {username} <{user_email}>")
    time.sleep(0.5)
    return {
        "status": "SENT",
        "recipient": user_email,
        "username": username,
        "message": "Welcome to Day 10 E-Commerce!",
    }

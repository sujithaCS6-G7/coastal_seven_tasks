"""Tasks package exporting Celery application and background tasks."""

from app.tasks.email_tasks import (
    celery_app,
    send_order_confirmation_email,
    send_welcome_email,
)
from app.tasks.background_tasks import (
    bulk_import_products_csv_task,
    generate_invoice_pdf_task,
)

__all__ = [
    "celery_app",
    "send_order_confirmation_email",
    "send_welcome_email",
    "generate_invoice_pdf_task",
    "bulk_import_products_csv_task",
]


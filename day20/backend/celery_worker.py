"""Celery worker entry point for distributed task processing."""

from app.tasks.email_tasks import celery_app

if __name__ == "__main__":
    celery_app.start()

"""Celery application configuration and Celery Beat periodic scheduler."""

from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "day8_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.celery.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,  # 1 hour result caching
    worker_prefetch_multiplier=1,  # Fair dispatch across workers
    beat_schedule={
        "heartbeat-pulse-every-30s": {
            "task": "app.celery.tasks.periodic_system_pulse",
            "schedule": 30.0,  # Run every 30 seconds
            "args": (),
        },
        "daily-cache-cleanup-midnight": {
            "task": "app.celery.tasks.periodic_cache_cleanup",
            "schedule": crontab(hour=0, minute=0),  # Daily at midnight
            "args": (),
        },
    },
)

# Alias for compatibility
app = celery_app

if __name__ == "__main__":
    celery_app.start()

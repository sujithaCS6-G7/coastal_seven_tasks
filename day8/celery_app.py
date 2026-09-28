"""Celery application configuration and Beat scheduler."""

import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

# Redis Broker and Result Backend URLs
REDIS_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
REDIS_BACKEND_URL = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/1")

app = Celery(
    "day8_tasks",
    broker=REDIS_BROKER_URL,
    backend=REDIS_BACKEND_URL,
    include=["tasks"],
)

# Celery Configuration
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,  # Cache results for 1 hour
    worker_prefetch_multiplier=1,  # Prevent worker greediness for fair dispatch
    # Celery Beat Scheduled Periodic Tasks
    beat_schedule={
        "heartbeat-pulse-every-30s": {
            "task": "tasks.periodic_system_pulse",
            "schedule": 30.0,  # Execute every 30 seconds
            "args": (),
        },
        "daily-cache-cleanup-midnight": {
            "task": "tasks.periodic_cache_cleanup",
            "schedule": crontab(hour=0, minute=0),  # Runs daily at midnight
            "args": (),
        },
    },
)

if __name__ == "__main__":
    app.start()
"""Celery distributed background tasks with progress tracking, retries, and periodic jobs."""

from datetime import datetime, timezone
import logging
import time

from app.celery.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.celery.tasks.generate_heavy_report")
def generate_heavy_report(
    self, report_name: str = "Quarterly Performance", total_steps: int = 5
) -> dict:
    """Execute a simulated heavy report with state updates (PROGRESS).

    Args:
        self: Task instance (bind=True) to allow update_state calls.
        report_name: Name of the report being generated.
        total_steps: Number of simulated progress steps.

    Returns:
        dict: Report summary and metadata.
    """
    logger.info(f"Starting Celery report task {self.request.id} ({report_name})")

    for step in range(1, total_steps + 1):
        time.sleep(1.0)  # Simulate CPU / database processing
        percent = int((step / total_steps) * 100)

        # Update task state to PROGRESS for live polling from Swagger/Frontend
        self.update_state(
            state="PROGRESS",
            meta={
                "current_step": step,
                "total_steps": total_steps,
                "percent": percent,
                "status": f"Processing step {step} of {total_steps}",
            },
        )
        logger.info(f"Task {self.request.id}: {percent}% completed")

    return {
        "task_id": self.request.id,
        "report_name": report_name,
        "total_steps": total_steps,
        "percent": 100,
        "status": "COMPLETED",
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "summary": "Report generated successfully with 25,000 synthetic records processed.",
    }


# Backward-compatible alias
long_task = generate_heavy_report


@celery_app.task(
    bind=True,
    name="app.celery.tasks.send_notification_with_retry",
    max_retries=3,
    default_retry_delay=2,
)
def send_notification_with_retry(
    self, recipient: str, message: str, simulate_transient_failure: bool = False
) -> dict:
    """Send notification with automatic exponential/retry backoff on failure."""
    logger.info(
        f"Attempting notification to {recipient} (Attempt {self.request.retries + 1})"
    )

    if simulate_transient_failure and self.request.retries < 1:
        logger.warning("Simulating transient gateway failure. Retrying task in 2 seconds...")
        raise self.retry(
            exc=ConnectionError("Gateway timeout communicating with notification vendor"),
            countdown=2,
        )

    time.sleep(0.5)
    return {
        "status": "DELIVERED",
        "recipient": recipient,
        "message": message,
        "attempts": self.request.retries + 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@celery_app.task(name="app.celery.tasks.periodic_system_pulse")
def periodic_system_pulse() -> dict:
    """Periodic Celery Beat task executed every 30 seconds."""
    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info(f"[Celery Beat] Heartbeat pulse at {timestamp}")
    return {
        "event": "heartbeat",
        "timestamp": timestamp,
        "status": "healthy",
    }


@celery_app.task(name="app.celery.tasks.periodic_cache_cleanup")
def periodic_cache_cleanup() -> dict:
    """Periodic Celery Beat task executed daily at midnight to prune stale items."""
    logger.info("[Celery Beat] Running scheduled cache housekeeping")
    return {
        "action": "cache_cleanup",
        "records_evaluated": 100,
        "pruned": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@celery_app.task(name="app.celery.tasks.add")
def add(a: int, b: int) -> int:
    """Simple test task."""
    return a + b

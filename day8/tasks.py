"""Celery tasks showcasing progress tracking, retries, and periodic executions."""

from datetime import datetime, timezone
import logging
import time

from celery_app import app

logger = logging.getLogger(__name__)


@app.task(bind=True, name="tasks.generate_heavy_report")
def generate_heavy_report(
    self, report_name: str = "Quarterly Sales", total_steps: int = 5
) -> dict:
    """Simulate a long-running, multi-step job with real-time progress state updates.

    Args:
        self: Task instance (bind=True) to allow update_state calls.
        report_name: Name or description of report.
        total_steps: Number of simulated steps.

    Returns:
        dict: Final report metadata.
    """
    logger.info(f"Starting heavy report task {self.request.id} ({report_name})")

    for step in range(1, total_steps + 1):
        time.sleep(1.0)  # Simulate CPU or external I/O computation
        percent = int((step / total_steps) * 100)

        # Update task state to PROGRESS so clients polling the API see real-time updates
        self.update_state(
            state="PROGRESS",
            meta={
                "current_step": step,
                "total_steps": total_steps,
                "percent": percent,
                "status": f"Completed step {step} of {total_steps}",
            },
        )
        logger.info(f"Task {self.request.id}: {percent}% complete")

    return {
        "task_id": self.request.id,
        "report_name": report_name,
        "total_steps": total_steps,
        "percent": 100,
        "status": "COMPLETED",
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "summary": "Report generated successfully with 25,000 synthetic records processed.",
    }


# Backward-compatible alias for existing scripts
long_task = generate_heavy_report


@app.task(
    bind=True,
    name="tasks.send_notification_with_retry",
    max_retries=3,
    default_retry_delay=2,
)
def send_notification_with_retry(
    self, recipient: str, message: str, simulate_transient_failure: bool = False
) -> dict:
    """Simulate sending a notification with automatic retry mechanism on failure.

    Args:
        self: Task instance.
        recipient: Email address or user ID.
        message: Payload message.
        simulate_transient_failure: If True, fails on first attempt to demonstrate retry.

    Returns:
        dict: Result status.
    """
    logger.info(f"Attempting to dispatch message to {recipient} (Attempt {self.request.retries + 1})")

    if simulate_transient_failure and self.request.retries < 1:
        logger.warning("Simulating temporary network glitch. Retrying task...")
        # Trigger Celery retry
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


@app.task(name="tasks.periodic_system_pulse")
def periodic_system_pulse() -> dict:
    """Periodic Celery Beat task executed every 30 seconds."""
    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info(f"[Celery Beat] System heartbeat pulse at {timestamp}")
    return {
        "event": "heartbeat",
        "timestamp": timestamp,
        "status": "healthy",
    }


@app.task(name="tasks.periodic_cache_cleanup")
def periodic_cache_cleanup() -> dict:
    """Periodic Celery Beat task executed on schedule to prune stale records."""
    logger.info("[Celery Beat] Running scheduled cache housekeeping task")
    return {
        "action": "cache_cleanup",
        "records_evaluated": 150,
        "pruned": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.task(name="tasks.add")
def add(a: int, b: int) -> int:
    """Simple task for quick testing and verification."""
    return a + b
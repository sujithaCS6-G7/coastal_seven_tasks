"""Jobs router showcasing FastAPI BackgroundTasks vs distributed Celery workers."""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any

from celery.result import AsyncResult
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.celery.celery_app import celery_app
from app.celery.tasks import add, generate_heavy_report, send_notification_with_retry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Background Tasks (FastAPI vs Celery)"])


class EmailNotificationRequest(BaseModel):
    """Payload for FastAPI BackgroundTask simulation."""
    email: str = Field(..., examples=["dev@company.com"])
    subject: str = Field(..., examples=["Daily Status Summary"])


class ReportTaskRequest(BaseModel):
    """Payload for triggering a long-running Celery report."""
    report_name: str = Field(default="Q4 Financial & Sales Report", examples=["Q4 Financial Report"])
    total_steps: int = Field(default=5, ge=1, le=20, examples=[5])


async def _async_background_email(email: str, subject: str) -> None:
    """Simulated in-process non-blocking task managed by FastAPI event loop."""
    await asyncio.sleep(2.0)
    logger.info(f"[FastAPI BackgroundTasks] Email successfully sent to {email} - '{subject}'")


@router.post(
    "/fastapi-background-task",
    summary="FastAPI In-Process Background Task",
    description=(
        "Uses FastAPI's built-in `BackgroundTasks` to perform an asynchronous fire-and-forget job "
        "inside the web server process (lightweight, zero infrastructure overhead)."
    ),
)
async def trigger_fastapi_task(
    payload: EmailNotificationRequest,
    background_tasks: BackgroundTasks,
):
    """Queue an in-process background task within FastAPI."""
    background_tasks.add_task(_async_background_email, payload.email, payload.subject)
    return {
        "status": "QUEUED",
        "mechanism": "FastAPI In-Process BackgroundTasks",
        "recipient": payload.email,
        "message": "Task queued in event loop. HTTP response returned immediately without waiting 2s.",
        "best_for": "Lightweight tasks (email receipts, audit logging, webhook notifications).",
    }


@router.post(
    "/celery/report",
    summary="Enqueue Long-Running Celery Task",
    description=(
        "Dispatches a distributed background task to Celery workers via Redis message broker. "
        "The task tracks real-time progress steps (`PROGRESS` state) queryable via `/jobs/celery/status/{task_id}`."
    ),
)
async def start_celery_report(payload: ReportTaskRequest):
    """Dispatch heavy task to Celery distributed worker pool."""
    try:
        task = generate_heavy_report.delay(
            report_name=payload.report_name,
            total_steps=payload.total_steps,
        )
        return {
            "task_id": task.id,
            "status": "QUEUED",
            "report_name": payload.report_name,
            "total_steps": payload.total_steps,
            "poll_status_url": f"/jobs/celery/status/{task.id}",
            "message": "Task dispatched to Redis broker. Check status using the poll_status_url.",
            "flower_dashboard": "http://localhost:5555",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to dispatch task to Celery broker: {exc}",
        )


@router.get(
    "/celery/status/{task_id}",
    summary="Poll Celery Task Progress and Status",
    description="Inspects real-time state of a Celery task (PENDING -> PROGRESS -> SUCCESS / FAILURE).",
)
async def get_celery_status(task_id: str):
    """Poll task execution state and metadata from Redis result backend."""
    try:
        async_result = AsyncResult(task_id, app=celery_app)
        task_state = async_result.state

        response: dict[str, Any] = {
            "task_id": task_id,
            "state": task_state,
        }

        if task_state == "PENDING":
            response.update({
                "status": "Task waiting in queue or not yet recognized by worker.",
                "progress_percent": 0,
            })
        elif task_state == "PROGRESS":
            response.update({
                "status": "Task currently executing.",
                "meta": async_result.info,
                "progress_percent": async_result.info.get("percent", 0) if isinstance(async_result.info, dict) else 0,
            })
        elif task_state == "SUCCESS":
            response.update({
                "status": "Task completed successfully.",
                "result": async_result.result,
                "progress_percent": 100,
            })
        elif task_state in ("FAILURE", "REVOKED"):
            response.update({
                "status": f"Task ended with state: {task_state}",
                "error": str(async_result.result),
            })
        else:
            response.update({
                "status": task_state,
                "info": str(async_result.info),
            })

        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inspecting task {task_id}: {exc}",
        )


@router.post(
    "/celery/retry-demo",
    summary="Celery Automatic Retry Demo",
    description="Dispatches a Celery task that simulates a transient network failure and triggers automatic retry backoff.",
)
async def trigger_retry_task(
    recipient: str = Query("ops@company.com", examples=["ops@company.com"]),
    simulate_transient_failure: bool = Query(True, description="Force retry on attempt 1"),
):
    """Dispatch notification task with retry logic configured."""
    task = send_notification_with_retry.delay(
        recipient=recipient,
        message="System alert: high CPU usage detected",
        simulate_transient_failure=simulate_transient_failure,
    )
    return {
        "task_id": task.id,
        "recipient": recipient,
        "simulate_transient_failure": simulate_transient_failure,
        "poll_status_url": f"/jobs/celery/status/{task.id}",
        "message": "Task queued. If simulate_transient_failure is true, it will retry after 2 seconds.",
    }


@router.post(
    "/celery/add",
    summary="Celery Quick Math Test",
    description="Enqueue a simple task (a + b) to verify worker connectivity.",
)
async def trigger_quick_add(a: int = 15, b: int = 27):
    """Enqueue a simple math task."""
    task = add.delay(a, b)
    return {
        "task_id": task.id,
        "status": "QUEUED",
        "poll_status_url": f"/jobs/celery/status/{task.id}",
    }

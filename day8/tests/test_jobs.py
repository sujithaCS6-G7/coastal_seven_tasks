"""Tests for FastAPI BackgroundTasks and Celery job dispatch."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_fastapi_background_task():
    """Verify in-process FastAPI background task execution."""
    response = client.post(
        "/jobs/fastapi-background-task",
        json={"email": "tester@example.com", "subject": "Test Email"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "QUEUED"
    assert "FastAPI In-Process BackgroundTasks" in data["mechanism"]


def test_celery_report_dispatch():
    """Verify Celery task queuing to Redis broker."""
    response = client.post(
        "/jobs/celery/report",
        json={"report_name": "Test Q1", "total_steps": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "QUEUED"

    # Status check endpoint
    task_id = data["task_id"]
    status_res = client.get(f"/jobs/celery/status/{task_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "state" in status_data

"""Windows-friendly Celery worker runner script using solo pool."""

import os
import subprocess
import sys

# Auto-switch to Day 8 virtual environment if launched from another venv (e.g. day6_auth)
_day8_dir = os.path.dirname(os.path.abspath(__file__))
_venv_python = os.path.join(_day8_dir, ".venv", "Scripts", "python.exe")
if os.path.exists(_venv_python) and os.path.normcase(sys.executable) != os.path.normcase(_venv_python):
    sys.exit(subprocess.call([_venv_python] + sys.argv))

from app.celery.celery_app import celery_app

if __name__ == "__main__":
    # On Windows, 'solo' pool prevents multiprocessing fork/spawn crashes
    # -n assigns a unique node name to avoid DuplicateNodenameWarning
    argv = [
        "worker",
        "--loglevel=INFO",
        "-P",
        "solo",
        "-E",  # Enable task events for Flower monitoring
        "-n",
        "day8_worker@%h",
    ]
    print("=" * 60)
    print("Starting Celery Worker for Day 8 with solo pool...")
    print("Tasks: app.celery.tasks.generate_heavy_report, app.celery.tasks.send_notification_with_retry")
    print("Broker: redis://127.0.0.1:6379/0")
    print("Node Name: day8_worker@%h")
    print("=" * 60)
    celery_app.worker_main(argv)

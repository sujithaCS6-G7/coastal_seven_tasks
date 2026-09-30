"""Celery Beat scheduler runner script."""

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
    argv = [
        "beat",
        "--loglevel=INFO",
    ]
    print("=" * 60)
    print("Starting Celery Beat Scheduler for Day 8...")
    print("Schedule includes 30s heartbeat & midnight cache cleanup")
    print("=" * 60)
    celery_app.Beat(argv=argv).run()

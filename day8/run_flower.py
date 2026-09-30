"""Flower real-time Celery dashboard launcher script."""

import os
import socket
import subprocess
import sys

# Auto-switch to Day 8 virtual environment if launched from another venv (e.g. day6_auth)
_day8_dir = os.path.dirname(os.path.abspath(__file__))
_venv_python = os.path.join(_day8_dir, ".venv", "Scripts", "python.exe")
if os.path.exists(_venv_python) and os.path.normcase(sys.executable) != os.path.normcase(_venv_python):
    sys.exit(subprocess.call([_venv_python] + sys.argv))


def is_port_in_use(port: int = 5555) -> bool:
    """Check if the target port is already open and listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex(("127.0.0.1", port)) == 0


if __name__ == "__main__":
    if is_port_in_use(5555):
        print("=" * 60)
        print("Flower is ALREADY RUNNING at http://localhost:5555")
        print("You can open http://localhost:5555 directly in your browser!")
        print("=" * 60)
        sys.exit(0)

    from celery.bin.celery import celery

    print("=" * 60)
    print("Starting Flower Real-time Celery Dashboard at http://localhost:5555")
    print("=" * 60)
    sys.argv = [
        "celery",
        "-A",
        "app.celery.celery_app",
        "flower",
        "--port=5555",
        "--loglevel=INFO",
    ]
    celery()

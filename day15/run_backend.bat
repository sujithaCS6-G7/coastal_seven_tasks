@echo off
echo Starting Nexora Day 15 E-Commerce Backend (FastAPI + PostgreSQL + Redis)...
cd /d "%~dp0backend"
"E:\PYTHON\day10_ecommerce\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

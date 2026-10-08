@echo off
echo ========================================================
echo  Starting Day 13 FastAPI Backend (Port 8000)
echo ========================================================
"E:\PYTHON\day10_ecommerce\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

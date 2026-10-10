@echo off
title Day 19 Hardened Security, Rate Limiting, Compression & Performance Suite
echo ============================================================================
echo   DAY 19 — E-COMMERCE SECURITY HARDENING, SLOWAPI, GZIP ^& LOAD AUDIT
echo ============================================================================
echo.
echo [1/2] Starting Day 19 FastAPI Backend on http://127.0.0.1:8003 ...
start "Day 19 Backend (8003)" cmd /k "cd /d E:\PYTHON\day19\backend && set PYTHONPATH=E:\PYTHON\day19\.packages;E:\PYTHON\day10_ecommerce\.venv\Lib\site-packages;E:\PYTHON\day19\backend && C:\Users\Battu\AppData\Local\Programs\Python\Python314\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8003"

echo [2/2] Starting Day 19 React Frontend on http://localhost:5180 ...
start "Day 19 Frontend (5180)" cmd /k "cd /d E:\PYTHON\day19\frontend && set PATH=C:\Users\Battu\AppData\Local\Programs\nodejs;%PATH% && npm run dev"

echo.
echo Day 19 services launched!
echo   - Frontend UI:        http://localhost:5180
echo   - Security Dashboard: http://localhost:5180/performance
echo   - Backend API Docs:   http://127.0.0.1:8003/docs
echo   - Security Status:    http://127.0.0.1:8003/system/security-status
echo ============================================================================
pause

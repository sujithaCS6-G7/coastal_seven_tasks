@echo off
title Day 20 AI Streaming RAG, ChromaDB & LangChain Suite
echo ============================================================================
echo   DAY 20 — AI FOCUS: STREAMING CHAT (SSE), RAG, CHROMADB & FALLBACKS
echo ============================================================================
echo.
echo [1/2] Starting Day 20 FastAPI Backend on http://127.0.0.1:8004 ...
start "Day 20 Backend (8004)" cmd /k "cd /d E:\PYTHON\day20\backend && set PYTHONPATH=E:\PYTHON\day20\.packages;E:\PYTHON\day19\.packages;E:\PYTHON\day10_ecommerce\.venv\Lib\site-packages;E:\PYTHON\day20\backend && C:\Users\Battu\AppData\Local\Programs\Python\Python314\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8004"

echo [2/2] Starting Day 20 React Frontend on http://localhost:5181 ...
start "Day 20 Frontend (5181)" cmd /k "cd /d E:\PYTHON\day20\frontend && set PATH=C:\Users\Battu\AppData\Local\Programs\nodejs;%PATH% && npm run dev"

echo.
echo Day 20 services launched!
echo   - Frontend UI:        http://localhost:5181
echo   - AI Assistant Studio:http://localhost:5181/ai-assistant
echo   - Backend API Docs:   http://127.0.0.1:8004/docs
echo   - AI System Status:   http://127.0.0.1:8004/ai/status
echo ============================================================================
pause

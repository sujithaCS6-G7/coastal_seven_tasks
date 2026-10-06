@echo off
echo Starting Nexora Day 15 E-Commerce Frontend (TypeScript + Vite on Port 5176)...
set PATH=C:\Users\Battu\AppData\Local\Programs\nodejs;%PATH%
cd /d "%~dp0frontend"
npm run dev -- --host --port 5176
pause

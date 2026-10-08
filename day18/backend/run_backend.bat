@echo off
cd /d E:\PYTHON\day18\backend
set PYTHONPATH=E:\PYTHON\day10_ecommerce\.venv\Lib\site-packages;E:\PYTHON\day18\backend
"C:\Users\Battu\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8002

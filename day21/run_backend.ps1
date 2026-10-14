Get-NetTCPConnection -LocalPort 8005 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Set-Location "E:\PYTHON\day21\backend"
$env:PYTHONPATH = "E:\PYTHON\day21\.packages;E:\PYTHON\day19\.packages;E:\PYTHON\day10_ecommerce\.venv\Lib\site-packages;E:\PYTHON\day21\backend"
& "C:\Users\Battu\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload

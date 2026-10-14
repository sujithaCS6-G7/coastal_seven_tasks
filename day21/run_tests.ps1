Set-Location "E:\PYTHON\day21\backend"
$env:PYTHONPATH = "E:\PYTHON\day21\.packages;E:\PYTHON\day19\.packages;E:\PYTHON\day10_ecommerce\.venv\Lib\site-packages;E:\PYTHON\day21\backend"
& "C:\Users\Battu\AppData\Local\Programs\Python\Python314\python.exe" -m pytest tests/test_day20_ai.py tests/test_day21_ai.py -v

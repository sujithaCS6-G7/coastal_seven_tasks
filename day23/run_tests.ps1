Set-Location "E:\PYTHON\day23\backend"
$env:PYTHONPATH = "E:\PYTHON\day23\.packages;E:\PYTHON\day19\.packages;E:\PYTHON\day10_ecommerce\.venv\Lib\site-packages;E:\PYTHON\day23\backend"
& "C:\Users\Battu\AppData\Local\Programs\Python\Python314\python.exe" -m pytest tests/test_day20_ai.py tests/test_day21_ai.py tests/test_day22_ai_project.py tests/test_day23_devops.py -v

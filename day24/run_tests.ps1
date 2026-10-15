Set-Location "$PSScriptRoot\backend"
$env:PYTHONPATH = "$PSScriptRoot\.packages;E:\PYTHON\day23\.packages;E:\PYTHON\day19\.packages;E:\PYTHON\day10_ecommerce\.venv\Lib\site-packages;$PSScriptRoot\backend"
& "C:\Users\Battu\AppData\Local\Programs\Python\Python314\python.exe" -m pytest tests/test_day20_ai.py tests/test_day21_ai.py tests/test_day22_ai_project.py tests/test_day23_devops.py tests/test_day24_cloud_devops.py -v

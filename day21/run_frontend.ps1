Get-NetTCPConnection -LocalPort 5182 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Set-Location "E:\PYTHON\day21\frontend"
$env:Path = "C:\Users\Battu\AppData\Local\Programs\nodejs;" + $env:Path
& "C:\Users\Battu\AppData\Local\Programs\nodejs\npx.cmd" vite --port 5182 --host

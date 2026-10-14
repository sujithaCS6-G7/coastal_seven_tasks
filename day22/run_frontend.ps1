Get-NetTCPConnection -LocalPort 5183 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Set-Location "E:\PYTHON\day22\frontend"
$env:Path = "C:\Users\Battu\AppData\Local\Programs\nodejs;" + $env:Path
& "C:\Users\Battu\AppData\Local\Programs\nodejs\npx.cmd" vite --port 5183 --host

Get-NetTCPConnection -LocalPort 5182 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Set-Location "E:\PYTHON\day23\frontend"
$env:Path = "C:\Users\Battu\AppData\Local\Programs\nodejs;" + $env:Path
& "C:\Users\Battu\AppData\Local\Programs\nodejs\npm.cmd" run dev:hmr

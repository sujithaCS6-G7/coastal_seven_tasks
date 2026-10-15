# ==============================================================================
# Helper Script to Build and Start NexoraAI Docker Stack
# ==============================================================================

$dockerBin = "C:\Users\Battu\AppData\Local\Programs\DockerDesktop\resources\bin"
if (Test-Path $dockerBin) {
    $env:Path = "$dockerBin;" + $env:Path
}

# Always operate from the day23 directory where docker-compose.yml lives
Set-Location $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting NexoraAI Docker Compose Full-Stack Architecture " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env.docker")) {
    Write-Host "[INFO] .env.docker not found. Copying from .env.docker.example..." -ForegroundColor Yellow
    Copy-Item ".env.docker.example" ".env.docker"
}

Write-Host "[INFO] Building and launching containers..." -ForegroundColor Green
docker compose up --build -d

Write-Host "[INFO] Checking container status..." -ForegroundColor Green
docker compose ps

Write-Host "`nFull-stack application running at:" -ForegroundColor Cyan
Write-Host "  Frontend SPA:      http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API:       http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs (Swagger): http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Health Endpoint:   http://localhost:8000/api/v1/health" -ForegroundColor White

# ==============================================================================
# Helper Script to Stop NexoraAI Docker Stack
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host " Stopping NexoraAI Docker Compose Full-Stack Stack        " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow

docker compose down

Write-Host "[INFO] Containers stopped gracefully. Volume data preserved." -ForegroundColor Green

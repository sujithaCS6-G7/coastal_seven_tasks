"""Day 23 DevOps / AWS Focus Test Suite.

Verifies:
1. Docker Fundamentals (Multi-stage Dockerfiles for FastAPI & Vite/React, security, non-root user).
2. Docker Compose (Services, dependencies, healthchecks, restart policies).
3. GitHub Actions CI (Automated pytest, Vitest, linting, Docker image builds).
4. Docker Build & Push (GHCR container publishing, Buildx, layer caching).
5. Branch Protection (Required CI checks, PR review rules, CODEOWNERS).
6. Docker Networking & Volumes (Bridge network, named persistent volumes).
7. Environment & Secret Management (.env.docker.example, security hygiene).
8. Final Integration (Single-command stack readiness and live health endpoints).
"""

from pathlib import Path
import re
import pytest
import yaml
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

DAY23_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = DAY23_ROOT / "backend"
FRONTEND_DIR = DAY23_ROOT / "frontend"
GITHUB_DIR = DAY23_ROOT / ".github"


def test_day23_docker_fundamentals_backend_multistage():
    """1. Verify Backend Multi-Stage Dockerfile, security hardening, non-root user, and .dockerignore."""
    dockerfile_path = BACKEND_DIR / "Dockerfile"
    dockerignore_path = BACKEND_DIR / ".dockerignore"

    assert dockerfile_path.exists(), "backend/Dockerfile must exist"
    assert dockerignore_path.exists(), "backend/.dockerignore must exist"

    dockerfile_content = dockerfile_path.read_text(encoding="utf-8")

    # Multi-stage verification
    assert "AS builder" in dockerfile_content, "Backend Dockerfile must define a builder stage"
    assert "AS runtime" in dockerfile_content, "Backend Dockerfile must define a runtime stage"
    assert "COPY --from=builder" in dockerfile_content, "Runtime stage must copy from builder stage"

    # Security: Non-root user verification
    assert "useradd" in dockerfile_content, "Dockerfile must create an unprivileged user"
    assert "USER appuser" in dockerfile_content, "Dockerfile must drop root privileges and switch to appuser"

    # Best practices: Bytecode & Unbuffered env vars
    assert "PYTHONDONTWRITEBYTECODE=1" in dockerfile_content
    assert "PYTHONUNBUFFERED=1" in dockerfile_content

    # Healthcheck & Expose
    assert "HEALTHCHECK" in dockerfile_content, "Dockerfile must define a container HEALTHCHECK"
    assert "EXPOSE 8000" in dockerfile_content, "Dockerfile must expose port 8000"
    assert "CMD [" in dockerfile_content, "Dockerfile must specify an entrypoint CMD"

    # Dockerignore verification
    dockerignore_content = dockerignore_path.read_text(encoding="utf-8")
    assert "__pycache__/" in dockerignore_content
    assert ".venv/" in dockerignore_content
    assert ".git" in dockerignore_content
    assert ".env" in dockerignore_content, ".dockerignore must exclude local .env files"


def test_day23_docker_fundamentals_frontend_multistage_and_nginx():
    """1 & 6. Verify Frontend Multi-Stage Dockerfile, Nginx SPA routing, reverse proxy, and caching."""
    dockerfile_path = FRONTEND_DIR / "Dockerfile"
    dockerignore_path = FRONTEND_DIR / ".dockerignore"
    nginx_conf_path = FRONTEND_DIR / "nginx.conf"
    nextjs_example_path = FRONTEND_DIR / "Dockerfile.nextjs.example"

    assert dockerfile_path.exists(), "frontend/Dockerfile must exist"
    assert dockerignore_path.exists(), "frontend/.dockerignore must exist"
    assert nginx_conf_path.exists(), "frontend/nginx.conf must exist"
    assert nextjs_example_path.exists(), "frontend/Dockerfile.nextjs.example must exist for reference"

    # Multi-stage Vite Dockerfile
    dockerfile_content = dockerfile_path.read_text(encoding="utf-8")
    assert "AS builder" in dockerfile_content
    assert "AS runner" in dockerfile_content
    assert "COPY --from=builder /app/dist /usr/share/nginx/html" in dockerfile_content
    assert "HEALTHCHECK" in dockerfile_content
    assert "EXPOSE 80" in dockerfile_content

    # Nginx configuration verification
    nginx_content = nginx_conf_path.read_text(encoding="utf-8")
    assert "gzip on;" in nginx_content, "Nginx must have GZip enabled"
    assert "X-Frame-Options" in nginx_content, "Nginx must include OWASP security headers"
    assert "try_files $uri $uri/ /index.html;" in nginx_content, "Nginx must handle SPA fallback routing"
    assert "proxy_pass http://backend:8000/api/;" in nginx_content, "Nginx must proxy API calls to backend"
    assert "proxy_pass http://backend:8000/ws/;" in nginx_content, "Nginx must proxy WebSockets"
    assert "Upgrade $http_upgrade" in nginx_content, "WebSocket proxy must include upgrade header"
    assert "location /nginx-health" in nginx_content, "Nginx must provide a health check endpoint"

    # Next.js reference Dockerfile verification
    nextjs_content = nextjs_example_path.read_text(encoding="utf-8")
    assert "AS deps" in nextjs_content
    assert "AS builder" in nextjs_content
    assert "AS runner" in nextjs_content
    assert ".next/standalone" in nextjs_content


def test_day23_docker_compose_services_and_healthchecks():
    """2. Verify Docker Compose services (PostgreSQL, Redis, FastAPI, Celery Worker, Celery Beat, Frontend)."""
    compose_path = DAY23_ROOT / "docker-compose.yml"
    assert compose_path.exists(), "Root docker-compose.yml must exist"

    with compose_path.open("r", encoding="utf-8") as f:
        compose_data = yaml.safe_load(f)

    assert "services" in compose_data
    services = compose_data["services"]

    # Verify all 6 required microservices are present
    expected_services = ["postgres", "redis", "backend", "celery_worker", "celery_beat", "frontend"]
    for svc in expected_services:
        assert svc in services, f"Service {svc} must be defined in docker-compose.yml"

    # 1. PostgreSQL checks
    pg = services["postgres"]
    assert "postgres:16" in pg["image"]
    assert "5432:5432" in pg["ports"]
    assert "healthcheck" in pg
    assert "pg_isready" in "".join(pg["healthcheck"]["test"])

    # 2. Redis checks
    redis_svc = services["redis"]
    assert "redis:7" in redis_svc["image"]
    assert "6379:6379" in redis_svc["ports"]
    assert "healthcheck" in redis_svc
    assert "redis-cli" in "".join(redis_svc["healthcheck"]["test"])

    # 3. Backend checks
    backend = services["backend"]
    assert backend["build"]["context"] == "./backend"
    assert "8000:8000" in backend["ports"]
    assert "depends_on" in backend
    assert backend["depends_on"]["postgres"]["condition"] == "service_healthy"
    assert backend["depends_on"]["redis"]["condition"] == "service_healthy"
    assert "healthcheck" in backend

    # 4. Celery Worker checks
    worker = services["celery_worker"]
    assert "celery" in worker["command"]
    assert "worker" in worker["command"]
    assert worker["depends_on"]["backend"]["condition"] == "service_healthy"
    assert worker["depends_on"]["redis"]["condition"] == "service_healthy"

    # 5. Celery Beat checks
    beat = services["celery_beat"]
    assert "beat" in beat["command"]
    assert "celery_worker" in beat["depends_on"]

    # 6. Frontend checks
    frontend = services["frontend"]
    assert frontend["build"]["context"] == "./frontend"
    assert "3000:80" in frontend["ports"]
    assert frontend["depends_on"]["backend"]["condition"] == "service_healthy"


def test_day23_docker_networking_and_volumes():
    """6. Verify custom bridge network and persistent named volumes."""
    compose_path = DAY23_ROOT / "docker-compose.yml"
    with compose_path.open("r", encoding="utf-8") as f:
        compose_data = yaml.safe_load(f)

    # Networks
    assert "networks" in compose_data
    assert "nexora-net" in compose_data["networks"]
    assert compose_data["networks"]["nexora-net"]["driver"] == "bridge"

    # Verify all services are attached to the network
    for svc_name, svc_conf in compose_data["services"].items():
        assert "nexora-net" in svc_conf.get("networks", []), f"Service {svc_name} must connect to nexora-net"

    # Named Persistent Volumes
    assert "volumes" in compose_data
    volumes = compose_data["volumes"]
    expected_volumes = ["postgres_data", "redis_data", "chroma_data", "uploads_data"]
    for vol in expected_volumes:
        assert vol in volumes, f"Named volume {vol} must be defined in docker-compose.yml"


def test_day23_github_actions_ci_workflow():
    """3 & 4. Verify GitHub Actions CI/CD pipeline (pytest, vitest, ruff, buildx, push to GHCR)."""
    workflow_path = GITHUB_DIR / "workflows" / "ci.yml"
    assert workflow_path.exists(), ".github/workflows/ci.yml must exist"

    with workflow_path.open("r", encoding="utf-8") as f:
        workflow_data = yaml.safe_load(f)

    assert "jobs" in workflow_data
    jobs = workflow_data["jobs"]

    # 1. Backend CI Job
    assert "backend-ci" in jobs
    backend_job = jobs["backend-ci"]
    assert backend_job["runs-on"] == "ubuntu-latest"
    assert "postgres" in backend_job["services"]
    assert "redis" in backend_job["services"]

    backend_step_names = [s.get("name", "") for s in backend_job["steps"]]
    assert any("Ruff" in name for name in backend_step_names), "Must run Ruff linter"
    assert any("Pytest" in name for name in backend_step_names), "Must run Pytest suite"

    # 2. Frontend CI Job
    assert "frontend-ci" in jobs
    frontend_job = jobs["frontend-ci"]
    frontend_step_names = [s.get("name", "") for s in frontend_job["steps"]]
    assert any("Type Check" in name for name in frontend_step_names)
    assert any("Vitest" in name for name in frontend_step_names)
    assert any("Build" in name for name in frontend_step_names)

    # 3. Docker Build & Push Job
    assert "docker-build-push" in jobs
    docker_job = jobs["docker-build-push"]
    assert "backend-ci" in docker_job["needs"]
    assert "frontend-ci" in docker_job["needs"]

    docker_step_names = [s.get("name", "") for s in docker_job["steps"]]
    assert any("Buildx" in name for name in docker_step_names)
    assert any("GitHub Container Registry" in name or "login" in name.lower() for name in docker_step_names)
    assert any("Backend Image" in name for name in docker_step_names)
    assert any("Frontend Image" in name for name in docker_step_names)


def test_day23_branch_protection_and_secret_management():
    """5 & 7. Verify Branch Protection policy, CODEOWNERS, and environment secrets templates."""
    bp_path = GITHUB_DIR / "BRANCH_PROTECTION.md"
    codeowners_path = GITHUB_DIR / "CODEOWNERS"
    env_example_path = DAY23_ROOT / ".env.docker.example"
    arch_path = DAY23_ROOT / "DOCKER_ARCHITECTURE.md"

    assert bp_path.exists(), "BRANCH_PROTECTION.md must exist"
    assert codeowners_path.exists(), "CODEOWNERS must exist"
    assert env_example_path.exists(), ".env.docker.example must exist"
    assert arch_path.exists(), "DOCKER_ARCHITECTURE.md must exist"

    bp_content = bp_path.read_text(encoding="utf-8")
    assert "Backend Lint & Pytest" in bp_content
    assert "Frontend Typecheck & Vitest" in bp_content
    assert "Docker Build & Publish" in bp_content
    assert "Require Status Checks to Pass" in bp_content
    assert "gh api" in bp_content

    # Environment variables verification
    env_content = env_example_path.read_text(encoding="utf-8")
    required_keys = [
        "DATABASE_URL",
        "REDIS_URL",
        "CELERY_BROKER_URL",
        "SECRET_KEY",
        "AI_ZERO_COST_MODE",
        "FRONTEND_ORIGIN",
    ]
    for key in required_keys:
        assert key in env_content, f"Key {key} must be in .env.docker.example"


def test_day23_live_health_and_readiness_endpoints():
    """8. Verify FastAPI live health, root status, and deployment readiness endpoints."""
    # Root status check
    root_res = client.get("/")
    assert root_res.status_code == 200
    root_data = root_res.json()
    assert root_data["status"] == "online"
    assert "database" in root_data

    # Container health checks
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "online"

    v1_health_res = client.get("/api/v1/health")
    assert v1_health_res.status_code == 200
    assert v1_health_res.json()["status"] == "online"

    # AI deployment readiness
    readiness_res = client.get("/ai/deployment/readiness")
    assert readiness_res.status_code == 200
    assert readiness_res.json()["ready_for_deployment"] is True

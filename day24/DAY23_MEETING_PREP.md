# Day 23 – DevOps / AWS Focus: Docker Compose Full-Stack Architecture, CI/CD Pipeline & Meeting Preparation Guide

---

## 1. Project Overview

### Exactly What Was Implemented in Day 23
1. **Multi-Stage Dockerfiles**:
   - **Backend (`backend/Dockerfile`)**: Multi-stage build (Python 3.12-slim). Stage 1 (`builder`) installs build dependencies (`gcc`, `libpq-dev`, `python3-dev`) and installs packages to `/install`. Stage 2 (`runtime`) drops build tools, creates an unprivileged non-root user (`appuser:appgroup`, UID/GID 10001), copies installed packages to `/usr/local`, and sets up container `HEALTHCHECK`.
   - **Frontend (`frontend/Dockerfile`)**: Stage 1 (`builder`) runs on Node 20-alpine, runs `npm install`, and builds production static assets via `npm run build` (TypeScript check + Vite bundle). Stage 2 (`runner`) runs on lightweight Nginx Alpine (`nginx:alpine`), copies static assets to `/usr/share/nginx/html`, and configures custom reverse proxy.
2. **Container Orchestration (`docker-compose.yml`)**:
   - Orchestrates 6 microservices:
     1. `postgres` (`postgres:16-alpine`, port 5432, healthcheck: `pg_isready -U postgres -d day10_db`).
     2. `redis` (`redis:7-alpine`, port 6379, AOF persistence, healthcheck: `redis-cli ping`).
     3. `backend` (FastAPI REST & WebSocket, port 8000, depends on postgres & redis healthy, healthcheck: `/api/v1/health`).
     4. `celery_worker` (Celery worker with concurrency 2, depends on backend, postgres, redis).
     5. `celery_beat` (Celery periodic scheduler with `/tmp/celerybeat-schedule`).
     6. `frontend` (Nginx Alpine reverse proxy & SPA server, port 3000, healthcheck: `/nginx-health`).
3. **Docker Networking & Named Volumes**:
   - Bridge network: `nexora-net` (`nexora-network`) enabling DNS service discovery (`backend`, `redis`, `postgres`).
   - 4 Named Persistent Volumes: `postgres_data`, `redis_data`, `chroma_data`, and bind mount `./backend/uploads:/app/uploads`.
4. **Nginx Reverse Proxy & OWASP Hardening (`frontend/nginx.conf`)**:
   - SPA routing (`try_files $uri $uri/ /index.html;`).
   - OWASP Security Headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`).
   - GZip compression for JS/CSS/JSON payloads >= 256 bytes.
   - Priority media proxy (`location ^~ /uploads/ { proxy_pass http://backend:8000/uploads/; }`).
   - Backend API reverse proxy (`/api/`, `/products/`, `/auth/`, `/cart/`, `/orders/`, `/tasks/`, `/ai/`, `/system/`).
   - Full-duplex WebSocket reverse proxy (`/ws/` with `Upgrade` and `Connection: "upgrade"`).
5. **Automated CI/CD Pipeline (`.github/workflows/ci.yml`)**:
   - Job 1 (`backend-ci`): PostgreSQL 16 & Redis 7 service containers, Ruff linter, Pytest with coverage XML export.
   - Job 2 (`frontend-ci`): Node 20, TypeScript compilation check (`tsc --noEmit`), Vitest integration test suite, Vite production build.
   - Job 3 (`docker-build-push`): Multi-arch Docker Buildx, authenticated login to GitHub Container Registry (`ghcr.io`), tag & publish backend and frontend images with layer cache reuse (`type=gha`).
6. **Branch Protection & Secret Hygiene**:
   - `.github/BRANCH_PROTECTION.md`: 5 mandatory rules (Require PR reviews, required status checks `backend-ci`, `frontend-ci`, `docker-build-push`, linear commit history, no force pushes, admin enforcement).
   - `.github/CODEOWNERS`: Mandatory reviewer assignment.
   - `.env.docker.example` & `.env.docker`: Secure configuration template with zero committed production credentials.

### Main Purpose
To convert a multi-tier AI-powered e-commerce application (FastAPI, React Vite, ChromaDB Vector RAG, Redis, Celery, PostgreSQL) into an enterprise-grade, reproducible, containerized microservices stack deployable in one command (`docker compose up --build -d`) with automated cloud CI/CD quality gates.

### Actual Project Paths and URLs
- **Project Root**: `E:\PYTHON\day23`
- **Git Repository**: `E:\PYTHON\coastal_seven_tasks_day21_22` (`https://github.com/sujithaCS6-G7/coastal_seven_tasks.git`)
- **Docker Compose File**: `E:\PYTHON\day23\docker-compose.yml`
- **Frontend SPA URL**: `http://localhost:3000`
- **Backend API URL**: `http://localhost:8000`
- **Backend Swagger API Docs**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/api/v1/health`
- **Nginx Health Check**: `http://localhost:3000/nginx-health`

---

## 2. Packages and Configuration

### Actual Python Dependencies (`backend/requirements.txt`)
```text
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
sqlalchemy>=2.0.36
psycopg2-binary>=2.9.10
pydantic>=2.10.0
pydantic-settings>=2.6.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.17
redis>=5.2.0
celery>=5.4.0
pillow>=11.0.0
slowapi>=0.1.9
chromadb>=0.5.23
google-genai>=1.0.0
groq>=0.15.0
mistralai>=1.5.0
langchain>=0.3.14
langchain-core>=0.3.29
pytest>=8.3.4
pytest-asyncio>=0.25.0
pytest-cov>=6.0.0
httpx>=0.28.1
ruff>=0.8.6
pyyaml>=6.0.2
```

### Actual Frontend Packages (`frontend/package.json`)
```json
{
  "name": "day21-ai-focus-descriptions-cache-moderation-agents",
  "version": "21.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.8",
    "axios": "^1.7.9",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "tailwind-merge": "^2.5.5",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "msw": "^2.7.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

### `package.json` vs `package-lock.json` in Our Project
- **`package.json`**: Declares intended semantic versioning ranges for packages (e.g., `"vite": "^5.4.11"` means any compatible version $\ge 5.4.11$ and $< 6.0.0$). Developers edit this.
- **`package-lock.json`**: Locks down the **exact immutable dependency tree** (exact version `5.4.21`, integrity SHA-512 hashes, resolved registry URLs, sub-dependencies).
- **Docker Multi-Stage Build Benefit**: In `frontend/Dockerfile`:
  ```dockerfile
  COPY package.json package-lock.json* ./
  RUN npm install
  ```
  Docker caches the `RUN npm install` layer as long as neither `package.json` nor `package-lock.json` changes. Subsequent builds take 1–2 seconds instead of minutes.

---

## 3. Practical API Questions

### Actual Swagger Endpoints List
From `http://localhost:8000/docs`:
1. `GET /api/v1/health` – Comprehensive subsystem health (DB, Redis, Celery, ChromaDB, OWASP security, active WebSockets).
2. `GET /products/` – Catalog query with offset, limit, category filtering, and Redis cache-aside.
3. `POST /products/` – Admin product creation with file upload and image resizing.
4. `GET /products/search` – PostgreSQL Full-Text Search (`tsvector`) and Fuzzy Search (`pg_trgm`).
5. `POST /auth/login` – OAuth2 Password grant generating HS256 JWT access token.
6. `GET /auth/me` – Current authenticated user profile with Bearer JWT token.
7. `GET /cart/` – User shopping cart stored in Redis with 24-hour TTL.
8. `POST /cart/items` – Add product item to cart.
9. `POST /orders/checkout` – Atomic database transaction for order placement and stock deduction.
10. `POST /tasks/invoices/{order_id}` – Trigger asynchronous Celery PDF invoice generation.
11. `GET /tasks/{task_id}` – Poll Celery task lifecycle (`PENDING` $\to$ `STARTED` $\to$ `COMPLETED` / `FAILED`).
12. `GET /ai/status` – AI telemetry, ChromaDB vector stats, Redis AI cache metrics, rate limit status.
13. `GET /ai/search` – Semantic vector similarity search against ChromaDB collection `nexora_products`.
14. `POST /ai/descriptions/generate` – Grounded product description generator with multi-provider fallback.
15. `POST /ai/agent/execute` – Safe tool-calling agent with allowlisted tools (`search_products_tool`, `get_product_details_tool`, `check_inventory_value_tool`).
16. `GET /ai/deployment/readiness` – Automated 12-point production verification checklist.

### Important Request & Response Payloads

#### 1. System Health Check
- **Endpoint**: `GET http://localhost:8000/api/v1/health`
- **Method**: `GET`
- **Authentication**: None (Public)
- **Status Code**: `200 OK`
- **Actual Response JSON**:
```json
{
  "status": "online",
  "app_name": "NexoraAI Production E-Commerce Store",
  "version": "23.0.0",
  "database": {
    "name": "day10_db",
    "type": "PostgreSQL",
    "connected": true
  },
  "redis": {
    "status": "connected",
    "connected": true
  },
  "security": {
    "rate_limiter": "SlowAPI (active)",
    "owasp_headers_enabled": true,
    "gzip_compression_minimum_bytes": 500
  },
  "active_websockets": 0,
  "docs_url": "/docs"
}
```

#### 2. Products Query (Reverse-Proxied through Nginx)
- **Endpoint**: `GET http://localhost:3000/products/?limit=6&offset=0`
- **Method**: `GET`
- **Frontend Caller**: `frontend/src/api/productService.ts` via `apiClient.get('/products/')`
- **Status Code**: `200 OK`
- **Actual Response JSON**:
```json
{
  "total": 6,
  "products": [
    {
      "id": 1,
      "name": "Laptop Pro 15",
      "description": "High-performance laptop with 16GB RAM and 512GB SSD.",
      "price": 1299.99,
      "stock": 25,
      "category": "Electronics",
      "image_url": "/uploads/products/laptop.jpg"
    },
    {
      "id": 2,
      "name": "Wireless Noise-Cancelling Headphones",
      "description": "Premium over-ear headphones with 30-hour battery life.",
      "price": 199.99,
      "stock": 50,
      "category": "Audio",
      "image_url": "/uploads/products/headphones.jpg"
    }
  ],
  "cached": false
}
```

---

## 4. Actual Code Understanding

### Key Files & Responsibilities
| File Path | Role | Key Functions / Definitions |
|---|---|---|
| `backend/Dockerfile` | Production container build | Multi-stage: `builder` $\to$ `runtime`, unprivileged user `appuser`, `HEALTHCHECK`. |
| `frontend/Dockerfile` | Production frontend container | Multi-stage: Node 20 `builder` $\to$ `nginx:alpine` runner, SPA bundle copy. |
| `frontend/nginx.conf` | Web server & API Gateway | GZip compression, SPA fallback, OWASP headers, `^~ /uploads/` priority proxy, `/api/` & `/products/` reverse proxy. |
| `docker-compose.yml` | Stack Orchestrator | Defines 6 services, `nexora-net` bridge, persistent volumes, dependencies, healthchecks. |
| `.github/workflows/ci.yml` | CI/CD automation | 3 jobs: `backend-ci` (Postgres/Redis services), `frontend-ci` (Vitest/Typecheck), `docker-build-push` (GHCR Buildx). |
| `backend/tests/test_day23_devops.py` | Automated DevOps test suite | 7 unit tests validating Dockerfiles, Compose YAML, CI YAML, Branch Protection, Healthchecks. |
| `frontend/src/config/env.ts` | Frontend environment manager | Dynamic base URL resolver: uses `window.location.origin` in browser, preserves test defaults in Vitest. |
| `frontend/src/api/axiosClient.ts` | HTTP Client | Axios instance with JWT bearer interceptor and baseURL runtime resolution. |

### Data Flow Diagram
```
Client Browser (http://localhost:3000)
       │
       ▼
[Nginx:80 in nexora-frontend]
 ├── Static JS/CSS/HTML ──> Served from /usr/share/nginx/html
 ├── /uploads/* ──────────> Proxied to http://backend:8000/uploads/
 ├── /ws/* ───────────────> WebSocket Upgrade to http://backend:8000/ws/
 └── /products, /api/* ───> Proxied to http://backend:8000
                                 │
                                 ▼
                     [FastAPI in nexora-backend:8000]
                      ├── SlowAPI Rate Limiter & OWASP Middleware
                      ├── PostgreSQL (nexora-postgres:5432)
                      ├── Redis (nexora-redis:6379)
                      ├── ChromaDB (/app/chroma_data)
                      └── Celery Queue (nexora-redis:6379/1)
                                 │
                        ┌────────┴────────┐
                        ▼                 ▼
              [nexora-celery-worker]  [nexora-celery-beat]
```

---

## 5. Commands and Logs

### Actual Commands Executed
1. **WSL and Hypervisor Installation**:
   ```powershell
   wsl --install
   Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All
   ```
2. **Build and Start Docker Stack**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File E:\PYTHON\day23\docker-start.ps1
   ```
3. **Verify Container Status**:
   ```powershell
   docker compose ps
   ```
4. **Nginx Hot-Reload**:
   ```powershell
   docker cp E:\PYTHON\day23\frontend\nginx.conf nexora-frontend:/etc/nginx/conf.d/default.conf
   docker exec nexora-frontend nginx -s reload
   ```
5. **Execute Test Suites**:
   - Backend Pytest:
     ```powershell
     powershell -ExecutionPolicy Bypass -File E:\PYTHON\day23\run_tests.ps1
     ```
   - Frontend Vitest:
     ```powershell
     cmd.exe /c "npm run test:run"
     ```

### Actual Errors Encountered & Resolved
1. **Error 1: Docker daemon connection failed**:
   - *Message*: `failed to connect to the docker API at npipe:////./pipe/docker_engine; check if the path is correct and if the daemon is running: open //./pipe/docker_engine: The system cannot find the file specified.`
   - *Root Cause*: Windows Subsystem for Linux (WSL) and Virtual Machine Platform kernel hypervisor drivers required a machine reboot to initialize.
   - *Fix*: Rebooted Windows laptop, launched Docker Desktop, and confirmed `OSType: linux` in `docker info`.
2. **Error 2: No configuration file provided**:
   - *Message*: `no configuration file provided: not found`
   - *Root Cause*: User ran `docker compose ps` from root folder `E:\PYTHON` where `docker-compose.yml` did not exist.
   - *Fix*: Created a root redirect `E:\PYTHON\docker-compose.yml` with `name: day23` and `include: [day23/docker-compose.yml]` so commands succeed from any directory.
3. **Error 3: Product images returning 404 in browser**:
   - *Message*: `HTTP/1.1 404 Not Found` for `/uploads/products/laptop.jpg` on `http://localhost:3000`.
   - *Root Cause*: In `frontend/nginx.conf`, regular expression location `location ~* \.(jpg|png)$` had higher precedence than prefix location `location /uploads/`, intercepting image requests and searching local static files.
   - *Fix*: Changed location directive to `location ^~ /uploads/` (`^~` stops regex matching) and bind-mounted `./backend/uploads:/app/uploads`. Verified HTTP 200 OK.
4. **Error 4: Vitest expected port 8005 while browser used port 3000**:
   - *Message*: `AssertionError: expected 'ws://localhost:3000/ws/orders/2' to be 'ws://localhost:8005/ws/orders/2'`
   - *Root Cause*: `env.ts` was unconditionally using `window.location.origin` in JSDOM where port was set to 3000.
   - *Fix*: Added `const isTest = import.meta.env?.MODE === 'test'` guard in `env.ts` to return test defaults in Vitest while using dynamic origin in the browser.

---

## 6. Testing

### Actual Test Results
- **Backend Test Suite (`pytest`)**:
  - Command: `python.exe -m pytest tests/test_day20_ai.py tests/test_day21_ai.py tests/test_day22_ai_project.py tests/test_day23_devops.py -v`
  - Result: **38 passed in 25.87s** (100% pass rate).
  - Scope: 7 dedicated Day 23 DevOps tests + 31 AI/RAG/Celery/WebSocket tests.
- **Frontend Test Suite (`vitest`)**:
  - Command: `cmd.exe /c "npm run test:run"`
  - Result: **7 test files passed, 49 tests passed in 8.59s** (100% pass rate).
- **Combined Total**: **87 / 87 automated tests passing**.

### Test Classification
- **Mocked Tests**:
  - Gemini LLM responses mocked with synthetic text in `test_day21_ai.py`.
  - Frontend MSW (Mock Service Worker) intercepts `/auth/me`, `/products/`, `/orders/` in `components.test.tsx` and `day17.test.tsx`.
- **Live / Integration Tests**:
  - Real PostgreSQL and Redis container healthchecks in `docker-compose.yml`.
  - ChromaDB vector store indexing and query retrieval in `test_day20_ai.py`.
  - YAML structure parsing and validation in `test_day23_devops.py`.
  - Live HTTP curl checks against `http://localhost:8000/api/v1/health` and `http://localhost:3000/products/`.

---

## 7. Trainer Reverse Questions (15 Questions with 1–3 Sentence Answers)

1. **Why did we use a multi-stage Dockerfile for the backend?**  
   *Answer*: Multi-stage builds separate the build environment from the production runtime. It installs heavy compilers like `gcc` in the builder stage and copies only compiled packages into the final slim image, reducing image size and eliminating security vulnerabilities.

2. **Why does the backend container switch to `USER appuser` instead of running as root?**  
   *Answer*: Running as a non-root unprivileged user follows the Principle of Least Privilege. If an attacker compromises the container through an application vulnerability, they cannot modify host files or escalate root privileges.

3. **Why did we use Nginx Alpine for the frontend instead of `npm run dev`?**  
   *Answer*: Vite dev server is meant only for local development and lacks production caching, GZip compression, and process resilience. Nginx serves pre-compiled static assets with microsecond latency and acts as a reverse proxy for backend APIs.

4. **What is the purpose of `try_files $uri $uri/ /index.html;` in `nginx.conf`?**  
   *Answer*: Single Page Applications (React) handle routing on the client side using the HTML5 History API. When a user directly visits a path like `/semantic-search`, Nginx redirects the request to `index.html` so React Router can render the page instead of returning 404.

5. **Why do we need a custom bridge network (`nexora-net`) in `docker-compose.yml`?**  
   *Answer*: The default bridge network does not provide automatic container DNS resolution. Custom bridge networks allow containers to communicate using service names like `http://backend:8000` or `redis://redis:6379`.

6. **Why did we configure healthchecks for PostgreSQL and Redis with `condition: service_healthy`?**  
   *Answer*: Just starting a container does not mean the database is ready to accept queries. Healthchecks ensure the backend does not start until PostgreSQL responds to `pg_isready` and Redis responds to `ping`.

7. **Why was `^~` added to `location ^~ /uploads/` in `nginx.conf`?**  
   *Answer*: In Nginx, regular expression location blocks normally override prefix locations. The `^~` modifier forces Nginx to stop searching regular expressions when `/uploads/` matches, preventing images from returning 404.

8. **What does the GitHub Actions `docker-build-push` job do?**  
   *Answer*: It uses Docker Buildx to build production container images and authenticates to GitHub Container Registry (`ghcr.io`) using `GITHUB_TOKEN`. It tags images with Git commit SHAs and publishes them with GitHub Actions layer caching.

9. **What is the difference between `package.json` and `package-lock.json`?**  
   *Answer*: `package.json` specifies allowed version ranges using symbols like `^` and `~`. `package-lock.json` locks down the exact immutable version and SHA integrity hash of every installed package, guaranteeing identical builds across machines.

10. **Why did Celery Beat fail with `[Errno 13] Permission denied: 'celerybeat-schedule'` and how was it fixed?**  
    *Answer*: Celery Beat runs as unprivileged `appuser` and tried to write its schedule file to `/app` which was owned by root. Adding `-s /tmp/celerybeat-schedule` solved it because `/tmp` has write permissions for all users.

11. **Why do we use named volumes (`postgres_data`, `redis_data`) instead of storing data inside the container?**  
    *Answer*: Containers are ephemeral and lose all internal state when destroyed or upgraded. Named Docker volumes store database files on the host disk independently of the container lifecycle.

12. **Why was `Set-Location $PSScriptRoot` added to `docker-start.ps1`?**  
    *Answer*: Without it, running the script from outside the `day23` folder caused Docker Compose to look for `docker-compose.yml` in the wrong current working directory. Setting location to `$PSScriptRoot` guarantees it always executes within `day23`.

13. **What is the purpose of `.dockerignore` in both frontend and backend?**  
    *Answer*: It prevents bulky and sensitive directories like `.venv`, `node_modules`, `.git`, and `.env` from being copied into the Docker build context. This speeds up build times and prevents secret leaks.

14. **How does Nginx handle live WebSocket connections for orders and chat?**  
    *Answer*: Nginx inspects the request headers for `Upgrade: websocket` and `Connection: "upgrade"` under the `/ws/` location block. It establishes a persistent HTTP/1.1 tunnel directly to FastAPI on port 8000.

15. **How did we verify that all Day 23 DevOps requirements were satisfied?**  
    *Answer*: We wrote and executed automated tests in `test_day23_devops.py` that parse and validate the Dockerfiles, Compose YAML, CI workflow, and branch protection files. All 38 backend and 49 frontend tests pass 100%.

---

## 8. Practical Demonstration Guide

When the trainer asks you to demonstrate specific components during the meeting, follow these exact navigation steps:

### Demonstration 1: Docker Desktop Application GUI
1. **What to open**: Docker Desktop window on the host machine.
2. **Where to click**: Left sidebar $\to$ **Containers**.
3. **What to point out**:
   - The **`day23`** compose application group.
   - Expand the group to reveal all 6 active microservices: `nexora-frontend`, `nexora-backend`, `nexora-postgres`, `nexora-redis`, `nexora-celery-worker`, `nexora-celery-beat`.
   - Show that all services have **green indicators (Running / Healthy)**.
   - Click the port link **`3000:80`** next to `nexora-frontend` to demonstrate that it immediately opens the web app in the browser.
4. **What to say**:
   > *"Here you can see the complete 6-service microservices architecture managed by Docker Compose. All services are healthy, isolated within the custom `nexora-net` bridge network, and persistent state is maintained across restarts via named volumes."*

### Demonstration 2: Live Frontend SPA & Catalog Images
1. **What to open**: Browser at `http://localhost:3000`.
2. **What to point out**:
   - The product catalog rendering all 6 products: Laptop Pro 15, Wireless Noise-Cancelling Headphones, Mechanical Keyboard, 4K Monitor, Wireless Mouse, iPhone 16 Pro Max.
   - Point out that **real product images are loading with HTTP 200 OK** (not broken icon placeholders).
   - Point out the footer status badge: `FastAPI (:3000) Connected • ChromaDB + Redis + Guardrails Active`.
3. **What to say**:
   > *"The frontend is served by Nginx Alpine in production mode. Nginx acts as our reverse proxy: API requests to `/products/` and media requests to `/uploads/` are seamlessly routed to FastAPI on port 8000 while maintaining client-side single-origin security."*

### Demonstration 3: Backend Swagger API & Container Health Check
1. **What to open**: Browser at `http://localhost:8000/docs` and `http://localhost:8000/api/v1/health`.
2. **What to point out**:
   - In `/api/v1/health`: Show `"database": {"connected": true}` and `"redis": {"connected": true}`.
   - Point out the OWASP security headers and SlowAPI rate limiter indicators.
   - In Swagger docs: Show the 16 interactive API endpoint groups.
3. **What to say**:
   > *"This is the FastAPI backend running in an unprivileged container on Python 3.12-slim. It exposes an automated health endpoint that validates active database pooling and Redis broker connectivity before Docker flags the container as healthy."*

### Demonstration 4: Terminal Container Status & Automated Tests
1. **What to open**: VS Code PowerShell terminal.
2. **Commands to run**:
   ```powershell
   docker compose ps
   powershell -ExecutionPolicy Bypass -File E:\PYTHON\day23\run_tests.ps1
   ```
3. **What to point out**:
   - The `docker compose ps` table displaying all 6 services with `Up (healthy)`.
   - The Pytest output showing **`38 passed in 25.87s`**, highlighting `test_day23_devops.py`.
4. **What to say**:
   > *"Our stack is verified both at runtime and through automated CI test suites. Every Dockerfile, Compose setting, volume mount, and CI workflow is validated by our 87 automated tests."*

---
*Report Generated: 2026-10-15*  
*Repository Commit: `a4caefd` (Clean & Synced with GitHub origin/main)*

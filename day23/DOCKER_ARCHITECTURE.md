# NexoraAI Docker Architecture, Networking, Volumes & Secret Management

This architecture guide details the containerization, networking topology, persistent storage volumes, and secret management strategies implemented in Day 23.

---

## 1. Multi-Stage Docker Build Architecture

Multi-stage builds optimize production images by separating build dependencies from the final minimal runtime environment:

### Backend Multi-Stage Pipeline (`backend/Dockerfile`)
```
[Stage 1: Builder (python:3.12-slim)]
  ├── Install OS build-essential, gcc, libpq-dev
  ├── Download & compile Python wheels into /install
  └── Drop build tools and compile caches
         │
         ▼ (COPY --from=builder /install /usr/local)
[Stage 2: Runtime (python:3.12-slim)]
  ├── Only minimal runtime libraries (libpq5, curl)
  ├── Unprivileged system user `appuser` (UID: 10001)
  ├── Copy application source code
  └── Health Check: curl -f http://localhost:8000/api/v1/health
```

### Frontend Multi-Stage Pipeline (`frontend/Dockerfile`)
```
[Stage 1: Builder (node:20-alpine)]
  ├── Install npm packages with package-lock caching
  ├── Run TypeScript type checking
  └── Compile Vite production bundle into /app/dist
         │
         ▼ (COPY --from=builder /app/dist /usr/share/nginx/html)
[Stage 2: Runner (nginx:alpine)]
  ├── Custom nginx.conf with GZip & OWASP headers
  ├── Single-Page Application (SPA) routing fallback
  ├── Reverse proxy /api, /ws, /uploads to backend:8000
  └── Health Check: wget -qO- http://localhost:80/nginx-health
```

---

## 2. Docker Networking Topology

NexoraAI uses an isolated custom bridge network named `nexora-net`:

```
                 ┌────────────────────────────────────────────────────────┐
                 │                nexora-network (bridge)                 │
                 │                                                        │
   Host:3000 ───►│ [nexora-frontend] (Nginx on port 80)                   │
                 │        │                                               │
                 │        │ Reverse Proxy (/api, /ws, /uploads)           │
                 │        ▼                                               │
   Host:8000 ───►│ [nexora-backend] (FastAPI Uvicorn on port 8000)        │
                 │        │                        │                      │
                 │        ▼                        ▼                      │
   Host:5432 ───►│ [nexora-postgres]      [nexora-redis] ◄─── Host:6379   │
                 │  (PostgreSQL 16)         (Redis 7)                     │
                 │        ▲                        ▲                      │
                 │        │                        │                      │
                 │ [nexora-celery-worker] ─────────┘ (Broker / Backend)   │
                 │ [nexora-celery-beat]                                   │
                 └────────────────────────────────────────────────────────┘
```

### Key Networking Principles:
1. **Container DNS Resolution**: Containers address each other by their service names (`postgres`, `redis`, `backend`) rather than hardcoded IP addresses.
2. **Reverse Proxying**: The browser only needs to communicate with `frontend:80` (mapped to `host:3000`). Nginx internally routes `/api/` and `/ws/` calls to `http://backend:8000`.
3. **Isolation**: Internal database traffic between `backend`, `postgres`, and `redis` remains private within `nexora-net`.

---

## 3. Persistent Named Volumes

Containers have ephemeral filesystems; when a container is removed, all unmounted data inside it is lost. To persist state across deployments, restarts, and image updates, 4 named Docker volumes are configured:

| Volume Name | Target Container Path | Content Stored | Persistence Rationale |
| :--- | :--- | :--- | :--- |
| `postgres_data` | `/var/lib/postgresql/data` | Relational tables, catalog items, orders, users, GIN full-text indexes | Retains core business transactions across DB updates |
| `redis_data` | `/data` | Redis Append-Only File (AOF), active shopping carts, AI response cache | Survives Redis container restarts with fast reload |
| `chroma_data` | `/app/chroma_data` | ChromaDB vector embeddings, SQLite metadata, index collections | Avoids costly re-indexing of product vectors |
| `uploads_data` | `/app/uploads` | Uploaded product images, generated PDF invoices | Preserves customer media and downloadable invoices |

---

## 4. Environment & Secret Management

### Defense-in-Depth Secret Architecture:
1. **Never Bake Secrets into Images**: `.dockerignore` files in backend and frontend strictly exclude `.env`, `.env.*`, and credentials.
2. **Template Versioning**: Only `.env.docker.example` is committed to git.
3. **Environment Injection via Docker Compose**: `.env.docker` supplies runtime configurations without modifying container images.
4. **Production Cloud Deployments**:
   - In AWS: Secrets are stored in **AWS Secrets Manager** or **SSM Parameter Store** and injected into ECS / EKS task definitions via IAM role execution.
   - In GitHub Actions: Secrets are stored in **GitHub Repository Secrets** (`${{ secrets.GITHUB_TOKEN }}`, `${{ secrets.PROD_DATABASE_URL }}`).

---

## 5. Quick Command Reference

```bash
# Start all 6 services in detached mode with automatic build
docker compose up --build -d

# Inspect health and running status of all containers
docker compose ps

# View live aggregate logs or service-specific logs
docker compose logs -f backend
docker compose logs -f celery_worker

# Run database migrations or verification inside backend container
docker compose exec backend pytest tests/ -v

# Gracefully stop containers while preserving volume data
docker compose down

# Stop containers and remove volumes (clean slate)
docker compose down -v
```

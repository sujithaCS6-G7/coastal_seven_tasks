# Day 8: High-Performance Async, Redis Caching & Distributed Celery

A modular, enterprise-grade **FastAPI** application showcasing:
- **Async Concurrency**: Microservices orchestration with `asyncio.gather()` (3x speedup).
- **Redis Cache-Aside**: 60s TTL, automatic cache invalidation on mutations.
- **Sliding-Window Rate Limiting**: Microsecond Redis Sorted Sets (`ZSET`) algorithm (5 req/60s).
- **Distributed Background Tasks**: Celery workers (`-P solo` for Windows), real-time `PROGRESS` states, automatic retries.
- **Celery Beat**: Periodic heartbeat (every 30s) and midnight cache cleanup schedules.
- **Flower Dashboard**: Real-time worker and task monitoring at `http://localhost:5555`.
- **JWT Authentication & Swagger Authorize**: OAuth2 Bearer token with green **Authorize 🔓** button in Swagger UI (`/docs`).

---

## 📁 Project Architecture

```text
day8/
│
├── .venv/                         # Virtual environment
│
├── app/                           # Core application package
│   ├── __init__.py
│   ├── main.py                    # FastAPI instance, CORS, routers & Swagger metadata
│   │
│   ├── core/                      # Application configuration
│   │   ├── __init__.py
│   │   └── config.py              # Pydantic Settings & environment variables
│   │
│   ├── database/                  # Database & Redis connectivity
│   │   ├── __init__.py
│   │   └── database.py            # Redis client & in-memory databases (products_db, users_db)
│   │
│   ├── schemas/                   # Pydantic request & response models
│   │   ├── __init__.py
│   │   ├── auth.py                # UserRegister, UserLogin, UserOut, Token
│   │   └── product.py             # ProductCreate, ProductOut
│   │
│   ├── services/                  # Business logic services
│   │   ├── __init__.py
│   │   ├── auth_service.py        # Bcrypt hashing, JWT tokens, OAuth2 dependencies
│   │   ├── cache_service.py       # Redis Cache-Aside get, set, and invalidate
│   │   ├── rate_limit_service.py  # Redis ZSET sliding-window rate limiter
│   │   └── analytics_service.py   # asyncio.gather() parallel service caller
│   │
│   ├── routers/                   # Modular API route controllers
│   │   ├── __init__.py
│   │   ├── health.py              # Root & health check probes
│   │   ├── auth.py                # /auth/register, /auth/login (OAuth2), /auth/me
│   │   ├── products.py            # /products (cached, rate-limited, invalidated on POST)
│   │   ├── analytics.py           # /analytics/benchmark & /analytics/compare
│   │   └── jobs.py                # /jobs (FastAPI BackgroundTasks vs Celery)
│   │
│   └── celery/                    # Distributed asynchronous task processing
│       ├── __init__.py
│       ├── celery_app.py          # Celery instance & Beat schedule definition
│       └── tasks.py               # Long-running reports, retries, and pulse tasks
│
├── tests/                         # Pytest test suite (14 passing tests)
│   ├── __init__.py
│   ├── test_auth.py               # Auth, registration & JWT tests
│   ├── test_products.py           # Cache hit/miss & invalidation tests
│   ├── test_analytics.py          # Async concurrency benchmark tests
│   └── test_jobs.py               # FastAPI vs Celery dispatch tests
│
├── celery_worker.py               # Windows-friendly Celery worker runner (-P solo)
├── celery_beat.py                 # Celery Beat periodic scheduler runner
├── run_flower.py                  # Flower real-time dashboard runner
├── main.py                        # Root launcher script
├── .env                           # Environment configuration
└── README.md                      # Documentation
```

---

## ⚡ How to Run in Terminal

### Step 0: Activate Virtual Environment
Open PowerShell:
```powershell
cd E:\PYTHON\day8
.\.venv\Scripts\Activate.ps1
```
*(If prompted by PowerShell security policy, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned` first).*

---

### Step 1: Start the FastAPI Web Server (Terminal 1)
```powershell
cd E:\PYTHON\day8
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Step 2: Start the Celery Worker (Terminal 2)
```powershell
cd E:\PYTHON\day8
.\.venv\Scripts\Activate.ps1
python celery_worker.py
```
*(Uses `-P solo` pool on Windows to eliminate multiprocessing spawn crashes).*

---

### Step 3: (Optional) Start Celery Beat Scheduler (Terminal 3)
```powershell
cd E:\PYTHON\day8
.\.venv\Scripts\Activate.ps1
python celery_beat.py
```
*Dispatches a heartbeat pulse every 30 seconds and runs scheduled cache cleanup.*

---

### Step 4: (Optional) Start Flower Monitoring Dashboard (Terminal 4)
```powershell
cd E:\PYTHON\day8
.\.venv\Scripts\Activate.ps1
python run_flower.py
```
Open **[http://localhost:5555](http://localhost:5555)** to view live task queues, worker states, and graphs.

---

### Step 5: Run Automated Tests
```powershell
cd E:\PYTHON\day8
.\.venv\Scripts\python.exe -m pytest -v
```
All **14 tests** verify authentication, caching, rate limiting, concurrency, and task dispatching.

---

## 🔐 How to Use Swagger Authentication & Login

1. Navigate to **[http://localhost:8000/docs](http://localhost:8000/docs)**.
2. In the top-right corner, click the green **Authorize 🔓** button.
3. In the modal:
   - **Username**: `admin`
   - **Password**: `password123`
4. Click **Authorize**, then click **Close**.
5. All protected endpoints (such as `GET /auth/me` and `POST /products`) now include your JWT Bearer token automatically!

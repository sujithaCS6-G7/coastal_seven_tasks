# 🛒 Day 10 Mini PROJECT – Production-Grade E-Commerce REST API & Real-Time Engine

A high-performance, enterprise-ready E-Commerce backend built with **FastAPI**, **PostgreSQL (`day10_db`)**, **Redis (Shopping Cart & Cache-Aside)**, **Celery (Asynchronous Task Queue)**, **Pillow (Image Validation & Optimization)**, and **WebSockets (Real-Time Order Tracking)**.

---

## 🌟 Architecture & Core Features

```mermaid
flowchart TD
    Client["Client / Postman / Swagger UI"] -->|HTTP / REST| FastAPI["FastAPI Gateway (:8000)"]
    Client -->|WebSocket| WS["/ws/orders/{user_id}"]
    
    FastAPI -->|JWT Bearer Auth & Role Guard| Auth["Authentication Service"]
    FastAPI -->|Pillow Resize & WebP| Storage["Static Media (/uploads/products)"]
    FastAPI -->|Cache-Aside Catalog| RedisCache[("Redis Cache (:6379)")]
    FastAPI -->|Fast Temporary Cart| RedisCart[("Redis Cart (24h TTL)")]
    FastAPI -->|Atomic Transactions & Foreign Keys| PG[("PostgreSQL: day10_db (:5432)")]
    
    FastAPI -->|Dispatch Non-Blocking Email| CeleryBroker[("Celery Message Broker")]
    CeleryBroker --> CeleryWorker["Celery Background Worker"]
    CeleryWorker -->|Order Confirmation Email| CustomerEmail["Customer Inbox"]
    
    FastAPI -->|Push Order Status Update| WS
    WS -->|Real-time Order Event| Client
```

1. **Authentication & Role-Based Access Control (RBAC)**:
   - Secure password hashing with `bcrypt`.
   - Signed JWT Bearer tokens with configurable expiration (`SECRET_KEY`).
   - Strict role separation: `customer` vs `admin`.
2. **Product Catalog & Pillow Optimization**:
   - Full CRUD operations with category classification and stock auditing.
   - Pillow image upload: validates format, resizes within `800x800` max dimensions, converts to `.webp` for compression.
   - Admin-only modifications automatically invalidate catalog caches.
3. **Redis Shopping Cart (Fast & Ephemeral)**:
   - High-throughput shopping cart stored as Redis Hashes with a 24-hour TTL.
   - Pre-validation of inventory in PostgreSQL prevents over-allocation.
   - Fallback in-memory driver when Redis server is offline.
4. **PostgreSQL Order Management & Atomic Stock Deduction**:
   - Persistent relational data stored in PostgreSQL database `day10_db` on port `5432`.
   - Multi-item checkout executed in atomic transactions to prevent race conditions.
5. **Celery Asynchronous Email Processing**:
   - Background tasks for order confirmation and welcome emails without blocking client requests.
   - Configured through `celery_worker.py` and `app/tasks/email_tasks.py`.
6. **Real-Time WebSocket Order Tracking**:
   - Connection manager (`/ws/orders/{user_id}`) for live client updates.
   - Instant notifications broadcast upon order placement and admin status updates (`CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`).
7. **Comprehensive Test Suite**:
   - 40+ automated pytest tests across authentication, products, cart, orders, and integration workflows with 88%+ code coverage.

---

## 📁 Directory Structure

```text
day10_ecommerce/
├── app/
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py              # User model (id, username, email, hashed_password, role, is_active)
│   │   ├── product.py           # Product model (id, name, description, price, stock, category, image_url)
│   │   └── order.py             # Order & OrderItem models (order_number, total_amount, status, address)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py              # UserRegister, UserLogin, UserOut, Token
│   │   ├── product.py           # ProductCreate, ProductUpdate, ProductOut, ProductListResponse
│   │   ├── cart.py              # CartItemAdd, CartItemUpdate, CartItemOut, CartOut
│   │   └── order.py             # OrderCreate, OrderOut, OrderItemOut, OrderStatusUpdate
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py      # Registration, verification, JWT creation & dependency injection
│   │   ├── product_service.py   # Catalog CRUD, Redis Cache-Aside, Pillow image processing
│   │   ├── cart_service.py      # Redis cart operations & inventory checking
│   │   └── order_service.py     # Atomic checkout, Celery dispatch, WebSocket broadcasting
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py              # /auth endpoints (register, login, me)
│   │   ├── products.py          # /products endpoints (CRUD, image upload, cache)
│   │   ├── cart.py              # /cart endpoints (add, update, delete, clear)
│   │   ├── orders.py            # /orders endpoints (checkout, list, get, status update)
│   │   └── websocket.py         # /ws endpoints (real-time order feed, diagnostics)
│   ├── tasks/
│   │   ├── __init__.py
│   │   └── email_tasks.py       # Celery order confirmation and welcome emails
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── security.py          # Bcrypt hashing & PyJWT token utilities
│   │   └── redis_client.py      # Redis connection manager with fallback
│   ├── config.py                # Pydantic Settings (.env configuration)
│   ├── database.py              # PostgreSQL (day10_db) engine, SessionLocal, init_db
│   └── main.py                  # FastAPI application entry point, CORS, static routes
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Pytest fixtures (SQLite in-memory, admin/customer tokens)
│   ├── test_auth.py             # 8 authentication & authorization tests
│   ├── test_products.py         # 11 product catalog, caching & image upload tests
│   ├── test_cart.py             # 9 Redis cart & inventory limit tests
│   ├── test_orders.py           # 8 order checkout & status transition tests
│   └── test_api.py              # 6 integration, WebSocket, Celery & E2E tests
├── uploads/
│   └── products/                # Statically served product images
├── celery_worker.py             # Celery entrypoint worker script
├── postman_collection.json      # Comprehensive Postman test collection
├── pyproject.toml               # Project metadata & pytest configuration
├── requirements.txt             # Dependency specification
├── .env                         # Environment variables configuration
└── README.md                    # Project documentation
```

---

## ⚙️ Prerequisites & Setup

### 1. Requirements
- **Python**: 3.12+ (or 3.14 with `uv`)
- **PostgreSQL**: Running on `localhost:5432` with database `day10_db`
- **Redis**: Running on `localhost:6379`
- **uv**: Modern, fast Python package manager

### 2. Environment Configuration (`.env`)
```ini
APP_NAME=Day 10 E-Commerce Mini Project
VERSION=1.0.0
DEBUG=True

# Database Configuration (PostgreSQL day10_db)
DATABASE_URL=postgresql+psycopg2://postgres:Suji%40123@localhost:5432/day10_db

# Redis & Celery
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# JWT Security
SECRET_KEY=super-secret-jwt-key-day10-ecommerce-production-hash-key-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

### 3. Install Dependencies
```powershell
uv venv
uv pip install -r requirements.txt
```

---

## 🚀 Running the Application

### 1. Launch FastAPI Server
```powershell
uv run uvicorn app.main:app --reload --port 8000
```
- **Root Health Check**: [http://localhost:8000/](http://localhost:8000/)
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 2. Launch Celery Worker (Optional Background Worker)
In a separate terminal window:
```powershell
uv run celery -A celery_worker.celery_app worker --loglevel=info -P solo
```
*(On Windows, `-P solo` ensures stable thread execution for Celery workers).*

---

## 🗄️ Database Verification (PostgreSQL & pgAdmin)

The database automatically initializes upon startup, creating 4 relational tables and seeding sample catalog items and an admin account.

### Database Credentials:
- **Host**: `localhost`
- **Port**: `5432`
- **Database Name**: `day10_db`
- **Username**: `postgres`
- **Password**: `Suji@123`

### Inspecting in pgAdmin:
1. Open **pgAdmin 4**.
2. Connect to **Servers ➔ PostgreSQL 17** (or local instance).
3. Expand **Databases ➔ `day10_db` ➔ Schemas ➔ `public` ➔ Tables**.
4. You will see:
   - `users`: Registered users with hashed passwords and roles.
   - `products`: Catalog items, price, stock, category, and Pillow image paths.
   - `orders`: Confirmed purchases, shipping addresses, totals, and lifecycle statuses.
   - `order_items`: Line items linking order IDs to products.

### Default Admin Account:
- **Username**: `admin`
- **Password**: `password123`
- **Role**: `admin`

---

## 🧪 Automated Testing (Pytest)

The project includes **42 automated test cases** covering every layer of the application:

```powershell
uv run pytest -v
```

### Test Coverage Highlights:
| Test File | Tests | Features Verified |
| :--- | :---: | :--- |
| `tests/test_auth.py` | 8 | Customer registration, duplicate email/username rejection, login, JWT token issuance, protected profiles |
| `tests/test_products.py` | 11 | Catalog listing, Redis cache-aside caching, category filtering, admin CRUD, Pillow image resizing & format validation |
| `tests/test_cart.py` | 9 | Redis cart storage, quantity updates, inventory ceiling enforcement, item deletion, full cart clearing |
| `tests/test_orders.py` | 8 | Cart checkout, atomic database stock deduction, order history, owner authorization, admin status transitions |
| `tests/test_api.py` | 6 | Root health probe, WebSocket connection & handshake, Celery async email execution, complete E2E purchase flow |
| **Total** | **42** | **100% Passed (88%+ Statement Coverage)** |

---

## 📡 API Endpoints Reference

### 1. System Status
- `GET /`: Health check, PostgreSQL (`day10_db`) connection probe, Redis status, and system metadata.

### 2. Authentication & Users (`/auth`)
- `POST /auth/register`: Create a new user account (`customer` or `admin`).
- `POST /auth/login`: Authenticate credentials and receive JWT Bearer token.
- `GET /auth/me`: Retrieve profile of currently authenticated user.

### 3. Products & Catalog (`/products`)
- `GET /products/`: Retrieve catalog items with Redis Cache-Aside acceleration and category filtering.
- `GET /products/{product_id}`: Retrieve detailed specifications of a product.
- `POST /products/`: **[Admin]** Create a new catalog item (auto-invalidates cache).
- `PUT /products/{product_id}`: **[Admin]** Update product name, price, or inventory.
- `DELETE /products/{product_id}`: **[Admin]** Delete product and clear cache.
- `POST /products/{product_id}/image`: **[Admin]** Upload and optimize product image with Pillow.

### 4. Redis Shopping Cart (`/cart`)
- `GET /cart/`: View shopping cart items and calculated totals from Redis.
- `POST /cart/items`: Add product to cart with PostgreSQL stock verification.
- `PUT /cart/items/{product_id}`: Update line item quantity.
- `DELETE /cart/items/{product_id}`: Remove specific product from cart.
- `DELETE /cart/`: Clear user's entire shopping cart.

### 5. Orders & Checkout (`/orders`)
- `POST /orders/checkout`: Convert Redis cart into PostgreSQL order, atomically deduct inventory, clear cart, enqueue Celery confirmation email, and push WebSocket notification.
- `GET /orders/`: List all orders placed by the current user.
- `GET /orders/{order_id}`: Retrieve order details (requires owner or admin access).
- `PUT /orders/{order_id}/status`: **[Admin]** Update order lifecycle status (`PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED` ➔ `CANCELLED`).

### 6. WebSockets (`/ws`)
- `WS /ws/orders/{user_id}`: Real-time bidirectional connection for live order updates and notifications.
- `GET /ws/status`: Active WebSocket connection diagnostics.

---

## 📬 Postman Collection

Import `postman_collection.json` directly into Postman:
1. Open Postman ➔ Click **Import**.
2. Select `postman_collection.json` from `E:\PYTHON\day10_ecommerce\`.
3. Set your collection variables (auto-populated by test scripts during login):
   - `baseUrl`: `http://localhost:8000`
   - `adminToken`: Automatically saved on `Login Admin`
   - `customerToken`: Automatically saved on `Login Customer`

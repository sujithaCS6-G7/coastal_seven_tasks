# Day 9: File Uploads, Image Processing & WebSockets

A production-grade **FastAPI** application showcasing:
- **Secure File Uploads**: Extension validation, MIME type checks, Pillow magic bytes verification, and DoS decompression bomb prevention.
- **Pillow Image Processing**: Automatic generation of thumbnails (`150x150`) and medium variants (`800x800`) with aspect-ratio preservation.
- **PostgreSQL Database (`day9_db` in pgAdmin)**: Persistent storage for uploaded file metadata (filename, dimensions, sizes, URLs).
- **WebSockets**: Real-time broadcast notifications (`file_uploaded`, `file_deleted`), subscriber connection manager, and bidirectional live chat.
- **Interactive UI**: Live web dashboard at `http://localhost:8000/`.
- **Swagger Documentation**: Interactive OpenAPI documentation at `http://localhost:8000/docs`.

---

## 📁 Project Architecture

```text
day9/
│
├── .venv/                         # Virtual environment
│
├── app/                           # Core application package
│   ├── __init__.py
│   ├── main.py                    # FastAPI instance, static mounts, CORS & Swagger metadata
│   │
│   ├── core/                      # Application configuration
│   │   ├── __init__.py
│   │   ├── config.py              # Pydantic Settings & environment variables
│   │   └── logging_config.py      # Structured console logging
│   │
│   ├── database/                  # PostgreSQL connection layer (day9_db)
│   │   ├── __init__.py
│   │   ├── database.py            # SQLAlchemy engine, session maker & connection checks
│   │   └── models.py              # UploadedFile database model
│   │
│   ├── schemas/                   # Pydantic request & response models
│   │   ├── __init__.py
│   │   └── upload.py              # ImageMetadata, FileListResponse, MessageResponse
│   │
│   ├── services/                  # Business logic services
│   │   ├── __init__.py
│   │   ├── file_service.py        # Low-level disk file persistence
│   │   ├── image_service.py       # Pillow resizing, format checks, and PostgreSQL storage
│   │   └── notification_service.py# WebSocket notification dispatcher
│   │
│   ├── websocket/                 # WebSocket connection management
│   │   ├── __init__.py
│   │   └── connection_manager.py  # ConnectionManager, client tracking, and broadcast
│   │
│   ├── routers/                   # Modular API route controllers
│   │   ├── __init__.py
│   │   ├── health.py              # Root & health check probes
│   │   ├── upload.py              # /api/v1/files (upload, list, detail, delete)
│   │   └── websocket.py           # /ws (status, broadcast, notifications, chat)
│   │
│   └── utils/                     # Security & validation helpers
│       ├── __init__.py
│       └── validators.py          # Extension, MIME, size & magic bytes validation
│
├── uploads/                       # File storage directory
│   ├── images/
│   └── processed/
│
├── static/                        # Static assets and dashboard
│   ├── images/
│   └── index.html                 # Interactive WebSocket & File Upload web studio
│
├── tests/                         # Pytest test suite
│   ├── __init__.py
│   ├── conftest.py                # Fixtures and temporary upload isolation
│   ├── test_upload.py             # File upload, resizing, and validation tests
│   ├── test_websocket.py          # Real-time WebSocket event and broadcast tests
│   └── test_health.py             # System probe tests
│
├── .github/
│   └── workflows/
│       └── tests.yml              # CI workflow configuration
│
├── .env                           # Environment configuration
├── .gitignore                     # Git ignore rules
├── requirements.txt               # Dependencies
├── pyproject.toml                 # Project metadata
├── .pre-commit-config.yaml        # Quality hooks
├── mypy.ini                       # Type checking configuration
├── main.py                        # Root launcher script
└── README.md                      # Documentation
```

---

## ⚡ How to Run in Terminal

### Step 1: Activate Virtual Environment
Open PowerShell in the `day9` folder:
```powershell
cd E:\PYTHON\day9
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned)
.\.venv\Scripts\Activate.ps1
```

---

### Step 2: Start the FastAPI Web Server
```powershell
uvicorn app.main:app --reload --port 8000
```
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live Interactive Dashboard**: [http://localhost:8000/](http://localhost:8000/)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Step 3: Run Automated Tests
```powershell
python -m pytest -v
```

---

## 🗄️ PostgreSQL Database (pgAdmin)

- **Database Name in pgAdmin**: **`day9_db`**
- **Host**: `localhost` (Port: `5432`)
- **Username**: `postgres`
- **Password**: `Suji@123`
- **Table**: **`uploaded_files`** (tracks `id`, `original_filename`, `stored_filename`, `content_type`, `format`, `size_bytes`, `width`, `height`, `uploaded_at`, `thumbnail_url`, `medium_url`).

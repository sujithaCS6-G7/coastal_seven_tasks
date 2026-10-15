# ==============================================================================
# Multi-Stage Dockerfile for NexoraAI Backend (FastAPI + Celery + ChromaDB)
# Stage 1: Builder - Build and compile Python dependencies into a clean prefix
# Stage 2: Runtime - Minimal, hardened Python 3.12-slim image running as non-root
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build-time OS dependencies required for C-extensions (psycopg2, numpy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip & install Python dependencies into an isolated prefix
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

# Install minimal runtime libraries (curl for container HEALTHCHECK, libpq5 for Postgres)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group for container security (Principle of Least Privilege)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -m appuser

# Copy installed Python packages from builder stage
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy application source code with non-root ownership
COPY --chown=appuser:appgroup . /app

# Ensure directories for static uploads and ChromaDB persistent storage exist with correct permissions
RUN mkdir -p /app/uploads/products /app/uploads/invoices /app/chroma_data && \
    chown -R appuser:appgroup /app/uploads /app/chroma_data

# Environment configuration
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    AI_ZERO_COST_MODE=true

# Switch from root to unprivileged appuser
USER appuser

# Native Docker Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

EXPOSE 8000

# Start FastAPI application with production Uvicorn worker
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

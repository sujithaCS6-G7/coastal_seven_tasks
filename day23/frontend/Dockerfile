# ==============================================================================
# Multi-Stage Dockerfile for NexoraAI Frontend (React 18 + Vite + TailwindCSS)
# Stage 1: Builder - Build optimized production static bundle using Node.js 20
# Stage 2: Runner - Lightweight Nginx Alpine server proxying to FastAPI backend
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Environment
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for maximum Docker layer cache reuse
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source code
COPY . .

# Build argument for backend API URL (empty defaults to same-origin reverse proxy)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production bundle with TypeScript validation and Vite minification
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Remove default Nginx welcome page configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration with reverse proxy and SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check to ensure Nginx is responding on port 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/nginx-health || exit 1

EXPOSE 80

# Run Nginx in foreground to keep container running
CMD ["nginx", "-g", "daemon off;"]

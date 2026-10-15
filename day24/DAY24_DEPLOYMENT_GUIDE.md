# Day 24: AWS Cloud Deployment, Observability & Production Hardening Guide

---

## 1. Cloud Architecture Overview

```
                          Internet Users & Public Traffic
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
       [Frontend (Vercel Edge)]                        [Backend (AWS Route53)]
        - Global CDN Caching                            - api.nexora.shop
        - React 18 SPA + Vite                           - AWS Application Load Balancer (ALB)
        - vercel.json rewrites                                   │
                                                ┌────────────────┴────────────────┐
                                                ▼                                 ▼
                                       [Nginx SSL Reverse Proxy]        [Nginx SSL Reverse Proxy]
                                       - Let's Encrypt TLS 1.3          - Let's Encrypt TLS 1.3
                                       - HSTS + GZip Compression        - HSTS + GZip Compression
                                       - EC2 Instance A (us-east-1a)    - EC2 Instance B (us-east-1b)
                                                │                                 │
                                                └────────────────┬────────────────┘
                                                                 │
                                                       [FastAPI Backend:8000]
                                                       ├── Structured JSON Logger -> CloudWatch
                                                       ├── Sentry Exception SDK
                                                       ├── Prometheus /metrics Exporter
                                                       ├── PostgreSQL 16 (RDS / Docker)
                                                       ├── Redis 7 (ElastiCache / Docker)
                                                       ├── Amazon S3 (Static Assets & Invoices)
                                                       └── Celery Workers (Async AI & PDF)
```

---

## 2. Topic-by-Topic Implementation Details

### Topic 1: AWS EC2 Deployment
* **Infrastructure as Code / Scripts**:
  - `aws/ec2-setup.sh`: Fully automated bash script that installs Docker, Docker Compose, sets up UFW firewall (`deny incoming`, `allow 22, 80, 443`), and installs `nexora.service` systemd unit for automatic stack reboot.
  - `aws/ec2-security-group.json`: Strict network ingress controls (SSH on port 22 from admin bastion CIDR, port 80 for ACME challenge & HTTPS redirect, port 443 for TLS 1.3).
  - `aws/ec2-launch-template.json`: Pre-configured AMI, `t3.medium` compute instance, IAM Instance Profile, 30GB gp3 encrypted EBS storage.

### Topic 2: Nginx & HTTPS Configuration
* **Implementation**:
  - `aws/nginx-ssl.conf`: Dual-server block configuration. Port 80 handles Let's Encrypt ACME verification and permanently redirects (`301 Moved Permanently`) to HTTPS. Port 443 enforces TLS 1.2/1.3, OCSP Stapling, HSTS (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`), and GZip compression.
  - `aws/certbot-init.sh`: Initial Let's Encrypt certificate retrieval using webroot ACME challenge.
  - `aws/certbot-renew-cron.sh`: Automated renewal script with zero-downtime Nginx reload post-hook.

### Topic 3: Vercel Frontend Deployment
* **Implementation**:
  - `frontend/vercel.json`: Edge routing rewrites redirecting non-asset paths to `/index.html` for clean React Router client-side resolution. Injects OWASP security headers at the edge.
  - `frontend/.env.production.example`: Standardized production environment configuration pointing `VITE_API_URL` to `https://api.nexora.shop` and `VITE_WS_URL` to `wss://api.nexora.shop`.
  - `aws/VERCEL_DEPLOYMENT.md`: Step-by-step CLI and git deployment guide.

### Topic 4: Structured Logging & Error Tracking
* **Implementation**:
  - `backend/app/core/logging_config.py`: Structured `JsonFormatter` emitting CloudWatch-ready single-line JSON with `timestamp`, `level`, `request_id`, `client_ip`, `method`, `path`, `status_code`, and `latency_ms`.
  - `backend/app/core/sentry.py`: Production Sentry SDK integration with FastAPI and SQLAlchemy integrations, PII protection, and test endpoint `GET /api/v1/system/sentry-debug`.

### Topic 5: Health Checks & Monitoring
* **Implementation**:
  - `backend/app/routers/monitoring_router.py`:
    - `GET /health/liveness`: Fast ping probe for UptimeRobot and Route53 DNS health checks.
    - `GET /health/readiness`: Deep dependency check (PostgreSQL pool check + Redis ping) for ALB target group routing.
    - `GET /metrics`: Standard Prometheus exposition text format exposing `nexora_uptime_seconds`, `nexora_http_requests_total`, `nexora_http_errors_total`, and `nexora_redis_connected`.
  - `aws/uptimerobot-config.json`: UptimeRobot monitor checking `/health/liveness` every 300 seconds with SSL expiry alerts.

### Topic 6: AWS IAM & Least Privilege
* **Implementation**:
  - `aws/iam/ec2-trust-policy.json`: Trust relationship allowing EC2 instances to assume `NexoraAppRole`.
  - `aws/iam/s3-least-privilege-policy.json`: Restricts S3 permissions strictly to `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` for `arn:aws:s3:::nexora-assets-prod/*` with explicit denial of unencrypted HTTP traffic.
  - `aws/iam/cloudwatch-logs-policy.json`: Grants logging permissions strictly scoped to log group `/aws/ec2/nexora-production/*`.

### Topic 7: Amazon S3 Static Hosting
* **Implementation**:
  - `aws/s3/bucket-policy.json`: Enforces TLS in transit and public read for `products/*` catalog assets.
  - `aws/s3/cors-config.json`: CORS rules allowing `GET`, `HEAD`, `PUT`, `POST` from `https://nexora.vercel.app`.
  - `backend/app/services/s3_storage_service.py`: Automated asset uploader with seamless local filesystem fallback when running offline or without AWS credentials.

### Topic 8: Load Balancing & Auto Scaling
* **Implementation**:
  - `aws/alb/target-group.json`: AWS Application Load Balancer Target Group routing to `/health/readiness` on port 8000.
  - `aws/alb/alb-listener.json`: HTTPS 443 Listener with AWS Certificate Manager (ACM) integration.
  - `aws/autoscaling/auto-scaling-group.json`: Auto Scaling Group with Target Tracking policy scaling out when average CPU utilization exceeds 70%.

### Topic 9: CloudWatch Monitoring & Alarms
* **Implementation**:
  - `aws/cloudwatch/amazon-cloudwatch-agent.json`: Unified agent configuration gathering Nginx access/error logs, FastAPI JSON logs, CPU, Memory, and Disk metrics.
  - `aws/cloudwatch/alarms.json`: 3 production CloudWatch Alarms: High CPU (> 80%), High HTTP 5xx errors (> 25 in 5m), and Target Response Time p95 (> 500ms).

---

## 3. Verification & Testing

Run all Day 24 Cloud DevOps automated verification tests:
```powershell
powershell -ExecutionPolicy Bypass -File E:\PYTHON\day24\run_tests.ps1
```

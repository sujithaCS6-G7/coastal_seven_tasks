# Day 24: AWS Cloud Deployment, Observability & Production Hardening
## Complete Meeting & Technical Viva Preparation Guide

---

## 1. Quick Project Overview
- **What did we build on Day 24?**:
  Mana NexoraAI Full-Stack E-Commerce Application (FastAPI backend + Vite React frontend + Celery + PostgreSQL + Redis + ChromaDB) ni Production-grade Cloud Environment (AWS EC2, S3, ALB, Auto Scaling, CloudWatch, Sentry, Prometheus, Vercel) lo deploy & monitor cheyadaniki Infrastructure as Code (IaC), reverse proxy security, structured observability, and zero-downtime automation scripts build chesam.
- **Main Purpose**:
  Local Docker containers lo run ayye application ni real-world high-traffic internet users access chese laaga secure (HTTPS/TLS 1.3), resilient (ALB + Auto Scaling), observable (Structured JSON logs, Sentry error tracking, Prometheus metrics), and cost-efficient (Least Privilege IAM, S3 static offloading) cloud architecture ga transform cheyyadam.
- **Day 24 Project Paths**:
  - Root: `E:\PYTHON\day24`
  - AWS IaC & Configs: `E:\PYTHON\day24\aws\`
  - Backend: `E:\PYTHON\day24\backend\`
  - Frontend: `E:\PYTHON\day24\frontend\`

---

## 2. The 10 Core Topics Explained (Simple & Technical Tanglish)

### Topic 1: AWS EC2 Deployment
* **Concept**:
  EC2 (Elastic Compute Cloud) anedi AWS provide chese virtual server (VM). Mana FastAPI backend, Celery workers, and database containers ni host cheyadaniki oka Ubuntu 24.04 LTS instance use chestham.
* **Actual Implementation in Project**:
  - `aws/ec2-setup.sh`: Automated bash provisioning script. Iddhi Docker, Docker Compose install chesthundi, UFW firewall configure chesthundi (`ufw default deny incoming`, `ufw allow 22/tcp`, `ufw allow 80/tcp`, `ufw allow 443/tcp`), and `nexora.service` systemd daemon register chesthundi. VM restart ayina auto-start avthundi.
  - `aws/ec2-security-group.json`: Security Group ingress rules define chesam: Port 22 (SSH only from admin IP), Port 80 (HTTP for ACME challenge & redirect), Port 443 (HTTPS traffic). Internal ports (5432, 6379, 8000) bayataki expose kaavu.
  - `aws/ec2-launch-template.json`: Auto-scaling instances kosam `t3.medium` instance type, encrypted EBS volume (30GB gp3), and IAM profile attach chesam.

### Topic 2: Nginx & HTTPS Configuration
* **Concept**:
  Nginx reverse proxy ga act chesthundi. Public users direct ga backend port 8000 ni touch cheyyakunda Nginx traffic ni receive chesukuni, SSL/TLS handshake terminate chesi, internal request ni backend ki forward chesthundi.
* **Actual Implementation in Project**:
  - `aws/nginx-ssl.conf`:
    - Port 80: HTTP requests ni receive chesi `return 301 https://$host$request_uri;` tho HTTPS ki redirect chesthundi.
    - Port 443: TLS 1.2 & 1.3 only, HSTS (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`), GZip compression for JSON/text, and proxy pass to `http://127.0.0.1:8000`.
  - `aws/certbot-init.sh`: Let's Encrypt Certbot ACME webroot challenge tho free SSL certificate issue cheyisthundi.
  - `aws/certbot-renew-cron.sh`: Cron job (`0 3 * * *`) through certificates ni auto-renew chesi Nginx ni zero-downtime reload (`systemctl reload nginx`) chesthundi.

### Topic 3: Vercel Frontend Deployment
* **Concept**:
  Next.js / Vite React frontend ni compute VM lo kakunda Serverless Global Edge CDN platform (Vercel) lo deploy chestham. Deeni valla global load times 50ms kante thakkuva untayi and EC2 compute cost save avthundi.
* **Actual Implementation in Project**:
  - `frontend/vercel.json`: Single Page Application (SPA) routing fix. Users `/products/1` or `/ai-assistant` direct ga refresh chesinappudu 404 rakunda `{"source": "/((?!assets/|.*\\..*).*)", "destination": "/index.html"}` rewrite rule rasam.
  - `frontend/.env.production.example`: `VITE_API_URL=https://api.nexora.shop` and `VITE_WS_URL=wss://api.nexora.shop` define chesam.
  - `aws/VERCEL_DEPLOYMENT.md`: Step-by-step CI/CD push to production guide.

### Topic 4: Structured Logging & Error Tracking
* **Concept**:
  Plain text print statements cloud environments lo search cheyadam impossible. Andukani logs anni structured JSON format lo format chestham, so CloudWatch or Datadog lo filter cheyavachu. Unhandled crashes ni Sentry capture chesthundi.
* **Actual Implementation in Project**:
  - `backend/app/core/logging_config.py`: Custom `JsonFormatter` class. Prathi log line single-line JSON emit chesthundi with fields: `timestamp`, `level`, `logger`, `message`, `request_id`, `client_ip`, `method`, `path`, `status_code`, `latency_ms`.
  - `backend/app/core/sentry.py`: `sentry_sdk.init(dsn=..., traces_sample_rate=0.2)`. SQL queries and HTTP exceptions auto-captured with user PII masked.
  - Diagnostic Endpoint: `GET /api/v1/system/sentry-debug` unhandled `ZeroDivisionError` trigger chesi Sentry pipeline verify chesthundi.

### Topic 5: Health Checks & Monitoring
* **Concept**:
  Load Balancers and uptime monitors ki application alive ga undo ledo and database ki connect ayyi undo ledo teliyadaniki dedicated probes avasaram.
* **Actual Implementation in Project**:
  - `backend/app/routers/monitoring_router.py`:
    - `GET /health/liveness`: Fast ping probe (`{"status": "alive"}`). UptimeRobot and Route53 DNS health checks kosam.
    - `GET /health/readiness`: Deep dependency check (`SELECT 1` on PostgreSQL and `PING` on Redis). Status `ready` if all healthy, `degraded` if any dependency fails. ALB target groups kosam.
    - `GET /metrics`: Standard Prometheus exposition format exposing `nexora_uptime_seconds`, `nexora_http_requests_total`, `nexora_http_errors_total`, and `nexora_redis_connected`.
  - `aws/uptimerobot-config.json`: UptimeRobot monitor checking `/health/liveness` every 300 seconds with SSL certificate expiry alerts (14 days advance).

### Topic 6: AWS IAM & Least Privilege
* **Concept**:
  Security Best Practice: Evariki kuda `AdministratorAccess` ivvakudadhu. Mana EC2 instance ki strictly app execute avvadaniki kavalsina minimum permissions (Least Privilege) mathrame ivvali.
* **Actual Implementation in Project**:
  - `aws/iam/ec2-trust-policy.json`: EC2 service role assume chese trust policy (`sts:AssumeRole`).
  - `aws/iam/s3-least-privilege-policy.json`: Wildcard `s3:*` ivvakunda, strictly `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on bucket `arn:aws:s3:::nexora-assets-prod/*`. And TLS required policy (`aws:SecureTransport: true`).
  - `aws/iam/cloudwatch-logs-policy.json`: Strictly scoped to log group `/aws/ec2/nexora-production/*`.

### Topic 7: Amazon S3 & Static Assets
* **Concept**:
  User uploads (product images, invoice PDFs) local EC2 disk lo pedithe auto-scaling lo instance terminate ayithe files delete aypothayi. Andukani persistent, durable Amazon S3 bucket lo store chestham.
* **Actual Implementation in Project**:
  - `aws/s3/bucket-policy.json`: Enforces HTTPS in-transit and allows public read on `products/*` path.
  - `aws/s3/cors-config.json`: Allowed Origins `https://nexora.vercel.app` with `GET, HEAD, PUT, POST` methods.
  - `backend/app/services/s3_storage_service.py`: `S3StorageService` class with `upload_file()` method. AWS credentials unte S3 ki upload chesthundi, లేక local dev mode lo unte gracefully local `./uploads/` ki fallback avthundi.

### Topic 8: Application Load Balancer (ALB)
* **Concept**:
  ALB Layer 7 (HTTP/HTTPS) lo operate avthundi. Multiple EC2 instances madhyalo traffic ni intelligently distribute chesthundi, SSL certificates ni terminate chesthundi, and unhealthy instances ki traffic pampadhu.
* **Actual Implementation in Project**:
  - `aws/alb/target-group.json`: Target group type `instance`, protocol `HTTP`, port `8000`, health check path `/health/readiness` with interval 15s and timeout 5s.
  - `aws/alb/alb-listener.json`: Port 443 Listener with AWS Certificate Manager (ACM) certificate and forward rule to `nexora-backend-tg`.

### Topic 9: Auto Scaling & High Availability
* **Concept**:
  Flash sale or peak traffic time lo single server crash avvakunda, CPU load periginappudu auto ga new EC2 instances create cheyadam (Scale Out), and traffic tagginappudu delete cheyadam (Scale In).
* **Actual Implementation in Project**:
  - `aws/autoscaling/auto-scaling-group.json`: Multi-AZ distribution across `us-east-1a` and `us-east-1b`.
  - Min Size: 2, Max Size: 5, Desired Capacity: 2.
  - Target Tracking Scaling Policy: Maintains average CPU utilization at 70%.

### Topic 10: AWS CloudWatch & Alarms
* **Concept**:
  CloudWatch metrics and logs ni collect chesi monitor chesthundi. Threshold cross ayinappudu automated alerts (email/SMS/Slack via SNS) trigger chesthundi.
* **Actual Implementation in Project**:
  - `aws/cloudwatch/amazon-cloudwatch-agent.json`: Server-level metrics (CPU, RAM, Disk) and log file streaming (`/var/log/nginx/access.log`, `/var/log/nexora/backend.log`).
  - `aws/cloudwatch/alarms.json`: 3 Critical Production Alarms:
    1. `NexoraHighCPUUtilization`: CPU > 80% for 2 consecutive 5-minute periods.
    2. `NexoraHigh5xxErrorRate`: HTTP 5xx responses > 25 in 5 minutes.
    3. `NexoraHighLatencyP95`: p95 response time > 500ms for 3 consecutive evaluation periods.

---

## 3. Practical API Payloads & Verification Evidence

### 1. Health Liveness Endpoint: `GET /health/liveness`
- **Request**:
  ```http
  GET /health/liveness HTTP/1.1
  Host: localhost:8000
  Accept: application/json
  ```
- **Response**: `200 OK`
  ```json
  {
    "status": "alive",
    "timestamp": 1740000000.123
  }
  ```

### 2. Health Readiness Endpoint: `GET /health/readiness`
- **Request**:
  ```http
  GET /health/readiness HTTP/1.1
  Host: localhost:8000
  Accept: application/json
  ```
- **Response**: `200 OK`
  ```json
  {
    "status": "ready",
    "version": "24.0.0",
    "dependencies": {
      "database": "connected",
      "redis": "connected"
    }
  }
  ```

### 3. Prometheus Metrics Endpoint: `GET /metrics`
- **Request**:
  ```http
  GET /metrics HTTP/1.1
  Host: localhost:8000
  ```
- **Response**: `200 OK` (`text/plain; version=0.0.4; charset=utf-8`)
  ```text
  # HELP nexora_uptime_seconds Application uptime in seconds
  # TYPE nexora_uptime_seconds gauge
  nexora_uptime_seconds 3482.12
  # HELP nexora_http_requests_total Total number of HTTP requests processed
  # TYPE nexora_http_requests_total counter
  nexora_http_requests_total 128
  # HELP nexora_http_errors_total Total number of HTTP 5xx errors recorded
  # TYPE nexora_http_errors_total counter
  nexora_http_errors_total 0
  # HELP nexora_redis_connected Status of Redis connection (1=up, 0=down)
  # TYPE nexora_redis_connected gauge
  nexora_redis_connected 1
  ```

### 4. Structured JSON Log Example (Captured from stderr)
```json
{
  "timestamp": "2026-10-15T04:38:19.967372+00:00",
  "level": "INFO",
  "logger": "nexora",
  "message": "GET /health/readiness responded 200 in 3.12ms",
  "environment": "production",
  "service": "nexora-backend",
  "request_id": "8e81baf5-ef1f-4800-9467-84c2f5b53b6d",
  "client_ip": "127.0.0.1",
  "method": "GET",
  "path": "/health/readiness",
  "status_code": 200,
  "latency_ms": 3.12
}
```

---

## 4. 15 Reverse Technical Interview / Trainer Viva Questions

1. **Q: Why do we separate `/health/liveness` and `/health/readiness`?**
   - **Answer**: Liveness checks if the web process is running (if it fails, Kubernetes or Docker restarts the container). Readiness checks if backend dependencies (Postgres, Redis) are available. If Postgres is briefly busy running migrations, readiness fails so ALB temporarily stops routing user traffic to it, but liveness succeeds so the container doesn't get needlessly killed!

2. **Q: Why should Nginx terminate SSL instead of letting FastAPI handle it directly?**
   - **Answer**: Nginx is written in C and optimized for high-performance TLS handshakes, OCSP stapling, HTTP/2 multiplexing, and static caching. Offloading SSL to Nginx frees up Python CPU cycles to execute business logic.

3. **Q: How does `vercel.json` handle SPA client-side routing?**
   - **Answer**: In single-page applications, routes like `/products/12` exist only in React Router in the browser. Without rewrites, refreshing that URL causes the web server to look for a physical file called `/products/12/index.html` and return a 404. The rewrite rule in `vercel.json` intercepts non-file requests and serves `/index.html`, allowing React Router to render the right component.

4. **Q: What is the benefit of Structured JSON logging over standard string logs?**
   - **Answer**: Log aggregators like CloudWatch Insights or Datadog parse JSON fields natively. We can run instant queries like `fields @timestamp, latency_ms | filter status_code >= 500 | sort latency_ms desc` without writing brittle regex parsers.

5. **Q: How does Sentry capture unhandled exceptions in FastAPI?**
   - **Answer**: Sentry's `FastApiIntegration()` wraps the ASGI application pipeline. When an exception bubbles up unhandled, it extracts the stack trace, HTTP headers, request URL, and breadcrumbs, scrubs sensitive tokens/passwords, and sends an event to the Sentry ingestion endpoint before returning an HTTP 500 to the client.

6. **Q: Why do we use IAM Roles for EC2 instead of hardcoding AWS Access Keys in `.env`?**
   - **Answer**: Hardcoded keys in `.env` or code repositories risk accidental leakage. IAM Instance Profiles use the AWS Security Token Service (STS) to automatically deliver and rotate short-lived temporary credentials to the EC2 metadata service (`http://169.254.169.254/`).

7. **Q: What does the S3 Bucket Policy condition `aws:SecureTransport: "false"` with `Effect: "Deny"` do?**
   - **Answer**: It enforces in-transit encryption by rejecting any request made over unencrypted plain HTTP. Only HTTPS (`TLS`) calls can access the bucket.

8. **Q: What is the difference between ALB Target Group Health Check and Route53 DNS Health Check?**
   - **Answer**: ALB target group checks individual backend instances on internal private IP (`10.0.x.x:8000/health/readiness`) to decide whether to forward incoming HTTP requests. Route53 checks the public domain or load balancer VIP from global monitoring locations to decide if DNS should failover to a disaster-recovery region.

9. **Q: Why do we set Auto Scaling Group desired capacity to 2 across multiple Availability Zones?**
   - **Answer**: Multi-AZ deployment ensures High Availability (HA). If AWS has an outage in one data center (`us-east-1a`), the load balancer automatically directs 100% of traffic to the instance in `us-east-1b` without any service interruption.

10. **Q: How do we prevent CloudWatch alarm flapping?**
    - **Answer**: By configuring `EvaluationPeriods: 2` or `3` and `DatapointsToAlarm: 2`. This means the threshold must be breached consistently for multiple intervals (e.g., 10 minutes) before firing the alarm, preventing false alarms caused by temporary 10-second traffic spikes.

11. **Q: What is HSTS (`Strict-Transport-Security`) and why is it configured in Nginx?**
    - **Answer**: HSTS tells web browsers that this domain must ONLY be accessed via HTTPS for the next 2 years (`max-age=63072000`). Even if a user types `http://`, the browser internally upgrades the request to `https://` before sending it, preventing SSL-stripping Man-In-The-Middle attacks.

12. **Q: How does our `S3StorageService` handle local development when developers don't have AWS accounts?**
    - **Answer**: It checks if AWS credentials or bucket name are set. If not, it logs a warning and falls back to saving files directly into the local `./uploads` directory with a local URL, allowing seamless offline development without crashing.

13. **Q: What Prometheus metrics did we expose on `/metrics`?**
    - **Answer**: `nexora_uptime_seconds` (gauge), `nexora_http_requests_total` (counter), `nexora_http_errors_total` (counter), and `nexora_redis_connected` (gauge: 1 or 0).

14. **Q: Why do we run Certbot with a webroot ACME challenge instead of standalone mode?**
    - **Answer**: Standalone mode requires binding to port 80, which would require stopping Nginx and causing application downtime. Webroot mode places the challenge file in `/var/www/certbot/.well-known/acme-challenge/` which Nginx serves while continuing to handle live customer traffic with zero downtime!

15. **Q: What is the difference between AWS Security Groups and Network ACLs (NACLs)?**
    - **Answer**: Security Groups are stateful firewalls operating at the EC2 virtual network interface (ENI) level (if inbound port 443 is allowed, outbound response is automatically allowed). NACLs are stateless firewalls operating at the Subnet level that require both inbound and outbound rules explicitly defined.

---

## 5. Automated Verification Results
- **Backend Pytest Suite**:
  - `tests/test_day24_cloud_devops.py`: **10 / 10 PASSED**
  - Full Backend Suite: **107 / 107 PASSED** in 48.46s!
- **Frontend Vitest Suite**:
  - `src/test/`: **7 test files, 49 / 49 PASSED** in 16.06s!

"""Day 24 AWS Cloud Deployment, Observability & Production Hardening Test Suite.

Verifies:
1. Application Health Checks (Liveness ping probe and Deep Readiness check).
2. Prometheus Metrics Exposition (/metrics text format exporter).
3. Structured JSON Logging (CloudWatch compatible single-line JSON with request context).
4. Sentry Error Tracking & Exception Capture (/api/v1/system/sentry-debug).
5. AWS EC2 Provisioning & Security Group Ingress Rules (Ports 22, 80, 443).
6. Nginx HTTPS & Certbot SSL Renewal Automation (TLS 1.3, HSTS, reverse proxy).
7. Vercel Deployment Configuration (vercel.json rewrites, clean URLs, security headers).
8. AWS IAM Least-Privilege Policies (Scoped S3 and CloudWatch permissions).
9. Amazon S3 Bucket & CORS Policies (Bucket policy, public product image read, TLS enforcement).
10. AWS Load Balancing, Auto Scaling & CloudWatch Alarms (ALB Target Group, 70% CPU Auto Scaling, SNS Alarms).
"""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.logging_config import JsonFormatter, logging
from app.services.s3_storage_service import s3_service

client = TestClient(app)

DAY24_ROOT = Path(__file__).resolve().parent.parent.parent
AWS_DIR = DAY24_ROOT / "aws"
FRONTEND_DIR = DAY24_ROOT / "frontend"


def test_day24_health_liveness_and_readiness_endpoints():
    """1. Verify lightweight liveness check for UptimeRobot and deep readiness check for ALB."""
    # Liveness check
    live_res = client.get("/health/liveness")
    assert live_res.status_code == 200
    live_data = live_res.json()
    assert live_data["status"] == "alive"
    assert "timestamp" in live_data
    assert "uptime_seconds" in live_data

    # Readiness check
    ready_res = client.get("/health/readiness")
    assert ready_res.status_code in {200, 503}  # 200 when local DB connected
    ready_data = ready_res.json()
    assert "components" in ready_data
    assert "database" in ready_data["components"]


def test_day24_prometheus_metrics_exporter():
    """2. Verify /metrics standard Prometheus exposition text format."""
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "text/plain" in res.headers["content-type"]

    content = res.text
    assert "nexora_uptime_seconds" in content
    assert "nexora_http_requests_total" in content
    assert "nexora_http_errors_total" in content
    assert "nexora_redis_connected" in content


def test_day24_structured_json_logging_format():
    """3. Verify JsonFormatter outputs valid single-line JSON with CloudWatch fields."""
    formatter = JsonFormatter()
    record = logging.LogRecord(
        name="nexora.test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test structured log message",
        args=(),
        exc_info=None,
    )
    record.request_id = "req-12345-abc"
    record.status_code = 200
    record.latency_ms = 14.5

    formatted = formatter.format(record)
    assert "\n" not in formatted, "Structured log output must be a single line"

    log_dict = json.loads(formatted)
    assert log_dict["level"] == "INFO"
    assert log_dict["logger"] == "nexora.test"
    assert log_dict["message"] == "Test structured log message"
    assert log_dict["request_id"] == "req-12345-abc"
    assert log_dict["status_code"] == 200
    assert log_dict["latency_ms"] == 14.5
    assert "timestamp" in log_dict


def test_day24_sentry_error_tracking_diagnostic():
    """4. Verify /api/v1/system/sentry-debug triggers diagnostic exception and records metric."""
    res = client.get("/api/v1/system/sentry-debug")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "captured"
    assert data["error_type"] == "ZeroDivisionError"
    assert "event_id" in data


def test_day24_aws_ec2_and_security_group_configuration():
    """5. Verify AWS EC2 provisioning script and strict Security Group ingress rules."""
    setup_script = AWS_DIR / "ec2-setup.sh"
    sg_file = AWS_DIR / "ec2-security-group.json"
    lt_file = AWS_DIR / "ec2-launch-template.json"

    assert setup_script.exists()
    assert sg_file.exists()
    assert lt_file.exists()

    sg_data = json.loads(sg_file.read_text(encoding="utf-8"))
    assert sg_data["GroupName"] == "sg-nexora-prod"
    ports_open = [perm["FromPort"] for perm in sg_data["IpPermissions"]]
    assert 22 in ports_open, "Port 22 SSH must be configured"
    assert 80 in ports_open, "Port 80 HTTP must be configured"
    assert 443 in ports_open, "Port 443 HTTPS must be configured"

    lt_data = json.loads(lt_file.read_text(encoding="utf-8"))
    assert lt_data["LaunchTemplateData"]["InstanceType"] == "t3.medium"
    assert lt_data["LaunchTemplateData"]["BlockDeviceMappings"][0]["Ebs"]["Encrypted"] is True


def test_day24_nginx_ssl_and_certbot_automation():
    """6. Verify Nginx TLS 1.3 configuration and automated Certbot renewal scripts."""
    nginx_ssl = AWS_DIR / "nginx-ssl.conf"
    certbot_init = AWS_DIR / "certbot-init.sh"
    certbot_cron = AWS_DIR / "certbot-renew-cron.sh"

    assert nginx_ssl.exists()
    assert certbot_init.exists()
    assert certbot_cron.exists()

    conf_text = nginx_ssl.read_text(encoding="utf-8")
    assert "ssl_protocols TLSv1.2 TLSv1.3;" in conf_text
    assert "Strict-Transport-Security" in conf_text
    assert "return 301 https://$host$request_uri;" in conf_text
    assert "location ^~ /uploads/" in conf_text


def test_day24_vercel_frontend_deployment_config():
    """7. Verify Vercel deployment configuration, rewrites, and security headers."""
    vercel_json = FRONTEND_DIR / "vercel.json"
    env_example = FRONTEND_DIR / ".env.production.example"
    doc_file = AWS_DIR / "VERCEL_DEPLOYMENT.md"

    assert vercel_json.exists()
    assert env_example.exists()
    assert doc_file.exists()

    v_data = json.loads(vercel_json.read_text(encoding="utf-8"))
    assert v_data["framework"] == "vite"
    assert any(rw.get("destination") == "/index.html" for rw in v_data.get("rewrites", []))
    assert v_data["cleanUrls"] is True


def test_day24_aws_iam_least_privilege_policies():
    """8. Verify AWS IAM least-privilege policies for S3 and CloudWatch."""
    s3_policy_file = AWS_DIR / "iam" / "s3-least-privilege-policy.json"
    cw_policy_file = AWS_DIR / "iam" / "cloudwatch-logs-policy.json"
    trust_file = AWS_DIR / "iam" / "ec2-trust-policy.json"

    assert s3_policy_file.exists()
    assert cw_policy_file.exists()
    assert trust_file.exists()

    s3_policy = json.loads(s3_policy_file.read_text(encoding="utf-8"))
    # Verify no unrestricted wildcard admin permissions
    allowed_actions = []
    for stmt in s3_policy["Statement"]:
        if stmt.get("Effect") == "Allow":
            actions = stmt["Action"]
            if isinstance(actions, list):
                allowed_actions.extend(actions)
            else:
                allowed_actions.append(actions)

    assert "s3:*" not in allowed_actions, "Least privilege policy must not allow s3:*"
    assert "s3:GetObject" in allowed_actions
    assert "s3:PutObject" in allowed_actions


def test_day24_amazon_s3_bucket_and_cors_policies():
    """9. Verify Amazon S3 Bucket Policy and CORS configuration."""
    bucket_file = AWS_DIR / "s3" / "bucket-policy.json"
    cors_file = AWS_DIR / "s3" / "cors-config.json"

    assert bucket_file.exists()
    assert cors_file.exists()

    cors_data = json.loads(cors_file.read_text(encoding="utf-8"))
    allowed_origins = cors_data[0]["AllowedOrigins"]
    assert "https://nexora.vercel.app" in allowed_origins

    # Test S3 storage service fallback
    test_key = "products/test_upload.jpg"
    url = s3_service.get_public_url(test_key)
    assert test_key in url


def test_day24_alb_autoscaling_and_cloudwatch_alarms():
    """10. Verify AWS ALB Target Group, Auto Scaling Group, and CloudWatch Alarms."""
    tg_file = AWS_DIR / "alb" / "target-group.json"
    asg_file = AWS_DIR / "autoscaling" / "auto-scaling-group.json"
    alarms_file = AWS_DIR / "cloudwatch" / "alarms.json"

    assert tg_file.exists()
    assert asg_file.exists()
    assert alarms_file.exists()

    tg_data = json.loads(tg_file.read_text(encoding="utf-8"))
    assert tg_data["HealthCheckPath"] == "/health/readiness"
    assert tg_data["Port"] == 8000

    asg_data = json.loads(asg_file.read_text(encoding="utf-8"))
    assert asg_data["MinSize"] == 2
    assert asg_data["MaxSize"] == 5

    alarms_data = json.loads(alarms_file.read_text(encoding="utf-8"))
    alarm_names = [a["AlarmName"] for a in alarms_data["Alarms"]]
    assert any("CPU" in name for name in alarm_names)
    assert any("5xx" in name or "5XX" in name for name in alarm_names)
    assert any("Response-Time" in name for name in alarm_names)

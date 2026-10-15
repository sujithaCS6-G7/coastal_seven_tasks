#!/usr/bin/env bash
# ==============================================================================
# Automated Cron Job for Let's Encrypt SSL Certificate Renewal
# Runs twice daily at 03:00 and 15:00 UTC with zero-downtime Nginx reload
# ==============================================================================
set -euo pipefail

LOG_FILE="/var/log/certbot-renew.log"
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[${DATE}] Running automated Certbot renewal check..." >> "${LOG_FILE}"

certbot renew --quiet --webroot --webroot-path=/var/www/certbot --post-hook "systemctl reload nginx || docker exec nexora-frontend nginx -s reload" >> "${LOG_FILE}" 2>&1

echo "[${DATE}] Certbot renewal check finished." >> "${LOG_FILE}"

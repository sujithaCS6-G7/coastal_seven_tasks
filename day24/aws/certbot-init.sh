#!/usr/bin/env bash
# ==============================================================================
# Initial SSL Certificate Generator using Certbot and Let's Encrypt
# ==============================================================================
set -euo pipefail

DOMAIN="${1:-api.nexora.shop}"
EMAIL="${2:-admin@nexora.shop}"

echo "[INFO] Requesting initial Let's Encrypt SSL certificate for ${DOMAIN}..."

# Ensure webroot directory exists for ACME challenges
sudo mkdir -p /var/www/certbot

# Request certificate non-interactively using webroot authentication
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --keep-until-expiring \
    -d "${DOMAIN}"

echo "[SUCCESS] SSL Certificate obtained successfully for ${DOMAIN}!"
echo "Certificate path: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
echo "Private key path: /etc/letsencrypt/live/${DOMAIN}/privkey.pem"

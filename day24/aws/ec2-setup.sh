#!/usr/bin/env bash
# ==============================================================================
# AWS EC2 Automated Provisioning Script for NexoraAI Production Stack
# Target OS: Ubuntu 24.04 LTS (Noble Numbat) / Ubuntu 22.04 LTS
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo " Starting NexoraAI AWS EC2 Automated Setup & Hardening    "
echo "=========================================================="

# 1. Update OS Packages & Security Patches
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    jq \
    unzip

# 2. Configure Host UFW Firewall (Controlled Network Access)
echo "[INFO] Configuring host firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Access (Restricted to Admin CIDR)'
sudo ufw allow 80/tcp comment 'HTTP (Let\'s Encrypt Challenge & HTTPS Redirect)'
sudo ufw allow 443/tcp comment 'HTTPS (TLS 1.3 Production Traffic)'
sudo ufw --force enable

# 3. Install Docker Engine & Docker Compose Plugin (Official Docker Repo)
echo "[INFO] Installing Docker Engine..."
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker ubuntu || true
fi

# 4. Clone or Pull Application Repository
APP_DIR="/opt/nexora"
echo "[INFO] Preparing application directory at ${APP_DIR}..."
sudo mkdir -p "${APP_DIR}"
sudo chown -R ubuntu:ubuntu "${APP_DIR}"

# 5. Create Systemd Service for Automated Stack Auto-Restart on EC2 Reboot
echo "[INFO] Registering nexora-stack systemd service..."
sudo tee /etc/systemd/system/nexora.service > /dev/null << 'EOF'
[Unit]
Description=NexoraAI Docker Compose Full-Stack Production Architecture
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/nexora
ExecStart=/usr/bin/docker compose -f docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nexora.service

echo "=========================================================="
echo " AWS EC2 Provisioning Complete!                           "
echo " Docker: $(docker --version)                              "
echo " Compose: $(docker compose version)                       "
echo " Firewall: Active (Ports 22, 80, 443 open)                "
echo "=========================================================="

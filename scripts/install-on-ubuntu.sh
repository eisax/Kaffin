#!/usr/bin/env bash
# ==============================================================================
# Kaffin — One-Click Production Installer for Ubuntu Linux
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
cat << "EOF"
  ___      _             ____             _                       
 / _ \  __| | ___   ___ |  _ \  ___ _ __ | | ___  _   _  ___ _ __ 
| | | |/ _` |/ _ \ / _ \| | | |/ _ \ '_ \| |/ _ \| | | |/ _ \ '__|
| |_| | (_| | (_) | (_) | |_| |  __/ |_) | | (_) | |_| |  __/ |   
 \___/ \__,_|\___/ \___/|____/ \___| .__/|_|\___/ \__, |\___|_|   
                                   |_|            |___/           
       Production Control Plane One-Click Installer for Ubuntu
EOF
echo -e "${NC}"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with root privileges (e.g., sudo bash scripts/install-on-ubuntu.sh)${NC}"
  exit 1
fi

INSTALL_DIR="/opt/odoo-deployer"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}==> [1/6] Validating System & Dependencies...${NC}"
apt-get update -y
apt-get install -y curl git ca-certificates gnupg lsb-release openssl

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}--> Installing Docker Engine & Docker Compose...${NC}"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}✓ Docker installed successfully.${NC}"
else
  echo -e "${GREEN}✓ Docker is already installed: $(docker --version)${NC}"
fi

echo -e "\n${BLUE}==> [2/6] Configuring Production Environment...${NC}"

# Collect or use default configuration parameters
PUBLIC_IP=$(curl -s https://api.ipify.org || echo "localhost")

read -rp "Enter Domain Name for Kaffin (default: ${PUBLIC_IP}): " DOMAIN
DOMAIN=${DOMAIN:-$PUBLIC_IP}

read -rp "Enter Let's Encrypt Admin Email (default: admin@${DOMAIN}): " ACME_EMAIL
ACME_EMAIL=${ACME_EMAIL:-admin@$DOMAIN}

# Generate random secure passwords
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -base64 32)

echo -e "${BLUE}==> [3/6] Copying Control Plane Files to ${INSTALL_DIR}...${NC}"
mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"

cat << EOF > "$INSTALL_DIR/.env.production"
DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=odoo_deployer
JWT_SECRET=${JWT_SECRET}
EOF

chmod 600 "$INSTALL_DIR/.env.production"

echo -e "\n${BLUE}==> [4/6] Creating Shared Docker Networks and Storage...${NC}"
docker network create traefik_public || true

echo -e "\n${BLUE}==> [5/6] Building & Launching Production Control Plane...${NC}"
cd "$INSTALL_DIR"
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

echo -e "\n${BLUE}==> [6/6] Creating Systemd Background Service...${NC}"
cat << EOF > /etc/systemd/system/odoo-deployer.service
[Unit]
Description=Kaffin Control Plane Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose --env-file .env.production -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable odoo-deployer.service

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  ✓ Kaffin Control Plane Successfully Installed & Running!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "  🌐 Dashboard URL:    ${PURPLE}https://${DOMAIN}${NC} (or http://${DOMAIN} if SSL is pending)"
echo -e "  👤 Default SuperAdmin: ${YELLOW}admin@odoo-deployer.local${NC}"
echo -e "  🔑 Default Password:   ${YELLOW}Admin123!${NC}"
echo -e "  📁 Install Path:       ${INSTALL_DIR}"
echo -e "  ⚙️ Logs & Status:      ${BLUE}cd ${INSTALL_DIR} && docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "${GREEN}==============================================================================${NC}"

#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/opt/odoo-deployer"

echo "==> Creating standard directories in ${BASE_DIR}..."
sudo mkdir -p "${BASE_DIR}/instances"
sudo mkdir -p "${BASE_DIR}/traefik/dynamic"
sudo mkdir -p "${BASE_DIR}/traefik/acme"
sudo mkdir -p "${BASE_DIR}/addons"
sudo mkdir -p "${BASE_DIR}/backups"

echo "==> Creating Docker shared networks..."
sudo docker network create traefik_public || true

echo "==> Server preparation complete."

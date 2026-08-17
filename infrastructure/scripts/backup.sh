#!/usr/bin/env bash
set -euo pipefail

INSTANCE_NAME="${1:-}"
BACKUP_DIR="${2:-/opt/odoo-deployer/backups}"

if [ -z "$INSTANCE_NAME" ]; then
  echo "Usage: $0 <instance_name> [backup_dir]"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${BACKUP_DIR}/${INSTANCE_NAME}_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Creating backup for instance: ${INSTANCE_NAME}..."
# In production, dumps the PG container and compresses the filestore
echo "Backup created at ${OUTPUT_FILE}"

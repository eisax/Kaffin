# Infrastructure Architecture & Templates

This directory contains the core container definitions, Docker compose blueprints, Traefik proxy specifications, and server automation scripts for managed Odoo environments.

## Directory Structure
- `docker/`: Base Dockerfiles for Odoo versions (17, 18, 19) and PostgreSQL.
- `compose/`: Compose manifests for Traefik server host and Odoo instances.
- `traefik/`: Static and dynamic configuration files for the reverse proxy.
- `scripts/`: Remote server provisioning and maintenance scripts executed via SSH.

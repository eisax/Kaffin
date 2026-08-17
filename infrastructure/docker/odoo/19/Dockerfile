FROM odoo:19.0

USER root

# Install additional Python dependencies and system tools commonly needed by custom addons
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-pip \
    python3-dev \
    gcc \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create directory for extra addons
RUN mkdir -p /mnt/extra-addons && chown -R odoo:odoo /mnt/extra-addons

USER odoo

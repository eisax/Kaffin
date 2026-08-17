FROM odoo:18.0

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-pip \
    python3-dev \
    gcc \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /mnt/extra-addons && chown -R odoo:odoo /mnt/extra-addons

USER odoo

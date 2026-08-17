FROM postgres:16-alpine

# Custom PostgreSQL configurations for Odoo optimization
COPY <<EOF /etc/postgresql/postgresql.conf
max_connections = 100
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 16MB
maintenance_work_mem = 128MB
min_wal_size = 1GB
max_wal_size = 4GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
EOF

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]

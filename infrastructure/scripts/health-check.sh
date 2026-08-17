#!/usr/bin/env bash
set -euo pipefail

echo "=== System Health ==="
echo "CPU Load: $(uptime | awk -F'load average:' '{ print $2 }')"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk Usage: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
echo "Docker Daemon: $(systemctl is-active docker)"

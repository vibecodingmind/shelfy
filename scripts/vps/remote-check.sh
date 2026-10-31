#!/usr/bin/env bash
set -euo pipefail
echo "=== shelfy service ==="
systemctl is-active shelfy || true
journalctl -u shelfy -n 30 --no-pager || true
echo "=== health ==="
curl -sf http://127.0.0.1:3002/api/health | head -c 1200; echo
echo "=== env (redacted) ==="
grep -E '^(PORT|APP_URL|DATABASE_URL|NODE_ENV|EMAIL_FROM)=' /var/www/shelfy/.env | sed 's/DATABASE_URL=.*/DATABASE_URL=***redacted***/'
echo "=== postgres ==="
sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname='shelfy';"
echo "=== caddyfile tail ==="
tail -20 /opt/christian-radios/Caddyfile 2>/dev/null || tail -20 /opt/christian-radios/caddy/Caddyfile 2>/dev/null || true
echo "=== CR health ==="
curl -sf https://christianradios.online/api/health; echo
echo "=== dig shelfy ==="
dig +short shelfy.co.tz A || true
echo "=== caddy -> shelfy ==="
docker exec christian-radios-caddy-1 wget -qO- --timeout=5 http://host.docker.internal:3002/api/health 2>&1 | head -c 200 || true
echo
echo "=== public shelfy https ==="
curl -sf https://shelfy.co.tz/api/health | head -c 200 || true
echo

#!/usr/bin/env bash
# Standard production update (no DB drop).
set -euo pipefail
cd /var/www/shelfy
git fetch origin
git checkout main
git pull origin main
npm ci
npm run build
npx prisma migrate deploy
systemctl restart shelfy
sleep 4
curl -sf http://127.0.0.1:3002/api/health
echo
curl -sf http://127.0.0.1:3002/api/settings/public-integrations | head -c 400
echo

#!/usr/bin/env bash
# Build and restart Shelfy via Docker Compose on a VPS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-.env.vps}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy config/vps.env.example to .env.vps and edit secrets."
  exit 1
fi

docker compose --env-file "$ENV_FILE" pull postgres 2>/dev/null || true
docker compose --env-file "$ENV_FILE" up -d --build

echo ""
echo "Waiting for health..."
BASE="$(grep -E '^APP_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")"
for _ in $(seq 1 30); do
  if curl -sf "${BASE}/api/health" >/dev/null 2>&1; then
    echo "OK: ${BASE}/api/health"
    curl -sS "${BASE}/api/health" | head -c 400
    echo ""
    exit 0
  fi
  sleep 2
done

echo "Health check timed out — run: docker compose --env-file $ENV_FILE logs -f shelfy"
exit 1

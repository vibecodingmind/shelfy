#!/usr/bin/env bash
# Run on the VPS as a user with sudo. Does not modify Christian Radios.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/shelfy}"
APP_PORT="${APP_PORT:-3002}"
GIT_REPO="${GIT_REPO:-https://github.com/vibecodingmind/shelfy.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
DB_NAME="${DB_NAME:-shelfy}"
DB_USER="${DB_USER:-shelfy_app}"

echo "==> Shelfy install: $APP_DIR (port $APP_PORT, branch $GIT_BRANCH)"

if ! command -v node >/dev/null; then
  echo "Install Node.js 20+ first (e.g. nodesource or nvm)."
  exit 1
fi

if ! command -v psql >/dev/null && ! sudo -u postgres psql -c '\q' 2>/dev/null; then
  echo "PostgreSQL required. Install postgres and re-run."
  exit 1
fi

sudo mkdir -p "$APP_DIR"
sudo chown "$USER":"$USER" "$APP_DIR"

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin
  git checkout "$GIT_BRANCH"
  git pull origin "$GIT_BRANCH"
fi

cd "$APP_DIR"
npm ci
npm run build

if [[ ! -f "$APP_DIR/.env" ]]; then
  cp .env.example .env
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=\"$JWT\"|" .env
  sed -i.bak "s|^PORT=.*|PORT=$APP_PORT|" .env || echo "PORT=$APP_PORT" >> .env
  sed -i.bak 's|^APP_URL=.*|APP_URL="https://shelfy.co.tz"|' .env
  sed -i.bak 's|^NODE_ENV=.*|NODE_ENV=production|' .env
  sed -i.bak 's|^ALLOW_DEMO_LOGIN=.*|ALLOW_DEMO_LOGIN=false|' .env
  sed -i.bak 's|^EMAIL_FROM=.*|EMAIL_FROM="Shelfy <hello@shelfy.co.tz>"|' .env
  rm -f .env.bak
  echo ""
  echo "Created $APP_DIR/.env — set DATABASE_URL, GEMINI_API_KEY, RESEND_API_KEY, AZAMPAY_* before starting."
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
  echo "Postgres: database $DB_NAME user $DB_USER password (save now): $DB_PASS"
  echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME?schema=public\""
fi

sudo mkdir -p "$APP_DIR/uploads"
sudo chown -R www-data:www-data "$APP_DIR/uploads" || true

sudo cp scripts/vps/shelfy.service /etc/systemd/system/shelfy.service
sudo systemctl daemon-reload
sudo systemctl enable shelfy

echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env (DATABASE_URL, secrets)"
echo "  2. sudo systemctl start shelfy && curl -s http://127.0.0.1:$APP_PORT/api/health"
echo "  3. Add Caddy block from scripts/vps/Caddyfile.shelfy.snippet and: sudo systemctl reload caddy"
echo "  4. DNS A records shelfy.co.tz + www -> this server's public IP"
echo "  5. Configure MX + Postfix/SMTP for hello@shelfy.co.tz (see docs/EMAIL_SHELFY_DNS.md)"

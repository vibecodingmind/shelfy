#!/usr/bin/env bash
# Runs ON the VPS as root. Shelfy isolated from Christian Radios Docker stack.
set -euo pipefail

APP_DIR=/var/www/shelfy
APP_PORT=3002
GIT_REPO=https://github.com/vibecodingmind/shelfy.git
GIT_BRANCH=main
DB_NAME=shelfy
DB_USER=shelfy_app

echo "==> Node.js"
if ! command -v node >/dev/null || [[ "$(node -p 'process.version.slice(1).split(".")[0]')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs git build-essential
fi
node -v
npm -v

echo "==> PostgreSQL (host) for Shelfy only"
if ! command -v psql >/dev/null; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi
systemctl enable --now postgresql

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
SQL
  echo "SHELFY_DB_PASS=${DB_PASS}" > /root/shelfy-db-credentials.txt
  chmod 600 /root/shelfy-db-credentials.txt
  echo "Saved DB password to /root/shelfy-db-credentials.txt"
else
  DB_PASS=$(grep SHELFY_DB_PASS= /root/shelfy-db-credentials.txt 2>/dev/null | cut -d= -f2- || true)
fi

mkdir -p "$APP_DIR"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
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
fi

JWT=$(grep -E '^JWT_SECRET=' .env | cut -d= -f2- | tr -d '"' || true)
if [[ -z "$JWT" || "$JWT" == replace_with* ]]; then
  JWT=$(openssl rand -base64 48 | tr -d '\n')
fi
if [[ -z "$DB_PASS" ]]; then
  DB_PASS=$(grep SHELFY_DB_PASS= /root/shelfy-db-credentials.txt | cut -d= -f2-)
fi
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public"

set_env() {
  local key=$1 val=$2
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=\"${val}\"|" .env
  else
    echo "${key}=\"${val}\"" >> .env
  fi
}

set_env NODE_ENV production
set_env PORT "$APP_PORT"
set_env APP_URL "https://shelfy.co.tz"
set_env JWT_SECRET "$JWT"
set_env DATABASE_URL "$DATABASE_URL"
set_env ALLOW_DEMO_LOGIN false
set_env EMAIL_FROM "Shelfy <hello@shelfy.co.tz>"
set_env EMAIL_REPLY_TO "hello@shelfy.co.tz"
set_env SMTP_HOST "127.0.0.1"
set_env SMTP_PORT "25"
set_env SMTP_USER "hello@shelfy.co.tz"
set_env SMTP_SECURE "false"
set_env SMTP_TLS_INSECURE "true"

mkdir -p "$APP_DIR/uploads" "$APP_DIR/data/uploads"
chown -R www-data:www-data "$APP_DIR" || true

cp scripts/vps/shelfy.service /etc/systemd/system/shelfy.service
systemctl daemon-reload
systemctl enable shelfy
systemctl restart shelfy
sleep 3
curl -sf "http://127.0.0.1:${APP_PORT}/api/health" | head -c 400
echo ""

echo "==> Caddy (Christian Radios docker)"
COMPOSE_DIR=""
for d in /opt/christian-radios /root/christian-radios /root/christianradios /var/www/christian-radios; do
  if [[ -f "$d/docker-compose.yml" || -f "$d/compose.yml" ]]; then COMPOSE_DIR=$d; break; fi
done
if [[ -z "$COMPOSE_DIR" ]]; then
  COMPOSE_DIR=$(find /root /var/www /opt -maxdepth 4 -name 'docker-compose.yml' 2>/dev/null | head -1 | xargs dirname)
fi
echo "Compose dir: ${COMPOSE_DIR:-NOT FOUND}"

SNIPPET="$APP_DIR/scripts/vps/Caddyfile.shelfy.snippet"
if [[ -n "$COMPOSE_DIR" && -f "$SNIPPET" ]]; then
  CADDYFILE="$COMPOSE_DIR/Caddyfile"
  if [[ ! -f "$CADDYFILE" ]]; then
    CADDYFILE="$COMPOSE_DIR/caddy/Caddyfile"
  fi
  if [[ -f "$CADDYFILE" ]] && ! grep -q 'shelfy.co.tz' "$CADDYFILE"; then
    echo "" >> "$CADDYFILE"
    sed 's/127.0.0.1:3002/host.docker.internal:3002/' "$SNIPPET" >> "$CADDYFILE"
    echo "Appended Shelfy block to $CADDYFILE (host.docker.internal:3002)"
  fi
  if [[ -f "$COMPOSE_DIR/docker-compose.yml" ]]; then
    python3 <<'PY'
from pathlib import Path
p = Path("/opt/christian-radios/docker-compose.yml")
text = p.read_text()
if "  caddy:" in text:
    block = text.split("  caddy:", 1)[1].split("\n\n", 1)[0]
    if "extra_hosts" not in block:
        text = text.replace(
            "      - caddy_config:/config\n    depends_on:\n      - app\n",
            "      - caddy_config:/config\n    extra_hosts:\n      - \"host.docker.internal:host-gateway\"\n    depends_on:\n      - app\n",
            1,
        )
        p.write_text(text)
PY
  fi
  ufw allow from 172.16.0.0/12 to any port 3002 proto tcp comment 'Shelfy from Docker Caddy' 2>/dev/null || true
  (cd "$COMPOSE_DIR" && docker compose up -d --force-recreate caddy)
fi

if [[ -f "$APP_DIR/scripts/vps/setup-shelfy-mail.sh" ]]; then
  bash "$APP_DIR/scripts/vps/setup-shelfy-mail.sh" || echo "Mail setup skipped or partial — configure Postfix manually"
fi

echo "DONE deploy script"
echo "Nameserver DNS: see docs/NAMESERVER_RECORDS.md on GitHub"

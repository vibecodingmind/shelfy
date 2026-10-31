#!/usr/bin/env bash
# Daily Postgres backup for Shelfy (install via cron on VPS). Does not touch Christian Radios DB.
set -euo pipefail
BACKUP_DIR=/var/backups/shelfy
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
sudo -u postgres pg_dump -Fc shelfy > "${BACKUP_DIR}/shelfy-${STAMP}.dump"
find "$BACKUP_DIR" -name 'shelfy-*.dump' -mtime +14 -delete
echo "Wrote ${BACKUP_DIR}/shelfy-${STAMP}.dump"

#!/usr/bin/env bash
# Add shelfy.co.tz to existing Postfix on host (Christian Radios mail may already run).
set -euo pipefail

DOMAIN=shelfy.co.tz
HELLO=hello@shelfy.co.tz
APP_USER=shelfy-mail
APP_DIR=/var/www/shelfy
MAIL_DIR=/var/mail/vhosts/${DOMAIN}

if ! command -v postconf >/dev/null; then
  DEBIAN_FRONTEND=noninteractive apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y postfix mailutils opendkim opendkim-tools
fi

systemctl enable --now postfix opendkim 2>/dev/null || true

# Virtual domain maps (append if missing)
VM_DOMAINS=/etc/postfix/virtual_mailbox_domains
VM_MAPS=/etc/postfix/virtual_mailbox_maps
VM_ALIASES=/etc/postfix/virtual_alias_maps

touch "$VM_DOMAINS" "$VM_MAPS" "$VM_ALIASES"
grep -q "$DOMAIN" "$VM_DOMAINS" || echo "$DOMAIN OK" >> "$VM_DOMAINS"
grep -q "$HELLO" "$VM_MAPS" || echo "${HELLO} ${DOMAIN}/hello/" >> "$VM_MAPS"

mkdir -p "$MAIL_DIR/hello"
groupadd -f vmail 2>/dev/null || true
id shelfy-mail 2>/dev/null || useradd -r -g vmail -d "$MAIL_DIR" -s /usr/sbin/nologin "$APP_USER"
chown -R vmail:vmail /var/mail/vhosts 2>/dev/null || chown -R "$APP_USER":vmail "$MAIL_DIR"

# SASL app password for Shelfy SMTP submission
if [[ ! -f /root/shelfy-mail-credentials.txt ]]; then
  MAIL_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 18)
  echo "SHELFY_SMTP_USER=${APP_USER}" > /root/shelfy-mail-credentials.txt
  echo "SHELFY_SMTP_PASS=${MAIL_PASS}" >> /root/shelfy-mail-credentials.txt
  chmod 600 /root/shelfy-mail-credentials.txt
  # If sasldb exists, add user (may require saslpasswd2)
  if command -v saslpasswd2 >/dev/null; then
    echo "$MAIL_PASS" | saslpasswd2 -c -p -u "$DOMAIN" "$APP_USER" 2>/dev/null || true
  fi
fi

postconf -e "virtual_mailbox_domains = hash:${VM_DOMAINS}" 2>/dev/null || true
postmap "hash:${VM_DOMAINS}" 2>/dev/null || true
postmap "hash:${VM_MAPS}" 2>/dev/null || true

# Shelfy .env SMTP (local submission)
if [[ -f "$APP_DIR/.env" ]]; then
  source /root/shelfy-mail-credentials.txt
  for kv in SMTP_HOST=127.0.0.1 SMTP_PORT=25 SMTP_USER="$SHELFY_SMTP_USER" SMTP_PASS="$SHELFY_SMTP_PASS" SMTP_SECURE=false EMAIL_REPLY_TO=hello@shelfy.co.tz; do
    key="${kv%%=*}"
    val="${kv#*=}"
    if grep -q "^${key}=" "$APP_DIR/.env"; then
      sed -i "s|^${key}=.*|${key}=\"${val}\"|" "$APP_DIR/.env"
    else
      echo "${key}=\"${val}\"" >> "$APP_DIR/.env"
    fi
  done
  systemctl restart shelfy 2>/dev/null || true
fi

systemctl reload postfix 2>/dev/null || systemctl restart postfix
echo "Mail setup attempted for ${DOMAIN}. Verify: postconf virtual_mailbox_domains"
echo "DNS when nameservers point here: MX @ -> mail.${DOMAIN} or A @, SPF, DKIM (see docs/NAMESERVER_RECORDS.md)"

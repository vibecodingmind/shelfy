# VPS audit notes (2026-10-30)

**Target host IP (christianradios.online A record):** `74.208.197.99`

**Public edge (no SSH):** HTTPS responses include `via: 1.1 Caddy` — TLS and reverse proxy are **Caddy**, not Nginx.

**Christian Radios:** `GET https://christianradios.online/api/health` → `200`, JSON `Christian Radios API Engine`, `environment: production`.

**Shelfy DNS:** `shelfy.co.tz` had **no A record** at audit time — add `@` and `www` → `74.208.197.99` before Certbot/Caddy can serve HTTPS for Shelfy.

**SSH from automation machine:** no private key in `~/.ssh/` — server access requires your VPS key/password. Run [`install-shelfy.sh`](./install-shelfy.sh) after logging in.

**Isolation reminder:** Shelfy uses `PORT=3002`, Postgres database `shelfy`, path `/var/www/shelfy`, env `/var/www/shelfy/.env` — do not reuse Christian Radios `.env` or database.

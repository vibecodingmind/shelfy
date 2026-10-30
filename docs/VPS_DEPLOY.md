# Shelfy — VPS deploy (alongside other sites)

Deploy Shelfy on its own path, port, Postgres database, and Nginx vhost. Do **not** share `.env`, JWT secrets, or `DATABASE_URL` with other apps on the same server (e.g. Christian Radios).

## Repository

- **Clone:** `https://github.com/vibecodingmind/shelfy.git`
- **Production branch:** `main` (or the release branch your team agrees on)
- **App directory:** `/var/www/shelfy`

## First install

```bash
sudo mkdir -p /var/www/shelfy
sudo chown "$USER":"$USER" /var/www/shelfy
git clone https://github.com/vibecodingmind/shelfy.git /var/www/shelfy
cd /var/www/shelfy
git checkout main
cp .env.example .env
# Edit .env on the server only — never commit secrets
npm ci
npm run build
```

## Environment (minimum)

| Variable | Example |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3002` (must not collide with other Node apps) |
| `APP_URL` | `https://shelfy.co.tz` |
| `JWT_SECRET` | unique long random string |
| `DATABASE_URL` | Postgres database named `shelfy` (dedicated role) |
| `GEMINI_API_KEY` | Google AI Studio key |
| `AZAMPAY_*` | Live/sandbox Azam Pay; callback `https://shelfy.co.tz/api/payments/azampay/callback` |
| `RESEND_API_KEY` | Resend (domain `shelfy.co.tz` verified) |
| `EMAIL_FROM` | `Shelfy <hello@shelfy.co.tz>` |
| `ALLOW_DEMO_LOGIN` | `false` in production |

## systemd

Example unit `/etc/systemd/system/shelfy.service`:

```ini
[Unit]
Description=Shelfy marketplace
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/shelfy
EnvironmentFile=/var/www/shelfy/.env
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now shelfy
curl -s http://127.0.0.1:3002/api/health | jq .
```

## Nginx

Separate `server_name shelfy.co.tz www.shelfy.co.tz` block proxying to `http://127.0.0.1:3002`. TLS via Certbot. Do not reuse another site’s `root` or upstream.

## Updates

```bash
cd /var/www/shelfy
git fetch origin
git checkout main && git pull
npm ci
npm run build
sudo systemctl restart shelfy
```

## Backups

- `pg_dump` the `shelfy` database on a schedule
- Archive `/var/www/shelfy/uploads` (or S3 if configured)

See also [DEPLOYMENT.md](../DEPLOYMENT.md) and [RUNBOOK.md](./RUNBOOK.md).

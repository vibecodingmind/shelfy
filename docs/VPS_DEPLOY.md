# SHELFY — VPS deployment

Use this guide when you move off Railway to your own VPS (Ubuntu/Debian recommended). For a **local preview** on port 3007, see [Local preview](#local-preview-port-3007) below.

Related: [RUNBOOK.md](./RUNBOOK.md) · [DEPLOYMENT.md](../DEPLOYMENT.md)

---

## Recommended VPS stack

| Piece | Choice |
| --- | --- |
| App | Docker image from repo `Dockerfile`, or systemd + `npm run build` |
| Database | PostgreSQL 16 (included in `docker-compose.yml`) |
| TLS | nginx or Caddy in front of the app |
| Uploads | S3-compatible storage **or** Docker volume on `/app/data` |
| Secrets | `.env.vps` (never commit); copy from `config/vps.env.example` |

---

## Quick path: Docker Compose

1. Install Docker Engine + Compose plugin on the VPS.
2. Clone the repo to `/opt/shelfy` (or deploy via CI artifact).
3. Create secrets:

   ```bash
   cp config/vps.env.example .env.vps
   # Edit: APP_URL, POSTGRES_PASSWORD, DATABASE_URL (include password in URL), JWT_SECRET, PesaPal, email, S3
   ```

4. Deploy:

   ```bash
   chmod +x scripts/deploy-vps-docker.sh
   ./scripts/deploy-vps-docker.sh .env.vps
   ```

5. Put nginx in front (`deploy/nginx/shelfy.conf.example`), point DNS to the VPS, run certbot.
6. Post-deploy checks:

   ```bash
   npm run smoke:prod -- https://your-domain.co.tz
   npm run rehearse:payment -- https://your-domain.co.tz   # sandbox or live rehearsal
   ```

`GET /api/health` must show `db.driver: "prisma"`, `jwt.configured: true`, and `jwt.ephemeral: false`.

---

## Alternative: systemd + Postgres on the host

1. Install Node 20, PostgreSQL, create DB user/database.
2. Set `/etc/shelfy/env` (same keys as `config/vps.env.example`, `DATABASE_URL` pointing at local Postgres).
3. Build on the server:

   ```bash
   npm ci
   npm run build
   ```

4. Enable `deploy/systemd/shelfy.service.example` (adjust paths).
5. Run migrations on each release — the production server runs `prisma migrate deploy` on boot when using `node dist/server.cjs`.

---

## Firewall

- Public: **80/443** (nginx)
- Do **not** expose Postgres (5432) to the internet.
- If you map Shelfy directly, restrict **3000** to localhost only and use nginx as the only public entry.

---

## Backups

- Postgres: daily `pg_dump` (see [RUNBOOK.md](./RUNBOOK.md)).
- Uploads: S3 versioning, or backup the `shelfy_data` Docker volume / `data/uploads` directory.

---

## Local preview (port 3007)

On your laptop (JSON database, demo logins, Vite HMR via Express):

```bash
npm ci
cp config/local.preview.env .env    # optional; or use npm script only
npm run dev:3007
```

Open **http://localhost:3007**

Demo vendor: `vendor@shelfy.co.tz` / `Password123!` (requires `ALLOW_DEMO_LOGIN=true`, set in `dev:3007` script).

Smoke locally:

```bash
npm run smoke:prod -- http://localhost:3007
```

---

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs typecheck and Vitest on every push/PR — enable before relying on VPS deploys from `main`.

# SHELFY — PRODUCTION RUNBOOK

This is an operations guide for Railway + PostgreSQL. It does **not** mean the marketplace is launch-ready. Live PesaPal keys are still required. `JWT_SECRET` should be set in Railway Variables; if it is missing the app now persists a generated secret in Postgres so sessions survive deploys.

Related: [BUSINESS_RULES.md](./BUSINESS_RULES.md) · [CHECKLIST.md](./CHECKLIST.md)

---

## Environment variables

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL. When set, Prisma is the source of truth. |
| `JWT_SECRET` | Yes (auto-persisted if missing) | Access-token signing. If unset, the app generates one and stores it in Postgres as `ops_jwt_secret` (not exposed on `/api/settings`). Prefer setting `JWT_SECRET` in Railway Variables. |
| `APP_URL` | Yes (or Railway public domain) | Public origin for PesaPal callbacks and email links. If unset, production uses `https://$RAILWAY_PUBLIC_DOMAIN`. |
| `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET` | Yes for live pay | Official PesaPal v3. Without them, checkout cannot register orders. |
| `PESAPAL_ENVIRONMENT` | `sandbox` or `live` | Defaults to sandbox. |
| `PESAPAL_IPN_ID` | Recommended | Cached IPN id; otherwise registered at runtime. |
| `PESAPAL_SANDBOX_KEY` | Sandbox only | HMAC for signed sandbox complete. |
| `ALLOW_DEMO_LOGIN` | No | Must stay unset/false in production unless a staged demo is intentional. |
| `S3_BUCKET` + `S3_ACCESS_KEY` + `S3_SECRET_KEY` | No | Enables S3-compatible uploads. Falls back to local disk on failure. |
| `S3_ENDPOINT` / `S3_REGION` / `S3_PUBLIC_BASE_URL` | No | Custom endpoint (R2/MinIO), region (default `us-east-1`), public CDN base. |
| `RESEND_API_KEY` or `SMTP_URL` | No | Marks email as configured. Resend is the wired sender; SMTP is detected only. |
| `EMAIL_FROM` | No | Resend from-address. Default `Shelfy <noreply@shelfy.co.tz>`. |
| `AFRICASTALKING_API_KEY` (+ `AFRICASTALKING_USERNAME`) or `TWILIO_AUTH_TOKEN` (+ `TWILIO_ACCOUNT_SID` + `TWILIO_FROM`) | No | SMS. Missing keys skip SMS; in-app still writes. |
| `DATA_DIR` / `RAILWAY_VOLUME_MOUNT_PATH` | Volume only | Local JSON + `/uploads` when not using S3. |
| `GEMINI_API_KEY` | Optional | AI features. Marketplace money path does not depend on it. |
| `PORT` | Railway sets | Listen port. |

`GET /api/health` stays **200** even when secrets are missing. It reports `jwt.ephemeral`, `pesapal.configured`, `storage.driver`, and email/SMS flags so boot checks do not fail. Treat missing secrets as a **release blocker**, not a crash.

---

## Release / migrate

On each production deploy, `npm start` runs `node dist/server.cjs`. The process binds `/api/health` immediately, then runs `prisma migrate deploy` in-process (90s timeout). If the database already has the JSONB `shelfy_store` table, boot creates `_prisma_migrations` first so Prisma does not abort with P3005. Do not use `prisma migrate dev` against production.

Confirm after boot:

```bash
curl -sS "$APP_URL/api/health"
```

Expect `status: "ok"`, `db.driver: "prisma"`, `jwt.configured: true`, `jwt.ephemeral: false`.

---

## Backup

Prefer a logical dump. Example (Railway Postgres plugin or any Postgres client):

```bash
pg_dump --format=custom --no-owner --no-acl \
  --file="shelfy-$(date -u +%Y%m%dT%H%M%SZ).dump" \
  "$DATABASE_URL"
```

Plain SQL alternative:

```bash
pg_dump --no-owner --no-acl --file="shelfy.sql" "$DATABASE_URL"
```

Store dumps **off** the app volume (object storage or a backup bucket). Encrypt at rest. Retention is an ops decision; weekly + pre-migrate dumps are the minimum.

The ledger (`LedgerEntry`) is append-only. A dump is a point-in-time copy of that history. Do not “fix” balances by editing rows.

---

## Restore

Restore into an empty database (or a new Railway Postgres) then point `DATABASE_URL` at it.

Custom format:

```bash
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" shelfy.dump
```

SQL format:

```bash
psql "$DATABASE_URL" -f shelfy.json
```

Then:

```bash
npx prisma migrate deploy
```

If migrate reports the schema already matches, stop. Do **not** re-run seed against a restored production database.

Verify:

1. `GET /api/health` — prisma driver, user/shop counts look right.
2. Admin login (non-demo) works.
3. `GET /api/finance/summary` for a known host matches the pre-restore screenshot/export.
4. Spot-check one `PAID`/`ACTIVE` booking and its ledger postings.

---

## Ledger caution

- Never `UPDATE` or `DELETE` ledger rows to “correct” money.
- Corrections are new balanced postings (refund, reversal, payout fail).
- Host **pending** becomes **available** only when a booking completes.
- If dump and live disagree after restore, keep the dump, do not invent rows.

---

## Logs and health

API requests (except `/api/health`) emit one JSON line:

`method`, `path`, `status`, `ms`, `requestId`

The same `x-request-id` is returned on the response. Health is excluded so Railway probes stay quiet.

---

## Uploads

Without S3 env, files land in `$DATA_DIR/uploads` (or `data/uploads`) and are served at `/uploads/...`. Put a persistent volume on that path if you are not on S3. The service worker never caches `/api` or `/uploads`.

---

## Sessions

Access JWT TTL is **1 hour**. Refresh tokens are hashed `AuthToken` rows, type `REFRESH`, TTL **7 days**, rotated on `POST /api/auth/refresh`. Logout revokes unused refresh tokens for that user. Older 7-day access JWTs already issued remain valid until they expire.

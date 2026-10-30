# Shelfy — launch approval (2026-10-30)

**Classification: READY WITH CONDITIONS**

A successful build is not launch proof. This report records what was actually inspected and executed.

## A. Executive summary

Shelfy is a Tanzania shelf marketplace with four account types: `ADMIN`, `VENDOR`, `HOST`, `FIELD_AGENT`. There is no separate Super Admin, Support, Finance, or subscription product. Platform control is `ADMIN`.

The application is **deployed** on the VPS (`74.208.197.99`), listens on `127.0.0.1:3002`, uses a dedicated Postgres database `shelfy`, and is reverse-proxied by the existing Caddy container for `shelfy.co.tz`. Christian Radios remains a separate Docker stack.

Public HTTPS for `shelfy.co.tz` is **not live** until nameservers and A records point at this server. Live Azam Pay and Gemini are **not configured** on the server. Demo logins are blocked in production (`ALLOW_DEMO_LOGIN=false`).

## B. Feature matrix (actual product)

| Feature | Roles | Status | Evidence |
| --- | --- | --- | --- |
| Marketplace browse / search / shelf detail | Public | Implemented | UI + public APIs; not re-clicked in a browser this audit |
| Register / login / logout / password reset | Vendor, Host | Implemented | Auth routes + domain tests |
| Demo accounts | All | **Blocked in production** | `demoLoginAllowed()` when `NODE_ENV=production` and flag is not `true` |
| Profile, password, notification prefs | All logged-in | Implemented | `PUT /api/users/me`, settings page |
| Bookings + state machine | Vendor, Host, Admin | Implemented | `bookingMachine.ts`; PAID only via ADMIN/SYSTEM |
| Azam Pay | Vendor | **BLOCKED live** | Server `AZAMPAY_CLIENT_ID` missing; environment `sandbox` |
| Host earnings / withdrawals | Host, Admin | Implemented | Ledger + payout APIs; not a live payout test |
| Admin settings, users, KYC, disputes, audit | Admin | Implemented | Admin dashboard; no browser pass this audit |
| Field agent GPS + photo capture | Field agent | Implemented | `getUserMedia` still photo for shelf audit — **not** a multi-party WebRTC live session |
| AI ShelfMatch / insights / photo audit | Vendor, Agent | **BLOCKED** | `GEMINI_API_KEY` missing on VPS |
| Email | All | Partial | SMTP host `127.0.0.1` set; inbox delivery not proven; MX waits on DNS |
| Subscriptions / negotiation / brand pages / live admin camera | — | **Not in this product** | No models or routes |

## C. Roles tested

| Role in the request | Shelfy equivalent | Server-side gate |
| --- | --- | --- |
| Super Admin / Support / Finance | Single `ADMIN` | `requireRole('ADMIN')` |
| Vendor | `VENDOR` | Self-register allowed |
| Space owner | `HOST` | Self-register allowed |
| Field agent | `FIELD_AGENT` | Admin invite only |
| Public | Unauthenticated | Public shelf/shop reads |

Automated HTTP tests cover login, refresh, client payment-confirm rejection (410), and booking IDOR. A full click-through of every dashboard was **not** executed in a browser during this audit.

## D. Test results (executed)

Command: `npx vitest run` on 2026-10-30.

- Test files: **12 passed**
- Tests: **99 passed**, **1 skipped**, **0 failed**
- Playwright e2e: **not run** in this audit
- Load test: **not run**
- Mobile camera / GPS in the field: **not run**

## E. Security

| Item | Severity | Status |
| --- | --- | --- |
| Demo login in production | High if enabled | Mitigated: `ALLOW_DEMO_LOGIN=false` |
| Payment marked paid from the browser | Critical | Mitigated: callback-verify/checkout client confirm return 410; PAID is SYSTEM/ADMIN |
| Role taken from the client body | High | JWT role is server-side; do not trust body role |
| Secrets in git | High | `.env` not committed; DB/mail passwords only on the server |
| Shared VPS root password in chat | High | **Change the root password** |
| Gemini / Azam keys | — | Not set (cannot leak what is absent) |
| Disk ~76% on VPS | Medium | Free space before growth |

No destructive production migration was run.

## F. Performance

No load test was run. Do not treat build time as a capacity number. VPS at audit: Ubuntu 24.04, Shelfy process active, health HTTP 200 locally.

## G. Integrations

| Integration | Status |
| --- | --- |
| Postgres `shelfy` | Connected (`/api/health` db driver postgres) |
| Azam Pay | **BLOCKED** — set live `AZAMPAY_*` and callback `https://shelfy.co.tz/api/payments/azampay/callback` |
| Gemini | **BLOCKED** — set `GEMINI_API_KEY` |
| Email SMTP | Configured to localhost; prove with a real register after MX |
| Maps | OSM in the UI; not retested live |
| Live WebRTC inspection | **Not implemented** (agent still-photo capture only) |
| Christian Radios | Separate containers; health still OK at last deploy check |

## H. Database

Prisma migrations run on boot. Production uses database `shelfy` owned by `shelfy_app`, not the Christian Radios Docker Postgres. Seed catalogue was imported on first boot (demo users exist but demo login is refused). **No backup cron was verified.** Add `pg_dump` before further schema changes.

## I. Outstanding (blocks a clean public launch)

1. Point **shelfy.co.tz** nameservers and A/MX records to `74.208.197.99` ([NAMESERVER_RECORDS.md](./NAMESERVER_RECORDS.md)).
2. Set **Azam Pay live** credentials (or accept sandbox-only).
3. Set **GEMINI_API_KEY** or accept AI features offline.
4. Send a real verification email after DNS/MX.
5. Rotate VPS root password; add SSH keys.
6. Schedule Postgres backups.
7. Replace or suspend seeded demo users if you do not want them in the directory (login is already blocked).

## J. Deployment (already applied)

- Code: `https://github.com/vibecodingmind/shelfy` branch `main`
- Path: `/var/www/shelfy`
- Service: `systemctl restart shelfy`
- Proxy: Caddy site `shelfy.co.tz` → `host.docker.internal:3002`
- Health: `curl -sf http://127.0.0.1:3002/api/health`

Update later:

```bash
cd /var/www/shelfy && git pull origin main && npm ci && npm run build
chown -R www-data:www-data /var/www/shelfy
systemctl restart shelfy
```

## K. Rollback

```bash
cd /var/www/shelfy && git log -1 --oneline
git checkout <previous-sha> && npm ci && npm run build
chown -R www-data:www-data /var/www/shelfy
systemctl restart shelfy
```

Database rollback needs a `pg_dump` taken before the change. None was taken by this audit.

## Launch gate

**READY WITH CONDITIONS.** Core auth, booking transitions, and payment confirmation rules are in code and covered by unit/API tests. Public launch still needs DNS, live payments, Gemini if AI is required, proven mail, and backups.

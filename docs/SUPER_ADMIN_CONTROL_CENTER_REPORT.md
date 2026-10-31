# Super Admin Control Center — delivery report

## New admin surfaces (UI)

- **Dashboard (Analytics)** — date presets, KPI grid, registration/revenue/booking/payment charts (`AdminAnalyticsPanel`).
- **Clients** — create multi-role clients, search, suspend, verify email, reset password, CSV export (`AdminClientsPanel`).
- **Payment gateways** — Azam Pay sandbox/live config, encrypted secrets, test connection (`AdminGatewaysPanel`).
- **Integrations** — status hub, API client keys (shown once), integration logs; WebRTC admin join marked not available (`AdminIntegrationsPanel`).
- **Subscriptions** — plan CRUD and subscription list (`AdminSubscriptionsPanel`).
- Existing tabs retained: Snapshot, Users, Marketplace, Bookings, Field, Finance, Support, Settings, Audit.

## Backend

- [`src/server/adminRoutes.ts`](../src/server/adminRoutes.ts) — clients, staff, analytics, gateways, integrations, commission rules, subscriptions, API clients, templates, inspections, featured shelves.
- [`src/server/admin/authorization.ts`](../src/server/admin/authorization.ts) — granular `AdminPermission` checks via `requireAdminPermission`.
- [`src/server/admin/encryption.ts`](../src/server/admin/encryption.ts) — AES-256-GCM for integration secrets (`INTEGRATION_ENCRYPTION_KEY`).
- [`src/server/admin/integrationStore.ts`](../src/server/admin/integrationStore.ts) — encrypted credential storage + Azam Pay env builder.
- [`src/server/admin/analytics.ts`](../src/server/admin/analytics.ts) — range-based aggregates and time series.
- [`src/server/admin/entitlements.ts`](../src/server/admin/entitlements.ts) — subscription entitlements (e.g. reduced commission on booking).
- `POST /api/auth/switch-role` — multi-role active context (JWT).
- Prisma migration [`20261031140000_admin_control_center`](../prisma/migrations/20261031140000_admin_control_center/migration.sql).

## Security

- Admin routes require `ADMIN` role + permission (except legacy routes updated to `requireAdminPermission`).
- Gateway/integration secrets stored encrypted; list APIs return masked metadata only.
- Vendors receive 403 on `/api/admin/*` (covered in tests).

## Tests

- Vitest: `encryption.test.ts`, `authorization.test.ts`, extended `http.test.ts`.
- Playwright: `e2e/admin-control-center.spec.ts`.

## Operator configuration

- Set `INTEGRATION_ENCRYPTION_KEY` (64-char hex or long passphrase) on VPS before saving gateway credentials from the UI.
- Azam Pay still falls back to `AZAMPAY_*` env vars until admin saves DB config with encryption enabled.

## Limitations

- Pesapal / Stripe / Flutterwave: registry entries only — not integrated.
- Live admin WebRTC inspection: not implemented (field agent photo/GPS workflow only).
- Homepage marketing banners: deferred (featured shelf flag supported via API).

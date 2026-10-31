# Super Admin Control Center — Phase 1 inventory

Last updated: implementation baseline before Control Center rollout.

## Existing admin API routes

| Method | Path | Module | Notes |
|--------|------|--------|-------|
| GET | `/api/admin/dashboard` | server.ts | Aggregate counts, no date filter |
| GET | `/api/admin/users` | server.ts | List users (public DTO) |
| PUT | `/api/admin/users/:id/status` | server.ts | ACTIVE / SUSPENDED / PENDING |
| GET | `/api/admin/audit-logs` | server.ts | Full audit list |
| GET | `/api/admin/integrations` | server.ts | Status only, env-based |
| GET | `/api/admin/payments/overview` | server.ts | Recent payments + attempts |
| PUT | `/api/admin/settings` | server.ts | PlatformSettings JSON |
| POST | `/api/admin/agents` | server.ts | Create field agent |
| POST | `/api/admin/payments/:id/reconcile` | server.ts | Payment reconcile |
| GET | `/api/admin/verifications` | p1Routes.ts | KYC queue |
| POST | `/api/admin/verifications/:id/decide` | p1Routes.ts | Approve/reject |
| POST | `/api/admin/withdrawals/:id/approve` | p1Routes.ts | Payout workflow |
| POST | `/api/admin/withdrawals/:id/process` | p1Routes.ts | |
| POST | `/api/admin/withdrawals/:id/fail` | p1Routes.ts | |
| POST | `/api/admin/withdrawals/:id/automate` | phaseRoutes.ts | |
| POST | `/api/admin/disputes/:id/resolve` | p1Routes.ts | |

All routes use `requireAuth` + `requireRole('ADMIN')` only (no granular permissions).

## Frontend

- [`AdminDashboard.tsx`](../src/components/AdminDashboard.tsx) — 9 tabs: Overview, Users, Marketplace, Bookings, Field, Finance, Support, Settings, Audit.
- [`AdminPlatformSettings.tsx`](../src/components/AdminPlatformSettings.tsx) — business rules, read-only integrations, payments ops, invite agent.

## Gaps (addressed by Control Center milestones)

- No client CRUD, notes, password reset, export, detail pages.
- No admin permission model; single ADMIN role.
- One role per user (no vendor+host on one account).
- Payment credentials env-only; no gateway admin UI or encrypted DB store.
- No subscriptions, commission rules history, API clients, webhook log UI.
- Overview lacks date-range analytics and charts.
- Inspections: field visits/reports only; no WebRTC admin join (still-photo agent workflow).

## Auth model (target)

- `User.role` — active portal role (JWT `activeRole`).
- `UserRoleAssignment[]` — granted roles for multi-role accounts.
- `UserAdminPermission[]` — granular admin capabilities for `ADMIN` users.

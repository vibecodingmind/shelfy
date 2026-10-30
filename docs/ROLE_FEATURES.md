# Shelfy — feature inventory by role

**Platform control role:** `ADMIN` (there is no separate `SUPER_ADMIN`).

## Roles

| Role | Workspace | Primary purpose |
|------|-----------|-----------------|
| Guest | Marketplace | Browse, legal, sign up (Vendor/Host) |
| VENDOR | Vendor portal | Book shelves, products, pay via Azam Pay |
| HOST | Host portal | List shops/shelves, approve bookings, withdraw earnings |
| ADMIN | Admin control | Users, listings, KYC, payouts, platform settings, integrations status |
| FIELD_AGENT | Agent workspace | GPS check-in, shelf inspections, reports |

## Shared (logged in)

- Marketplace header: search, filters, theme, notifications, messages
- Messages: Vendor/Host in portal **Messages** tab; Admin/Agent on standalone Messages page
- User settings (`SETTINGS` view): profile, password, notification preferences
- Not in V1: affiliates, subscriptions, public member directory

## Vendor portal tabs

Overview · Find shelves · Bookings · Products · Inventory · AI insights · Messages

Withdrawals: N/A (vendors pay hosts via Azam Pay).

## Host portal tabs

Dashboard · Shops · Shelves · Bookings · Approvals · Messages · Earnings · **Settings** (payout phone, withdrawal history)

## Admin control tabs

Overview · Categories · Users · Shops · Bookings · Verify · Payouts · Disputes · **Settings** (business rules, integrations, payments ops, invite agent) · Audit

Integrations and payment secrets are configured via **environment variables** (Railway); admin UI shows status and callback URLs only.

## Field agent

Assigned visits, GPS check-in, photos, Gemini audit, submit report.

## Related docs

- [CHECKLIST.md](./CHECKLIST.md) — completion tracker  
- [DEPLOYMENT.md](../DEPLOYMENT.md) — Azam Pay env vars  
- [AFFILIATES_SPEC.md](./AFFILIATES_SPEC.md) — future referral program (not built)

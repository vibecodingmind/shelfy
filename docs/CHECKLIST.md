# SHELFY — LIVING COMPLETION TRACKER

Update this file as work lands. Do not mark a line done unless tests (or an explicit exception) exist.

Last updated: 2026-08-16 — P14 launch audit: security hardening, money-journey tests, `docs/LAUNCH_AUDIT.md` on `cursor/p0-marketplace-foundation-b9de`

---

## AUTH

- [x] Strong password rules (domain + register/reset)
- [x] Password hashing (bcrypt)
- [x] Email verification architecture (token, hashed, 24h)
- [x] Phone verification architecture (OTP store; SMS later)
- [x] Password reset (token, 1h, single use)
- [x] Rate limiting on auth routes
- [x] Session security (JWT; reset/suspend invalidates via password/status and refresh revoke)
- [x] Account lockout (5 failures / 15 minutes)
- [x] Suspended account blocked
- [x] Admin cannot self-register
- [x] Field agents admin-invited
- [x] `passwordHash` stripped from API responses
- [x] Demo login gated by `ALLOW_DEMO_LOGIN` in production
- [x] Refresh tokens / shorter JWT (P1 hardening)

## DATABASE

- [x] Relational Prisma schema
- [x] Initial migration
- [x] Indexes and unique constraints
- [x] Foreign keys
- [x] Enums for statuses
- [x] Import from JSON / `shelfy_store` on first boot
- [x] Production path stops writing JSONB after import
- [x] Soft-delete pass on shops/shelves (archive; blocked by active bookings)
- [x] Backup/restore runbook (Phase 13)

## MARKETPLACE

- [x] Shop create (existing, ownership check)
- [x] Shelf create (existing, ownership check)
- [x] Host listing wizard (6-step shop+shelf submit; quick-add still available)
- [x] Verification queue (admin decide; unpublished hidden)
- [x] Search / filter (existing)
- [x] Booking create + overlap
- [x] Public published-only filter
- [x] Slugs / SEO URLs (`/s/:slug`, unique slugify)

## BOOKING

- [x] State machine (no arbitrary transitions)
- [x] Status history
- [x] Approve-then-pay sequencing
- [x] Double-booking prevention
- [x] Commission calculation
- [x] Cancellation + refund quotes/execution
- [x] Expiration job (EXPIRING → COMPLETED + host release)
- [x] Renewal reminders (in-app 7-day EXPIRING + 1-day; email/SMS later)

## PAYMENTS

- [x] Server-created payment + attempt
- [x] Client-confirm routes removed (`callback-verify`, fake `checkout`)
- [x] PesaPal Auth / RegisterIPN / SubmitOrder / GetTransactionStatus
- [x] IPN + callback handlers
- [x] Idempotency
- [x] Amount / reference validation
- [x] Signed sandbox complete (no frontend “I paid”)
- [ ] Live PesaPal credentials on Railway (ops)
- [x] Reconciliation job (polls pending PesaPal tracking ids; no-op without keys)

## FINANCE

- [x] Append-only ledger
- [x] Host pending vs available
- [x] Payment split (vendor → commission + host pending)
- [x] Finance summary API
- [x] Withdrawal request (available only, min TZS 20,000, one in-flight)
- [x] Admin payout + reference
- [x] Failed payout reversal
- [x] Refund postings (balanced, including cancellation fee)

## OPERATIONS

- [x] Agent assignment (admin creates visit with shop coordinates)
- [x] GPS vs shop coordinates (250m check-in)
- [x] Field reports require assigned visit + check-in
- [x] In-app notifications (existing + payment/booking/cancel/payout/verification events)
- [x] Central notification engine / email/SMS (P2)

## SECURITY

- [x] RBAC helpers
- [x] Message authorization (booking relationship)
- [x] IDOR tests (bookings, messages, payments)
- [x] Rate limiting (auth + payments)
- [x] Upload security (JPEG/PNG/WebP, ≤2.5MB; local disk + optional S3)
- [x] Fake payment callback rejected (covered by IPN verify tests)
- [x] Security test suite expansion (Phase 14 / Phase 22 domain suite)

## QA

- [x] Unit tests (rules, machine, ledger, payments, P1 listings/cancel/GPS/withdrawals)
- [x] API/auth tests (vitest)
- [x] Integration tests against Postgres (skipped unless `DATABASE_URL` is reachable)
- [x] E2E critical journeys (domain money path capture → release → withdraw; no Playwright UI suite yet)

## P1 remaining / P2+

- [x] Host listing wizard (multi-step)
- [x] Object storage (S3) for uploads
- [x] Email/SMS provider for expiration and OTP (dispatcher; sends when keys exist, otherwise skip)
- [x] Reviews & disputes (API + admin resolve; no automatic money invention)
- [x] Analytics from real aggregates (paid occupancy 30d + GMV from paid payments)
- [x] Legal page placeholders (`LEGAL_REVIEW_REQUIRED`)
- [x] PWA shell (manifest + service worker; `/api` is never cached)
- [x] Production monitoring (JSON `/api` request logs + health flags; not a full APM)
- [ ] Live PesaPal keys + stable `JWT_SECRET` (Railway ops)

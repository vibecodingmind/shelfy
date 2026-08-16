# SHELFY — LIVING COMPLETION TRACKER

Update this file as work lands. Do not mark a line done unless tests (or an explicit exception) exist.

Last updated: 2026-08-16 — P1 marketplace operations on `cursor/p0-marketplace-foundation-b9de`

---

## AUTH

- [x] Strong password rules (domain + register/reset)
- [x] Password hashing (bcrypt)
- [x] Email verification architecture (token, hashed, 24h)
- [x] Phone verification architecture (OTP store; SMS later)
- [x] Password reset (token, 1h, single use)
- [x] Rate limiting on auth routes
- [x] Session security (JWT; reset/suspend invalidates via password/status)
- [x] Account lockout (5 failures / 15 minutes)
- [x] Suspended account blocked
- [x] Admin cannot self-register
- [x] Field agents admin-invited
- [x] `passwordHash` stripped from API responses
- [x] Demo login gated by `ALLOW_DEMO_LOGIN` in production
- [ ] Refresh tokens / shorter JWT (P1 hardening)

## DATABASE

- [x] Relational Prisma schema
- [x] Initial migration
- [x] Indexes and unique constraints
- [x] Foreign keys
- [x] Enums for statuses
- [x] Import from JSON / `shelfy_store` on first boot
- [x] Production path stops writing JSONB after import
- [ ] Soft-delete pass on all catalogue entities (P1)
- [ ] Backup/restore runbook (Phase 13)

## MARKETPLACE

- [x] Shop create (existing, ownership check)
- [x] Shelf create (existing, ownership check)
- [ ] Host listing wizard (P1 stand-in: create + submit-for-verification, not a 13-step wizard)
- [x] Verification queue (admin decide; unpublished hidden)
- [x] Search / filter (existing)
- [x] Booking create + overlap
- [x] Public published-only filter
- [ ] Slugs / SEO URLs (P2)

## BOOKING

- [x] State machine (no arbitrary transitions)
- [x] Status history
- [x] Approve-then-pay sequencing
- [x] Double-booking prevention
- [x] Commission calculation
- [x] Cancellation + refund quotes/execution
- [x] Expiration job (EXPIRING → COMPLETED + host release)
- [ ] Renewal reminders (P1 remaining: email/SMS)

## PAYMENTS

- [x] Server-created payment + attempt
- [x] Client-confirm routes removed (`callback-verify`, fake `checkout`)
- [x] PesaPal Auth / RegisterIPN / SubmitOrder / GetTransactionStatus
- [x] IPN + callback handlers
- [x] Idempotency
- [x] Amount / reference validation
- [x] Signed sandbox complete (no frontend “I paid”)
- [ ] Live PesaPal credentials on Railway (ops)
- [ ] Reconciliation job (P1 remaining)

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
- [ ] Central notification engine / email/SMS (P2)

## SECURITY

- [x] RBAC helpers
- [x] Message authorization (booking relationship)
- [x] IDOR tests (bookings, messages, payments)
- [x] Rate limiting (auth + payments)
- [x] Upload security (JPEG/PNG/WebP, ≤2.5MB; local disk, not S3)
- [x] Fake payment callback rejected (covered by IPN verify tests)
- [ ] Security test suite expansion (Phase 22)

## QA

- [x] Unit tests (rules, machine, ledger, payments, P1 listings/cancel/GPS/withdrawals)
- [x] API/auth tests (vitest)
- [ ] Integration tests against Postgres (when `DATABASE_URL` in CI)
- [ ] E2E critical journeys (P1/P10)

## P1 remaining / P2+

- [ ] Host listing wizard (multi-step)
- [ ] Object storage (S3) for uploads
- [ ] Email/SMS provider for expiration and OTP
- [ ] Reviews & disputes
- [ ] Analytics from real aggregates (admin GMV now uses paid payments; occupancy/PWA later)
- [x] Legal page placeholders (`LEGAL_REVIEW_REQUIRED`)
- [ ] Production monitoring
- [ ] Live PesaPal keys + stable `JWT_SECRET` (Railway ops)

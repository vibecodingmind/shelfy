# SHELFY — LIVING COMPLETION TRACKER

Update this file as work lands. Do not mark a line done unless tests (or an explicit exception) exist.

Last updated: 2026-08-16 — P0 implemented on `cursor/p0-marketplace-foundation-b9de`

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
- [ ] Host listing wizard (P1)
- [ ] Verification queue (P1)
- [x] Search / filter (existing)
- [x] Booking create + overlap
- [ ] Public published-only filter (P1)
- [ ] Slugs / SEO URLs (P2)

## BOOKING

- [x] State machine (no arbitrary transitions)
- [x] Status history
- [x] Approve-then-pay sequencing
- [x] Double-booking prevention
- [x] Commission calculation
- [ ] Cancellation + refund execution (P1)
- [ ] Expiration cron (P1)
- [ ] Renewal reminders (P1)

## PAYMENTS

- [x] Server-created payment + attempt
- [x] Client-confirm routes removed (`callback-verify`, fake `checkout`)
- [x] PesaPal Auth / RegisterIPN / SubmitOrder / GetTransactionStatus
- [x] IPN + callback handlers
- [x] Idempotency
- [x] Amount / reference validation
- [x] Signed sandbox complete (no frontend “I paid”)
- [ ] Live PesaPal credentials on Railway (ops)
- [ ] Reconciliation job (P1)

## FINANCE

- [x] Append-only ledger
- [x] Host pending vs available
- [x] Payment split (vendor → commission + host pending)
- [x] Finance summary API
- [ ] Withdrawal request (P1)
- [ ] Admin payout + reference (P1)
- [ ] Failed payout reversal (P1)
- [ ] Refund postings (P1)

## OPERATIONS

- [ ] Agent assignment (P1)
- [ ] GPS vs shop coordinates (P1)
- [ ] Field reports (P1)
- [x] In-app notifications (existing + payment/booking events)
- [ ] Central notification engine (P1)

## SECURITY

- [x] RBAC helpers
- [x] Message authorization (booking relationship)
- [x] IDOR tests (bookings, messages, payments)
- [x] Rate limiting (auth + payments)
- [ ] Upload security (P1)
- [ ] Fake payment callback rejected (covered by IPN verify tests)
- [ ] Security test suite expansion (Phase 22)

## QA

- [x] Unit tests (rules, machine, ledger, payments)
- [x] API/auth tests (vitest)
- [ ] Integration tests against Postgres (when `DATABASE_URL` in CI)
- [ ] E2E critical journeys (P1/P10)

## P1+ (not started)

- [ ] Verification & trust queue
- [ ] Upload / object storage
- [ ] Withdrawals & payouts
- [ ] Reviews & disputes
- [ ] Analytics from real aggregates
- [ ] PWA
- [ ] Legal pages (placeholders)
- [ ] Production monitoring

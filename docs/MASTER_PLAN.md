# SHELFY — MASTER IMPLEMENTATION ROADMAP

**Goal:** Turn the current visually strong prototype into a production marketplace whose core transaction is reliable:

Host creates shop/shelf → verification → public listing → vendor books → host approves (if required) → vendor pays → **server-side verification** → ACTIVE → complete → host payable → withdrawal → admin payout.

**North star:** Trust + Security + Correct Money + Data Integrity + UX + Operational Reliability.

Do not add random UI. Do not skip tests. After each phase: implement → test → inspect → fix → update `docs/CHECKLIST.md` → continue.

Related: [BUSINESS_RULES.md](./BUSINESS_RULES.md) · [CHECKLIST.md](./CHECKLIST.md)

---

## Current baseline (accepted audit)

| Layer | Today | Target |
| --- | --- | --- |
| Persistence | One JSON document (`shelfy.json` or `shelfy_store` JSONB) | PostgreSQL + Prisma, FKs, enums, transactions |
| Payments | Frontend countdown then “I paid” | PesaPal v3 + GetTransactionStatus + IPN |
| Money | Implied payout rows / no ledger | Append-only ledger, computed balances |
| Auth | JWT + bcrypt, weak rules, hashes leak on admin API | Verify, reset, lockout, rate limit, publicUser() |
| RBAC | Role check; ADMIN bypass; message IDOR | Ownership + relationship checks + tests |
| Bookings | Partial overlap check, loose status writes | State machine + history |
| Ops | Demo field visits, hardcoded GPS | Real assignment + shop coordinates (P1) |
| Tests | None | Unit + API + integration for P0 paths |

**Preserve:** marketplace look, role dashboards, map/search cards, existing seed catalogue.

---

## Phase 0 — Architecture & Business Rules

**Objective:** Lock V1 model and implementation order before more features.

**Features:** This roadmap, business rules, living checklist, P0/P1/P2/P3 priority.

**Database / API / Frontend:** None (docs only).

**Security:** Decisions recorded (approve-then-pay, no client-confirm, no public admin register).

**Tests:** N/A.

**Dependencies:** Audit accepted.

**Completion criteria:** Rules and phases written; no silent guesses remain for V1 money/auth/booking.

**Status:** Done in this branch.

---

## Phase 1 — Security & Authentication (P0)

**Objective:** Production-grade access to the API.

**Features:** Password policy, bcrypt, email verification, phone OTP architecture, password reset, lockout, rate limits, session on JWT, suspended handling, demo-login flag, admin/agent not self-register.

**Database:** User verification/lockout columns; `AuthToken` table.

**API:** `/register` `/login` `/me` `/verify-email` `/forgot-password` `/reset-password` `/request-phone-otp` `/verify-phone`; admin invite agent.

**Frontend:** Keep AuthModal; show password rules; stop treating unverified users as fully live.

**Security:** Strip `passwordHash`; rate-limit auth; reject suspended; `ALLOW_DEMO_LOGIN`.

**Tests:** Password policy, lockout, publicUser, register role restriction.

**Dependencies:** Phase 0.

**Completion criteria:** Unauthenticated and wrong-role callers are rejected; hashes never leave the API.

---

## Phase 2 — Database Migration (P0)

**Objective:** Replace the JSON document with a relational schema.

**Features:** Prisma models, migration, import from `shelfy_store` / seed, mutex writes.

**Database:** See schema in `prisma/schema.prisma` (users, profiles, shops, shelves, bookings, payments, ledger, tokens, etc.).

**API:** Health reports `driver: prisma` when `DATABASE_URL` is set.

**Frontend:** No change (same JSON shapes).

**Security:** Unique email, FKs, no client-writable money fields.

**Tests:** Mapper + seed import (integration when `DATABASE_URL` present).

**Dependencies:** Phase 1 types.

**Completion criteria:** Production path does not read/write `shelfy_store` JSONB after import.

---

## Phase 3 — Marketplace & Listings (P1)

**Objective:** Host listing wizard + only verified/published shelves publicly.

**Features:** Draft→published listing flow, categories, locations, shop/shelf images.

**Database:** Listing/verification statuses, slugs, image tables.

**API:** Shop/shelf PATCH, submit-for-review, public filter.

**Frontend:** Wizard; keep existing cards.

**Security:** Host owns shop/shelf; public read is published-only.

**Tests:** Unpublished shelf hidden; host cannot edit another host.

**Dependencies:** Phase 2.

---

## Phase 4 — Booking Engine (P0 + P1 completion)

**Objective:** The rental transaction is internally consistent.

**Features (P0):** State machine, overlap, pricing/commission, history, approve-then-pay.  
**Features (P1):** Cancellation/refund execution, expiration job.

**Database:** `Booking`, `BookingStatusHistory`.

**API:** Create, list (scoped), transition, availability.

**Frontend:** Existing booking UI; show fee breakdown.

**Security:** Vendor/host ownership; no arbitrary status.

**Tests:** Transitions, overlap, commission.

**Dependencies:** Phases 1–2.

---

## Phase 5 — Real Payments (P0)

**Objective:** Money in is verified server-side.

**Features:** Payment + attempts, PesaPal Auth/IPN/SubmitOrder/GetTransactionStatus, idempotency, sandbox HMAC, admin reconcile.

**Database:** `Payment`, `PaymentAttempt`.

**API:** `POST /payments/initiate-session`, `GET|POST /payments/pesapal/ipn`, `GET /payments/pesapal/callback`, `POST /payments/:id/sync`, `POST /payments/sandbox-complete` (signed).

**Frontend:** Modal initiates and **polls**; never posts “paid”.

**Security:** Amount/reference checks; no client-confirm routes.

**Tests:** Duplicate callback, amount mismatch, sandbox HMAC.

**Dependencies:** Phase 4.

---

## Phase 6 — Financial Ledger & Withdrawals (P0 ledger, P1 withdrawals)

**Objective:** Traceable money. No fake balance field.

**Features (P0):** Append-only ledger, host pending/available computed.  
**Features (P1):** Withdrawal request, admin payout, failure reversal.

**Database:** `LedgerAccount`, `LedgerEntry`, `Withdrawal`, `Payout`, `Commission`.

**API (P0):** `GET /finance/summary`.  
**API (P1):** withdrawal + admin payout queue.

**Frontend:** Host earnings from API, not hardcoded.

**Security:** Backend-only posts; idempotency keys.

**Tests:** Split 100k → 10k/90k; no double post; cannot withdraw pending.

**Dependencies:** Phase 5.

---

## Phase 7 — Verification & Trust (P1)

**Objective:** Admin can verify users, shops, shelves from a queue.

**Features:** VerificationRequest, statuses, reject reasons.

**Database:** `VerificationRequest`.

**API:** Admin queue + decide.

**Frontend:** Admin verification tab (extend existing).

**Security:** Admin only.

**Tests:** Rejected shelf not public.

---

## Phase 8 — Field Operations (P1)

**Objective:** Agents do real assigned work at real coordinates.

**Features:** Visit assign, check-in, GPS vs shop lat/lng, photos, stock report.

**Database:** `FieldVisit`, `FieldReport`, photos.

**API:** Admin assign; agent submit.

**Frontend:** Keep Agent dashboard; remove hardcoded Dar GPS.

**Security:** Agent sees assigned visits only.

**Tests:** Wrong shop GPS rejected; agent cannot read vendor payments.

---

## Phase 9 — Notifications & Communication (P1/P2)

**Objective:** One event bus; authorized messaging.

**Features (P0/P1):** In-app events for booking/payment. Message ACL.  
**P2:** Email provider, conversation attachments.

**Database:** `Notification`, `NotificationPreference`, `Conversation`, `Message`.

**API:** Existing notify + locked `POST /messages`.

**Tests:** Unauthorized message rejected.

---

## Phase 10 — Testing & QA (P0 starts, ongoing)

**Objective:** Critical journeys have automated tests.

**P0 tests:** Auth, RBAC, booking machine, overlap, commission, ledger, payment idempotency, publicUser, message ACL.

**Later:** E2E Playwright for register→book→pay (sandbox).

**Completion criteria:** `npm test` green in CI.

---

## Phase 11 — Analytics & Reporting (P2)

**Objective:** Dashboards use real aggregates (GMV, commission, occupancy). Remove hardcoded admin GMV.

---

## Phase 12 — PWA / Mobile (P2)

**Objective:** Manifest, service worker, agent-first mobile UX. Same APIs for future native apps.

---

## Phase 13 — Production Deployment

**Objective:** Secrets, backups, logs, monitoring, `JWT_SECRET`, PesaPal keys, `APP_URL`, migrate-on-release.

**Do not claim launch-ready until Phase 14 passes.**

---

## Phase 14 — Final Launch Audit

Re-run the quality gate in the original instruction: business E2E, security, money, finance reconcile, trust, ops, UX, data, tests, production hygiene.

---

## Priority execution order

### P0 (this branch)

1. Security · 2. Authentication · 3. Authorization · 4. Relational DB · 5. Booking integrity · 6. Payment architecture · 7. Ledger · 8. Tests

### P1 (this branch, in progress)

Verification, shop/shelf management, uploads, cancel/complete, withdrawals/payouts, notifications, field ops, admin ops.

Shipped in this branch: published-only catalogue, verification queue, cancellation/refund ledger, expiration job, withdrawals/payouts, GPS check-in, image upload constraints, legal placeholders, listing wizard, payment reconcile job, reviews/disputes.

Still open: S3, email/SMS, live PesaPal keys.

### P2

Reviews, disputes, analytics, messaging+, PWA, SEO, reporting

### P3

Advanced AI, logistics, consignment, native apps

---

## After each phase

1. Implement  
2. Run tests  
3. Inspect logs  
4. Manual smoke  
5. Security review  
6. UX review  
7. Fix  
8. Confirm acceptance  
9. Update checklist  
10. Continue  

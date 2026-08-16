# SHELFY V1 — BUSINESS RULES

These rules are the source of truth for implementation. They are the safest practical V1 decisions for a **shelf-space rental marketplace** in Tanzania. They are not legal advice. Policy pages must stay marked for professional legal review.

**Product:** Shelfy is a retail shelf-space marketplace. Vendors rent physical shelf/display space inside existing shops. Hosts monetize unused retail space. Shelfy facilitates discovery, booking, payment, trust, and payouts.

**V1 is not:** a POS, a full e-commerce marketplace, a consignment platform, or a logistics company.

---

## 1. Shelf rental

| Rule | V1 decision |
| --- | --- |
| What is sold | Time-boxed **right to occupy** a specific shelf/display, not the products on it |
| Who provides space | The host (shop owner/operator) |
| Who occupies space | The vendor |
| Who is the merchant of record for products | The vendor |
| Shelfy role | Marketplace, payment collection, commission, verification, operations |
| Currency | TZS |
| Pricing unit | Monthly shelf rent, multiplied by whole months (minimum 1) |
| Commission | Platform setting `commissionPercentage` (default **10%**), taken from the vendor payment |
| Split | `platformFee = round(totalRent * rate)` · `hostShare = totalRent - platformFee` |

---

## 2. Product ownership

- The vendor owns products placed on a rented shelf.
- The host does not take title by hosting.
- Shelfy never becomes the seller of vendor products in V1.
- Inventory records are **operational**, not proof of title.

---

## 3. Restocking

- The vendor is responsible for restocking unless they purchase a separate Shelfy monitoring/restock service (future paid add-on).
- Field agents may inspect, photograph, and report stock. They do **not** automatically own restock responsibility.
- Low-stock alerts are informational.

---

## 4. Damage, theft, expiry

Do **not** hardcode liability into application logic.

V1 stores configurable policy text in `PlatformSetting` keys:

- `policy.damage`
- `policy.theft`
- `policy.expiry`
- `policy.shelfRentalTerms`

The app can display these texts and attach them to bookings. Disputes are the operational path when something goes wrong. Financial adjustments happen only through the ledger after an admin decision.

Placeholder legal copy must be marked `LEGAL_REVIEW_REQUIRED`.

---

## 5. Booking sequencing (approve, then pay)

V1 **does not collect payment before host approval** when approval is required.

```text
Vendor creates booking
        ↓
PENDING_APPROVAL          (if autoApproveBookings = false)
        ↓
Host APPROVED  or  REJECTED
        ↓
PAYMENT_PENDING
        ↓
Vendor starts checkout (server creates Payment + PaymentAttempt)
        ↓
PesaPal (or signed sandbox completion)
        ↓
Server verifies via GetTransactionStatus / signed sandbox
        ↓
PAID → ACTIVE
```

If `autoApproveBookings = true` (demo/default today), the booking is created as `PAYMENT_PENDING` and skips host approval. This is a **platform setting**, not a hidden assumption.

**Host cannot reject after payment.** After `PAID` / `ACTIVE`, rejection is not a legal transition. Cancellation and disputes are the only exits.

If a future phase ever takes payment first, refund + ledger reversal is mandatory before any status other than `PAID`/`ACTIVE`/`DISPUTED`.

---

## 6. Booking state machine

Allowed statuses:

`DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `PAYMENT_PENDING` → `PAID` → `ACTIVE` → `EXPIRING` → `COMPLETED`

Alternates:

- `PENDING_APPROVAL` → `REJECTED` | `CANCELLED`
- `APPROVED` → `PAYMENT_PENDING` | `CANCELLED`
- `PAYMENT_PENDING` → `PAYMENT_FAILED` | `CANCELLED`
- `PAYMENT_FAILED` → `PAYMENT_PENDING` | `CANCELLED`
- `PAID` → `ACTIVE` | `CANCELLED` (full refund path)
- `ACTIVE` → `CANCELLED` | `DISPUTED` | `EXPIRING` | `COMPLETED`
- `EXPIRING` → `COMPLETED` | `DISPUTED` | `CANCELLED`
- `DISPUTED` → `ACTIVE` | `COMPLETED` | `CANCELLED` (admin only)

Who may trigger:

| Transition | Vendor | Host | Admin | System |
| --- | --- | --- | --- | --- |
| Create → PENDING_APPROVAL / PAYMENT_PENDING | own | — | yes | — |
| Approve / Reject | — | own booking | yes | — |
| Start payment | own | — | yes | — |
| Mark PAID / ACTIVE | — | — | reconcile only | payment verifier |
| Cancel before pay | own | own (pre-pay) | yes | — |
| Cancel after ACTIVE | own (policy) | own (policy) | yes | — |
| Expire / Complete | — | — | yes | cron |
| Dispute | party | party | yes | — |

Every transition is logged in `BookingStatusHistory`. Arbitrary status writes are rejected.

---

## 7. Cancellation and refunds

| When | Who | Vendor refund | Host compensation | Commission |
| --- | --- | --- | --- | --- |
| Before payment (`PENDING_APPROVAL`, `APPROVED`, `PAYMENT_PENDING`, `PAYMENT_FAILED`) | Vendor, host, or admin | None (nothing captured) | None | None |
| After payment, before `ACTIVE` (`PAID` only) | Vendor or admin | **100%** of captured amount | None | Reversed |
| `ACTIVE` / `EXPIRING`, **≥ 7 days** before `startDate` | Vendor | **90%** | **0%** of rent (booking unused) | Shelfy keeps **10% cancellation fee** (of total rent) |
| `ACTIVE` / `EXPIRING`, **< 7 days** before `startDate` or after start | Vendor | **0%** | Host keeps remaining payable | Commission stays earned |
| Host cancels after payment | Host or admin | **100%** | Host payable reversed; host may be flagged | Reversed |
| Admin goodwill / dispute | Admin | Per decision | Per decision | Adjustment entry |

Cancellation fee and refund percentages are `PlatformSetting` values (`cancellation.feePercent`, `cancellation.freeCancelDays`) so they are not hardcoded forever. Defaults: fee 10%, free-cancel window 7 days.

---

## 8. Booking expiration

| Item | V1 decision |
| --- | --- |
| End | `endDate` at 23:59:59 Africa/Dar_es_Salaam |
| Expiring window | 7 days before `endDate` → status `EXPIRING` |
| Grace period | 24 hours after `endDate` before auto-`COMPLETED` |
| Notifications | 7 days before, 1 day before, on expire, on complete |
| Availability | Shelf returns to `AVAILABLE` when no overlapping blocking booking remains |
| Blocking statuses | `PENDING_APPROVAL`, `APPROVED`, `PAYMENT_PENDING`, `PAID`, `ACTIVE`, `EXPIRING`, `DISPUTED` |

---

## 9. Double booking

A shelf cannot have two bookings whose date ranges overlap if either booking is in a blocking status.

Overlap is inclusive of `startDate` and exclusive of the day after `endDate` (`startA < endB && startB < endA`).

Enforced in the booking service **and** by a transactional check. Frontend calendar is informational only.

---

## 10. Payments (PesaPal)

Official v3 flow only:

1. Backend creates `Payment` + `PaymentAttempt` with a unique merchant reference.
2. If credentials exist: OAuth token → RegisterIPN (once, cached) → `SubmitOrderRequest` with `notification_id`.
3. Customer pays on PesaPal.
4. IPN/callback arrives **without trusted status**.
5. Backend calls `GetTransactionStatus` with `orderTrackingId`.
6. Status codes: `0 INVALID` · `1 COMPLETED` · `2 FAILED` · `3 REVERSED`.
7. Amount, currency, and merchant reference must match. Then ledger + booking update.

**Forbidden:** frontend telling the backend that payment succeeded.

Without PesaPal keys:

- Checkout still creates a real `PENDING` payment.
- Completion is only allowed via:
  - HMAC-signed sandbox endpoint (`PESAPAL_SANDBOX_KEY`), or
  - Admin reconcile action (audit-logged).
- Production without keys must **not** auto-complete because a vendor is logged in.

---

## 11. Financial ledger

There is no mutable `user.balance` field that APIs increment.

Accounts (per owner):

| Account | Owner | Meaning |
| --- | --- | --- |
| `PLATFORM_CLEARING` | platform | Inbound vendor payments |
| `PLATFORM_COMMISSION` | platform | Earned fees |
| `PLATFORM_CANCELLATION_FEE` | platform | Cancellation fees |
| `HOST_PENDING` | host | Earned but not yet withdrawable |
| `HOST_AVAILABLE` | host | Withdrawable |
| `HOST_WITHDRAWAL_HOLD` | host | Reserved for a withdrawal in flight |
| `VENDOR_REFUND` | vendor | Refund liability / payout |

On payment `COMPLETED` and booking → `ACTIVE`:

```text
VENDOR payment TZS 100,000
  DR PLATFORM_CLEARING        100,000
  CR PLATFORM_COMMISSION       10,000
  CR HOST_PENDING              90,000
```

On booking `COMPLETED` (after grace):

```text
  DR HOST_PENDING              90,000
  CR HOST_AVAILABLE            90,000
```

On withdrawal request:

```text
  DR HOST_AVAILABLE            amount
  CR HOST_WITHDRAWAL_HOLD      amount
```

On payout success:

```text
  DR HOST_WITHDRAWAL_HOLD      amount
  CR PLATFORM_CLEARING         amount   (cash out)
```

On payout failure: reverse the hold back to `HOST_AVAILABLE`.

Every movement has `idempotencyKey`. Duplicate callbacks do not double-post.

**Available balance** = sum of `HOST_AVAILABLE` credits − debits.  
**Pending balance** = `HOST_PENDING`.  
Hosts cannot withdraw pending, held, or disputed amounts.

---

## 12. Withdrawals and payouts

| Item | V1 decision |
| --- | --- |
| Minimum withdrawal | TZS **20,000** (`payout.minWithdrawalTzs`) |
| Who requests | Host, own available balance only |
| Statuses | `PENDING` → `APPROVED` → `PROCESSING` → `COMPLETED` \| `FAILED` \| `REJECTED` |
| Admin | Must approve, then process, then enter payout reference |
| Failed payout | Hold released back to available; withdrawal marked `FAILED` |
| Duplicate request | Rejected while another withdrawal is `PENDING`/`APPROVED`/`PROCESSING` |

---

## 13. Verification and trust (V1 policy; queue is P1)

Statuses: `UNVERIFIED` / `PENDING` / `UNDER_REVIEW` / `VERIFIED` / `REJECTED` / `SUSPENDED`.

Public marketplace should list only **verified + published** shops/shelves. P0 keeps existing listings working and adds the status fields; P1 enforces the public filter and admin queue.

---

## 14. Messaging

Vendor and host may message only when they share a booking in:

`PENDING_APPROVAL`, `APPROVED`, `PAYMENT_PENDING`, `PAID`, `ACTIVE`, `EXPIRING`, `DISPUTED`, `COMPLETED` (completed allowed for 30 days).

Admin may access a conversation for moderation. Agents cannot read financial data or arbitrary messages.

---

## 15. Reviews

One vendor→host and one host→vendor review per **completed** booking. No arbitrary reviews. Moderation is P2.

---

## 16. Authentication

| Item | V1 decision |
| --- | --- |
| Self-register | Vendor and Host only |
| Admin | Seed / existing admin invite only — never public register |
| Field agent | Admin-created invite only |
| New account status | `PENDING` until email verified; then `ACTIVE` |
| Seed/demo users | Pre-verified `ACTIVE` |
| Password | Min 10 chars, upper, lower, digit, special |
| Hash | bcrypt cost 10+ |
| Email verify | Token (24h), hashed at rest |
| Phone verify | Architecture + OTP store; SMS provider wired later |
| Password reset | Token (1h), hashed at rest, single use |
| Lockout | 5 failed logins → 15 minute lock |
| Rate limit | Auth and payment routes |
| Demo login | Disabled in production unless `ALLOW_DEMO_LOGIN=true` |
| Sessions | JWT, 7 days; revoked on password reset / suspend |

---

## 17. Authorization

Every protected endpoint checks, in order:

1. Authenticated
2. Account `ACTIVE` (or `PENDING` only for verify/logout/me)
3. Role
4. Resource ownership
5. Business relationship (e.g. booking counterparty)

Admin has platform-wide access but still cannot skip payment verification or invent ledger balances without an adjustment entry.

---

## 18. Open items deferred (not silently guessed)

| Topic | Deferral |
| --- | --- |
| VAT / TRA invoicing | P3 + accountant |
| Insurance for theft | Partner, not V1 |
| Consignment / sell-through | Explicitly out of V1 |
| Native apps | Same APIs later |
| SMS provider | Architecture only in P0 |

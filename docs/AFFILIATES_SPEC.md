# Shelfy — Affiliates & referrals (future product)

**Status:** Not implemented. No Prisma models, APIs, or UI exist today. Use this document if product decides to add a referral program.

## Goals

- Reward individuals or partners who bring **new vendors** or **new hosts** to Shelfy.
- Keep attribution auditable and payouts aligned with the **finance ledger** (same patterns as host withdrawals).
- Avoid exposing private user data to affiliates beyond their own referrals.

## Non-goals (V1 affiliate)

- Multi-level marketing (MLM) beyond one tier.
- Commission on every booking forever (unless explicitly configured as recurring — default is first paid booking or first listing fee only).

## Proposed roles

| Actor | Capability |
| --- | --- |
| **Affiliate** | Optional flag on `User` or separate `Affiliate` record; unique referral code/link. |
| **ADMIN** | Approve affiliates, set commission rules, view reports, mark payouts. |
| **VENDOR / HOST** | Sign up with optional `?ref=CODE`; no affiliate dashboard unless also an affiliate. |

## Data model (sketch)

```
Affiliate          — userId, status (PENDING|ACTIVE|SUSPENDED), defaultRateBps, createdAt
ReferralCode       — affiliateId, code (unique), channel label, expiresAt?
ReferralAttribution — codeId, referredUserId, roleAtSignup, attributedAt
CommissionRule     — appliesTo (VENDOR_FIRST_PAYMENT|HOST_FIRST_BOOKING), rateBps, capTzs?
Commission         — affiliateId, sourcePaymentId?, amountTzs, status, ledgerEntryId?
AffiliatePayout    — batch or per-commission; mirrors Withdrawal workflow
```

**Attribution window:** e.g. 30 days from first click or from signup with `ref` cookie/localStorage (server stores attribution at register only — do not trust client after signup).

## User journeys

1. Admin enables program + sets default rate (e.g. 2% of first paid booking GMV, max TZS 50,000).
2. Affiliate shares `https://shelfy.co.tz/?ref=ABC123` or signup link with query param.
3. New vendor registers with code → `ReferralAttribution` row.
4. When referred vendor’s **first** booking payment succeeds (server-verified Azam Pay), create `Commission` in `PENDING`.
5. After hold period (e.g. 14 days, no dispute), commission moves to `AVAILABLE`; affiliate requests payout (mobile money) or admin batches monthly.

## APIs (future)

- `GET /api/affiliate/me` — stats, code, pending/available balance.
- `POST /api/admin/affiliates` — invite/activate.
- `PUT /api/admin/affiliate-rules` — global defaults.
- `GET /api/admin/affiliates/report` — CSV export.

## UI (future)

- **ADMIN → Settings or Affiliates tab:** rules, approve affiliates, commission queue.
- **User → Account settings → Affiliates** (if active): copy link, earnings, payout phone.

## Security & compliance

- Rate-limit referral code validation; no enumeration of valid codes via public API.
- Commissions created only from **trusted payment webhooks**, never from frontend.
- Tanzania tax / withholding: product/legal review before live payouts.

## Relation to current platform

- Host **withdrawals** and **admin payouts** already exist — affiliate payouts should reuse ledger + admin payout queue patterns.
- See [ROLE_FEATURES.md](./ROLE_FEATURES.md) — affiliates marked **Missing** for all roles until this spec is implemented.

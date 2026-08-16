# SHELFY — PHASE 14 LAUNCH AUDIT

Date: 2026-08-16  
Branch: `cursor/p0-marketplace-foundation-b9de`  
**Verdict: not launch-ready.** Core marketplace money and listing paths are implemented and tested. Live payment credentials and a stable signing secret are still Railway operations.

This is a code-and-rules audit, not a legal, tax, or PesaPal go-live review.

---

## Blockers (must be done outside this repo)

| Item | Why it blocks |
| --- | --- |
| Stable `JWT_SECRET` on Railway | Without it, health reports `jwt.ephemeral: true` and sessions die on deploy. |
| Live PesaPal consumer key/secret + `PESAPAL_ENVIRONMENT=live` | Checkout cannot take real money. Sandbox/signed complete is for staging only. |
| `APP_URL` set to the public HTTPS origin | Callbacks, CORS in production, and email links depend on it. |
| Counsel review of `/legal/*` | Copy is marked `LEGAL_REVIEW_REQUIRED`. |

---

## Passed in this branch

| Gate | Evidence |
| --- | --- |
| Product model | V1 is shelf-space rental only (`docs/BUSINESS_RULES.md`) |
| Auth | Password policy, lockout, email/phone token architecture, demo login gated, admin/agent not self-register |
| Sessions | Access JWT 1h, hashed refresh 7d, rotate, logout / reset / suspend revoke refresh |
| RBAC / IDOR | Booking, payment, message, listing ownership tests |
| Public catalogue | Unpublished and archived listings hidden |
| Booking machine | Approve-then-pay; illegal jumps rejected |
| Payments | Client-confirm routes 410; PesaPal v3 + IPN + reconcile job |
| Ledger | Capture, release, refund, withdrawal hold/payout/fail; postings balanced in tests |
| Withdrawals | Available only, min TZS 20,000, one in-flight |
| Field ops | 250m GPS check-in; reports require check-in |
| Uploads | JPEG/PNG/WebP ≤2.5MB; filename sanitised; optional S3 |
| Ops | Health flags (always 200), JSON request logs, [RUNBOOK.md](./RUNBOOK.md) |
| Tests | Vitest domain suites P0–P14; `tsc --noEmit` |

---

## Remaining product/QA gaps (not Railway secrets)

- Browser E2E (Playwright) for login → book → pay sandbox → complete is not in CI.
- Postgres integration test runs only when `DATABASE_URL` is reachable; it skips otherwise.
- SMTP is detected in health but not a live mail transport (Resend is the wired sender).
- No full APM; monitoring is JSON logs + health flags.
- Legal pages are placeholders.

---

## Security notes from this pass

Fixed in this slice:

- `publicUser()` no longer returns `failedLoginCount` or `lockedUntil`
- Password reset and admin suspend revoke unused refresh tokens
- Admin user status must be `ACTIVE` / `PENDING` / `SUSPENDED`
- `trust proxy` for Railway rate limits
- Security headers (`nosniff`, `DENY` framing, referrer, permissions)
- Production CORS uses `APP_URL` when set (still open if `APP_URL` is missing so boot does not fail)
- Upload filenames cannot traverse directories

Still accepted for V1:

- Access JWTs already issued remain valid until expiry (no server denylist)
- JWT stored in `localStorage` (XSS remains an app-shell risk; CSP not locked down so the SPA can load)

---

## Do not claim

Do not tell hosts or vendors that Shelfy is live for paid shelf rentals until the blockers table is green and a sandbox-to-live PesaPal rehearsal has succeeded against Railway Postgres.

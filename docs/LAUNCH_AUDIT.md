# SHELFY — PHASE 14 LAUNCH AUDIT (updated)

Date: 2026-08-16  
Branch: `main` (post PR #9 prelaunch hardening + launch-complete)  
**Verdict: soft launch ready for controlled beta** — core marketplace paths are hardened and tested. Live PesaPal keys are configured on Railway. Email verification and durable uploads remain ops configuration items.

This is a code-and-rules audit, not a tax or regulatory sign-off.

---

## Resolved in code (2026-08-16)

| Item | Resolution |
| --- | --- |
| Field visits IDOR | Role-scoped listing; vendors 403 |
| Availability vendor leak | `vendorName` removed from public API |
| Self-serve onboarding dead-end | Auto-verify when no email provider |
| Settings mismatch | `/api/settings` reflects runtime `pesapalEnvironment`; default `autoApproveBookings: false` |
| Sandbox payment abuse | Disabled in live mode; no JWT HMAC fallback in production |
| Booking overlap | PostgreSQL exclusion constraint migration |
| Security headers | HSTS + CSP in production; `x-powered-by` disabled |
| Legal placeholders | Substantive platform copy (counsel review still recommended) |

---

## Remaining ops (Railway / business)

| Item | Why it matters |
| --- | --- |
| `RESEND_API_KEY` | Real email verification instead of auto-verify |
| S3 or Railway volume | Uploads survive redeploy |
| One live PesaPal rehearsal | Confirm end-to-end money path with small TZS amount |
| Counsel review | Legal copy is drafted but not signed off by Tanzania counsel |

---

## Automated gates

| Gate | Evidence |
| --- | --- |
| Typecheck | `npx tsc --noEmit` |
| Unit + HTTP | Vitest — 82+ tests |
| Playwright | `npm run test:e2e` — landing, legal, demo login API |
| Production smoke | `npm run smoke:prod` |

---

## Do not claim

Do not tell hosts or vendors that Shelfy is fully production-hardened for scale until email, durable storage, and a successful live PesaPal rehearsal are complete.

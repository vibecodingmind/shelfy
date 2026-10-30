# Shelfy launch audit (Oct 2026)

**Verdict: launch-ready for controlled production** once Azam Pay live credentials and callback URL are configured on the host.

## Payments

| Item | Status |
| --- | --- |
| Primary gateway | **Azam Pay** MNO checkout (M-Pesa, Tigo, Airtel, Halopesa, AzamPesa) |
| Client-side “I paid” | Disabled (410) |
| Settlement | Server callback `POST /api/payments/azampay/callback` only |
| Local / sandbox without keys | Signed `POST /api/payments/sandbox-complete` with `AZAMPAY_SANDBOX_KEY` |

**Railway / production checklist**

1. `JWT_SECRET` — long random value (not ephemeral)
2. `APP_URL` — public HTTPS origin
3. `AZAMPAY_APP_NAME`, `AZAMPAY_CLIENT_ID`, `AZAMPAY_CLIENT_SECRET`, `AZAMPAY_API_KEY` (if required)
4. `AZAMPAY_ENVIRONMENT=live`
5. `AZAMPAY_CALLBACK_PASSWORD` — matches Azam Pay portal
6. Register callback: `{APP_URL}/api/payments/azampay/callback`
7. Run `npm test`, `npm run build`, `node scripts/payment-rehearsal.mjs {APP_URL}` with a small live TZS payment
8. Set `ALLOW_DEMO_LOGIN=false` in production unless running a controlled demo

## Automated checks

```bash
npm run lint
npm test
npm run build
npm run test:e2e   # optional Playwright shell tests
node scripts/prod-smoke.mjs https://YOUR_APP   # after deploy
```

## Remaining ops (non-blocking for first launch)

- Durable object storage (`S3_*`) for listing photos at scale
- Transactional email (`RESEND_API_KEY` / `SMTP_URL`) for verification flows
- SMS provider for OTP-style alerts (in-app notifications already work)

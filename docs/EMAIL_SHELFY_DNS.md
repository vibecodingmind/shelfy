# Email for shelfy.co.tz (hello@shelfy.co.tz)

Shelfy on the VPS sends and receives mail for **shelfy.co.tz** only. Christian Radios on the same host uses **christianradios.online** — separate domains, DNS zones, Postfix virtual domains, and mailboxes. Do not point shelfy.co.tz MX at christianradios.online or share SMTP credentials between apps.

## 1. DNS (shelfy.co.tz zone only)

| Record | Purpose |
| --- | --- |
| **MX** | Points inbound mail to your VPS (or provider), e.g. `10 mail.shelfy.co.tz` or `10 YOUR_VPS_IP` per your Postfix setup |
| **A** for `mail.shelfy.co.tz` | If you use a mail hostname, points to the VPS public IP |
| **TXT (SPF)** | One SPF record per domain, e.g. `v=spf1 mx a ip4:YOUR_VPS_IP ~all` |
| **TXT (DKIM)** | From OpenDKIM / your mail stack for `shelfy.co.tz` |
| **TXT (DMARC)** | Optional: `_dmarc.shelfy.co.tz` → `v=DMARC1; p=none; rua=mailto:hello@shelfy.co.tz` |

Test inbound: send from Gmail to **hello@shelfy.co.tz** and confirm delivery to the mailbox on the VPS.

## 2. Postfix on the VPS (high level)

These steps assume Ubuntu/Debian alongside an existing mail stack for other domains — add **shelfy.co.tz** as an additional virtual domain, not a replacement.

1. **Virtual domain** — In Postfix (`/etc/postfix/main.cf` or included files), register `shelfy.co.tz` in `virtual_mailbox_domains` and map mailboxes (e.g. `hello@shelfy.co.tz`) via `virtual_mailbox_maps` / Dovecot (same pattern as other vhosts on the host).
2. **TLS** — Use the existing Let's Encrypt cert or issue one that covers `mail.shelfy.co.tz` if used for SMTP/IMAP.
3. **Submission (587)** — Allow authenticated submission for the app user (e.g. `noreply@shelfy.co.tz` or a dedicated `shelfy-app` SASL account) scoped to send as `@shelfy.co.tz`.
4. **OpenDKIM** — Sign outbound mail for `shelfy.co.tz`; publish the public key in DNS.
5. **Firewall** — Open 25/587/993 (or your chosen ports) only as needed; Shelfy Node app talks to `127.0.0.1:587` locally when Postfix listens on localhost.

**Isolation from christianradios.online:** separate `virtual_mailbox_maps` entries, separate DKIM selector/domain keys, separate app `.env` files. Shelfy never uses Christian Radios `SMTP_*` or `RESEND_*` values.

## 3. Shelfy app — send via SMTP (production on VPS)

Shelfy sends through **SMTP** when `SMTP_URL` or `SMTP_HOST` is set ([`notify.ts`](../src/server/services/notify.ts), [`smtp.ts`](../src/server/services/smtp.ts)). **Do not set `RESEND_API_KEY` on the VPS** if you want self-hosted mail only; SMTP takes precedence when both are present.

Example `/var/www/shelfy/.env`:

```env
# Self-hosted Postfix on same VPS (preferred)
SMTP_HOST=127.0.0.1
SMTP_PORT=587
SMTP_USER=shelfy-app
SMTP_PASS=your_mailbox_or_sasl_password
SMTP_SECURE=false
EMAIL_FROM="Shelfy <noreply@shelfy.co.tz>"
EMAIL_REPLY_TO="hello@shelfy.co.tz"
```

Alternative single URL:

```env
SMTP_URL=smtp://shelfy-app:YOUR_PASSWORD@127.0.0.1:587
EMAIL_FROM="Shelfy <hello@shelfy.co.tz>"
```

Restart: `sudo systemctl restart shelfy`

Register a test user; confirm verification email arrives and Reply-To reaches **hello@shelfy.co.tz**.

## 4. Optional — Resend (non-VPS / Railway)

If you deploy on Railway without local Postfix, you may use [Resend](https://resend.com) instead: verify `shelfy.co.tz`, set `RESEND_API_KEY`, leave `SMTP_HOST` unset. Merge SPF with your inbox provider if you also receive mail elsewhere.

## Health check

`GET https://shelfy.co.tz/api/health` should report email configured with provider `smtp` (not skipped).

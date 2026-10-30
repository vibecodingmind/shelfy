# Email for shelfy.co.tz (hello@shelfy.co.tz)

Two separate setups on the **same domain** — do not change Christian Radios DNS.

## 1. Inbox — receive mail at hello@shelfy.co.tz

Use a mailbox provider (Zoho Mail, Google Workspace, cPanel mail, etc.):

1. Create mailbox **hello@shelfy.co.tz** (and aliases if needed).
2. At the **shelfy.co.tz** DNS zone only, add provider **MX** records.
3. Add provider **DKIM** (and their SPF guidance).

Test: send from Gmail to hello@shelfy.co.tz and reply.

## 2. App — transactional send (Shelfy on VPS)

Shelfy sends via **Resend** when `RESEND_API_KEY` is set ([`notify.ts`](../src/server/services/notify.ts)).

1. [Resend](https://resend.com) → **Domains** → add `shelfy.co.tz`.
2. Add Resend **DKIM** TXT records to shelfy.co.tz DNS.
3. **SPF:** you may only have **one** SPF TXT record per domain. Merge inbox + Resend, e.g.  
   `v=spf1 include:zoho.com include:amazonses.com ~all` (replace `zoho.com` with your inbox provider’s include).
4. On VPS in `/var/www/shelfy/.env`:

```env
RESEND_API_KEY=re_...
EMAIL_FROM="Shelfy <hello@shelfy.co.tz>"
```

5. Restart: `sudo systemctl restart shelfy`
6. Register a test user; confirm verification email arrives.

**Optional DMARC:** `_dmarc.shelfy.co.tz` TXT `v=DMARC1; p=none; rua=mailto:hello@shelfy.co.tz`

## Health check

`GET https://shelfy.co.tz/api/health` should report email provider configured (not skipped).

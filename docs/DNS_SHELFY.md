# DNS for shelfy.co.tz (VPS at 74.208.197.99)

Point **only** the shelfy.co.tz zone — do not edit christianradios.online records.

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `74.208.197.99` | 300–3600 |
| A | `www` | `74.208.197.99` | 300–3600 |

After propagation (often 5–60 minutes):

```bash
dig +short shelfy.co.tz A
curl -sI https://shelfy.co.tz/api/health
```

Caddy on the VPS will obtain TLS automatically once DNS points here and the site block from [`scripts/vps/Caddyfile.shelfy.snippet`](../scripts/vps/Caddyfile.shelfy.snippet) is loaded.

Email records (MX, SPF, DKIM for inbox + Resend): [EMAIL_SHELFY_DNS.md](./EMAIL_SHELFY_DNS.md).

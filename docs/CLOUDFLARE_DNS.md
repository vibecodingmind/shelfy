# shelfy.co.tz — Cloudflare DNS (recommended)

**VPS IP:** `74.208.197.99`

1. Add the site in Cloudflare (Free plan).
2. At **Route Africa**, set nameservers to Cloudflare’s pair (e.g. `matteo.ns.cloudflare.com`, `penny.ns.cloudflare.com`).
3. In **Cloudflare → DNS**, use **DNS only** (grey cloud) for website and mail at launch:

| Type | Name | Content | Notes |
| --- | --- | --- | --- |
| A | `@` | `74.208.197.99` | Grey cloud |
| CNAME | `www` | `shelfy.co.tz` | Grey cloud |
| A | `mail` | `74.208.197.99` | Grey cloud |
| MX | `@` | `mail.shelfy.co.tz` | Priority 10 |
| TXT | `@` | `v=spf1 mx a ip4:74.208.197.99 ~all` | |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@shelfy.co.tz` | Optional |

4. Wait for `.tz` delegation to Cloudflare (often 15 minutes–24 hours).

Verify:

```bash
dig +short @8.8.8.8 shelfy.co.tz A
curl -sS https://shelfy.co.tz/api/health
```

HTTPS is terminated on the VPS by Caddy (Christian Radios Docker stack → `host.docker.internal:3002`).

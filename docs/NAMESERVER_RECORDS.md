# shelfy.co.tz — DNS records (after you point nameservers)

**VPS IP:** `74.208.197.99`

Add these at whichever DNS panel your nameservers use (Route Africa, Cloudflare, etc.). **Do not change christianradios.online** unless that domain uses the same panel—edit only the **shelfy.co.tz** zone.

| Type | Name / Host | Value | Notes |
| --- | --- | --- | --- |
| **A** | `@` | `74.208.197.99` | Website |
| **A** | `www` | `74.208.197.99` | Website |
| **A** | `mail` | `74.208.197.99` | Optional mail hostname |
| **MX** | `@` | `10 mail.shelfy.co.tz` | Inbound mail (or `10 shelfy.co.tz` if no mail subdomain) |
| **TXT** | `@` | `v=spf1 mx a ip4:74.208.197.99 ~all` | One SPF record only—merge if you add more |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@shelfy.co.tz` | Optional |

After DKIM is generated on the VPS (`/etc/opendkim/keys/shelfy.co.tz/`), add the **TXT** record shown in `default.txt` as `default._domainkey`.

Propagation: often 5–60 minutes. Then test:

```bash
curl -sI https://shelfy.co.tz/api/health
dig shelfy.co.tz A +short
```

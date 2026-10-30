# shelfy.co.tz — DNS records (after you point nameservers)

**VPS IP:** `74.208.197.99`

**Registrar:** `shelfy.co.tz` is registered with **Route Africa** (`REG-ROUTEAFRICA`). Nameservers and DNS records must match: records go in the panel that **hosts the zone** for the nameservers you set at Route Africa.

### Common mistake (broken DNS)

If nameservers are `dns1.registrar-servers.com` / `dns2.registrar-servers.com` (Namecheap-style DNS) but **shelfy.co.tz is not added in that provider’s DNS hosting**, the world sees **REFUSED** / **SERVFAIL** and no A record — even if you added records somewhere else (e.g. Route Africa).

**Fix (recommended for Route Africa domains):**

1. At **Route Africa** → **shelfy.co.tz** → set nameservers to Route Africa DNS (e.g. `ns1.radns.net`, `ns2.radns.net` — use exactly what your Route Africa panel shows).
2. In the **same Route Africa DNS / zone editor** for **shelfy.co.tz**, add the records in the table below.
3. Wait 5–60 minutes, then run `dig +short shelfy.co.tz A` — it must print `74.208.197.99`.

**Alternative:** Use **Cloudflare** (free): create a zone for `shelfy.co.tz`, add the records below, then set Cloudflare’s two nameservers at Route Africa.

Do **not** point **shelfy.co.tz** at Namecheap DNS unless the domain is actually hosted there with a live zone. **christianradios.online** may use Namecheap DNS; **shelfy.co.tz** is a separate zone.

Add these at whichever DNS panel your **current** nameservers use. **Do not change christianradios.online** unless that domain uses the same panel—edit only the **shelfy.co.tz** zone.

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

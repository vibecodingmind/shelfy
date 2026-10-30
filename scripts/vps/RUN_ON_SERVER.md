# One-time Shelfy deploy on your VPS (74.208.197.99)

Log in with **your** SSH user (the same account you use for Christian Radios). This machine has **no SSH private key**, so the agent cannot run these steps remotely until you add a key or run them yourself.

## 1. Clone and install (Postgres + app + systemd)

```bash
sudo apt-get update
sudo apt-get install -y git nodejs npm postgresql postgresql-contrib
# Prefer Node 20+ via NodeSource if stock node is old

export GIT_BRANCH=main
curl -fsSL https://raw.githubusercontent.com/vibecodingmind/shelfy/main/scripts/vps/install-shelfy.sh -o /tmp/install-shelfy.sh
bash /tmp/install-shelfy.sh
```

Copy the printed `DATABASE_URL` into `/var/www/shelfy/.env`, then add `GEMINI_API_KEY`, `RESEND_API_KEY`, and `AZAMPAY_*`.

```bash
sudo systemctl start shelfy
curl -s http://127.0.0.1:3002/api/health | jq .
```

## 2. Caddy (Christian Radios already uses Caddy)

```bash
sudo nano /etc/caddy/Caddyfile
# Paste contents of scripts/vps/Caddyfile.shelfy.snippet as a NEW block
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 3. DNS

See [docs/DNS_SHELFY.md](../../docs/DNS_SHELFY.md) — A records `@` and `www` → `74.208.197.99`.

## 4. Email

See [docs/EMAIL_SHELFY_DNS.md](../../docs/EMAIL_SHELFY_DNS.md).

## 5. Verify both sites

```bash
curl -s https://christianradios.online/api/health
curl -s https://shelfy.co.tz/api/health
```

Christian Radios must still return its existing health JSON; Shelfy should return Shelfy health with Postgres connected.

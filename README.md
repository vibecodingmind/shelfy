# Shelfy 🇹🇿

> The shelf space marketplace for Tanzania. Vendors rent shelf space from shop owners to display and sell their products — without the cost of opening a new branch.

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (credentials-based)
- **Payments**: PesaPal v3 (M-Pesa, Tigo Pesa, Airtel Money, Cards)
- **AI**: Anthropic Claude API (photo analysis, shelf matching, restock alerts)
- **Styling**: Tailwind CSS
- **Deployment**: PM2 + Nginx on VPS

## User Roles

| Role | Access |
|------|--------|
| Vendor | Browse shelves, book, pay, track sales |
| Host | List shelves, approve bookings, receive payouts |
| Admin | Full platform management |
| Field Agent | Submit shelf visit reports with AI photo analysis |

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone https://github.com/yourusername/shelfy.git
cd shelfy
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Set up database
npx prisma generate
npx prisma db push
npx prisma db seed

# 4. Run dev server
npm run dev
```

Open http://localhost:3000

**Demo accounts (after seeding):**
- Admin: `admin@shelfy.co.tz` / `admin123`
- Host: `juma@nakumatt.co.tz` / `shelfy123`
- Vendor: `amina@azamfoods.co.tz` / `shelfy123`
- Field Agent: `agent@shelfy.co.tz` / `shelfy123`

## Environment Variables

See `.env.example` for all required variables. Key ones:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://yourdomain.co.tz"
PESAPAL_CONSUMER_KEY="..."
PESAPAL_CONSUMER_SECRET="..."
ANTHROPIC_API_KEY="sk-ant-..."
```

## VPS Deployment

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Clone repo
git clone https://github.com/yourusername/shelfy.git /var/www/shelfy
cd /var/www/shelfy

# Run deploy script (installs Node, PM2, Nginx, PostgreSQL)
chmod +x deploy.sh
./deploy.sh
```

Then set up SSL:
```bash
sudo certbot --nginx -d yourdomain.co.tz -d www.yourdomain.co.tz
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial Shelfy platform"
git remote add origin https://github.com/yourusername/shelfy.git
git push -u origin main
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shelves` | List shelves (with filters) |
| POST | `/api/shelves` | Create shelf (host only) |
| GET | `/api/bookings` | List bookings (role-filtered) |
| POST | `/api/bookings` | Create booking (vendor only) |
| PATCH | `/api/bookings/[id]` | Approve/reject booking |
| POST | `/api/payments/checkout` | Initiate PesaPal payment |
| GET | `/api/payments/callback` | PesaPal payment callback |
| GET/POST | `/api/reports` | Field agent reports |
| POST | `/api/ai/match` | AI shelf matching |
| GET | `/api/admin/stats` | Admin platform stats |
| POST | `/api/auth/register` | Register new user |

## Add-on Services

- **Shelf Monitoring** (TZS 30,000/month): Weekly field agent visits + AI photo analysis
- **Logistics** (TZS 15,000/delivery): Bus terminal pickup + shelf delivery

## AI Features

1. **Photo Analysis** — Field agent uploads shelf photo → Claude Vision counts stock, detects condition, generates vendor report
2. **ShelfMatch** — AI recommends best shelves for a vendor's product type and budget
3. **Restock Alerts** — Predicts when shelf will empty and notifies vendor
4. **Vendor Insights** — Monthly AI summary of sales performance

## Support

Email: support@shelfy.co.tz  
WhatsApp: +255 712 000 000

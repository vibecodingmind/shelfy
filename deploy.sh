#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Shelfy — VPS Deployment Script
# Run this on your VPS after cloning the repo.
# Usage: chmod +x deploy.sh && ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
APP_DIR="/var/www/shelfy"
LOG_DIR="/var/log/shelfy"

echo "🚀 Deploying Shelfy..."

# 1. Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
fi

# 3. Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
  echo "📦 Installing PostgreSQL..."
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
  echo "✅ PostgreSQL installed. Create database manually:"
  echo "   sudo -u postgres psql -c \"CREATE USER shelfy WITH PASSWORD 'yourpassword';\""
  echo "   sudo -u postgres psql -c \"CREATE DATABASE shelfy OWNER shelfy;\""
fi

# 4. Install Nginx
if ! command -v nginx &> /dev/null; then
  echo "📦 Installing Nginx..."
  sudo apt-get install -y nginx
  sudo systemctl enable nginx
fi

# 5. Create directories
sudo mkdir -p $APP_DIR $LOG_DIR /var/www/shelfy/uploads
sudo chown -R $USER:$USER $APP_DIR $LOG_DIR

# 6. Copy app files
echo "📂 Copying app files..."
cp -r . $APP_DIR/
cd $APP_DIR

# 7. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# 8. Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created .env from .env.example — edit it with your real credentials!"
  echo "   nano $APP_DIR/.env"
  exit 1
fi

# 9. Generate Prisma client & run migrations
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# 10. Build Next.js
echo "🏗️  Building Next.js..."
npm run build

# 11. Configure Nginx
echo "🌐 Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/shelfy
sudo ln -sf /etc/nginx/sites-available/shelfy /etc/nginx/sites-enabled/shelfy
sudo nginx -t && sudo systemctl reload nginx

# 12. Install SSL with Certbot
if ! command -v certbot &> /dev/null; then
  echo "🔒 Installing Certbot for SSL..."
  sudo apt-get install -y certbot python3-certbot-nginx
fi
echo "🔒 Run this to get SSL certificate:"
echo "   sudo certbot --nginx -d yourdomain.co.tz -d www.yourdomain.co.tz"

# 13. Start with PM2
echo "⚡ Starting app with PM2..."
pm2 delete shelfy 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "✅ Shelfy deployed successfully!"
echo ""
echo "App running at: http://localhost:3000"
echo "PM2 status:     pm2 status"
echo "View logs:      pm2 logs shelfy"
echo "Restart:        pm2 restart shelfy"
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env with your real API keys"
echo "  2. Run: sudo certbot --nginx -d yourdomain.co.tz"
echo "  3. Visit https://yourdomain.co.tz"

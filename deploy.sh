#!/bin/bash
set -e

echo "=== Step 1: Setup ==="
mkdir -p /var/data
node --version || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)
npm install -g pm2 ts-node typescript --quiet 2>&1 | tail -3

echo "=== Step 2: Clone repo ==="
rm -rf /tmp/mailsender
git clone https://github.com/zaman5/MailSender.git /tmp/mailsender

echo "=== Step 3: Write .env ==="
cat > /tmp/mailsender/backend/.env << 'ENVEOF'
PORT=5000
JWT_SECRET=ms_super_secret_jwt_2026_change_this
DB_PATH=/var/data/mailsender.db
ADMIN_EMAIL=zamantech5@gmail.com
ADMIN_PASSWORD=Gateway@12345
EMAIL_USER=
EMAIL_PASS=
NODE_ENV=production
ENVEOF

echo "=== Step 4: Backend npm install ==="
cd /tmp/mailsender/backend && npm install 2>&1 | tail -5

echo "=== Step 6: Start backend ==="
pm2 delete mailsender-api 2>/dev/null || true
cd /tmp/mailsender/backend && pm2 start src/index.ts --name mailsender-api --interpreter ts-node
sleep 5
curl -s http://localhost:5000/api/health && echo ""

echo "=== Step 7: Build frontend ==="
export CI=false
cd /tmp/mailsender/frontend && npm install 2>&1 | tail -3
cd /tmp/mailsender/frontend && npm run build 2>&1 | tail -5

echo "=== Step 8: Deploy frontend ==="
rm -rf /var/www/html/*
cp -r /tmp/mailsender/frontend/dist/. /var/www/html/

echo "=== Step 9: Configure nginx ==="
cat > /etc/nginx/sites-available/mailsender << 'NGINX'
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html;
    server_name _;
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
    location / { try_files $uri $uri/ /index.html; }
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
NGINX
ln -sf /etc/nginx/sites-available/mailsender /etc/nginx/sites-enabled/mailsender
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "================================================"
echo "  DEPLOYMENT COMPLETE!"
echo "  Visit: http://74.208.48.167"
echo "  Admin: admin@mailsender.com / Admin@1234"
echo "================================================"

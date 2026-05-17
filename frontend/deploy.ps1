# MailSender Deployment Script
# Run this from: C:\Users\zaman\Videos\PlusVibeClone\frontend\

$SERVER = "root@74.208.48.167"
$DIST   = "dist/."
$REMOTE = "/var/www/html/"

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "  STEP 1: Uploading website files  " -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Enter your server password when prompted...`n" -ForegroundColor Yellow

# Upload dist files
scp -r -o StrictHostKeyChecking=no $DIST "${SERVER}:${REMOTE}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nUpload failed. Check your password and try again." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Files uploaded successfully!" -ForegroundColor Green

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "  STEP 2: Configuring Nginx        " -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Enter your server password again when prompted...`n" -ForegroundColor Yellow

# SSH and configure nginx in one command
$nginxConfig = @"
rm -f /var/www/html/index.nginx-debian.html
cat > /etc/nginx/sites-available/mailsender << 'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html;
    server_name _;
    location / {
        try_files \`$uri \`$uri/ /index.html;
    }
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    gzip on;
    gzip_types text/plain text/css application/javascript;
}
NGINXEOF
ln -sf /etc/nginx/sites-available/mailsender /etc/nginx/sites-enabled/mailsender
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx && echo 'SUCCESS: Website is live!'
"@

ssh -o StrictHostKeyChecking=no $SERVER $nginxConfig

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n===========================================" -ForegroundColor Green
    Write-Host "  ✅ YOUR WEBSITE IS LIVE!" -ForegroundColor Green
    Write-Host "  👉 http://74.208.48.167" -ForegroundColor Green  
    Write-Host "===========================================" -ForegroundColor Green
} else {
    Write-Host "`n❌ Nginx config failed. Contact support." -ForegroundColor Red
}

import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST     = "74.208.48.167"
USER     = "root"
PASSWORD = "8An@N!2802"
REPO     = "https://github.com/zaman5/MailSender.git"

ENV_CONTENT = """PORT=5000
JWT_SECRET=ms_super_secret_jwt_2026_change_this
DB_PATH=/var/data/mailsender.db
ADMIN_EMAIL=zamantech5@gmail.com
ADMIN_PASSWORD=Gateway@12345
EMAIL_USER=
EMAIL_PASS=
NODE_ENV=production
"""

def run(ssh, cmd, timeout=240):
    print(f"\n$ {cmd[:120]}")
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    raw = stdout.read()
    out = raw.decode('utf-8', errors='ignore').encode('ascii', errors='ignore').decode('ascii').strip()
    if out: print(out[-3000:])
    return out

print(f"Connecting to {HOST}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
except Exception as e:
    print(f"Connection failed: {e}"); sys.exit(1)
print("Connected!\n")

# 1. Data directory
print("=== Setting up data directory ===")
run(ssh, "mkdir -p /var/data && chmod 755 /var/data")

# 2. Pull/clone repo
print("\n=== Wiping old files and cloning fresh repository ===")
run(ssh, "rm -rf /tmp/mailsender && git clone " + REPO + " /tmp/mailsender", timeout=90)
run(ssh, "cd /tmp/mailsender && git log --oneline -3")

# 3. Write .env
print("\n=== Writing .env ===")
sftp = ssh.open_sftp()
with sftp.file('/tmp/mailsender/backend/.env', 'w') as f:
    f.write(ENV_CONTENT)
sftp.close()
print("Files written via SFTP!")

# 5. Backend
print("\n=== Setting up Backend ===")
run(ssh, "which ts-node || npm install -g ts-node typescript 2>&1 | tail -3", timeout=120)
run(ssh, "which pm2 || npm install -g pm2 2>&1 | tail -3", timeout=120)
run(ssh, "cd /tmp/mailsender/backend && npm install 2>&1 | tail -8", timeout=240)
run(ssh, "cd /tmp/mailsender/backend && npx tsc 2>&1 | tail -10", timeout=120)

print("\n=== Restarting backend ===")
run(ssh, "pm2 delete mailsender-api 2>/dev/null || true")
run(ssh, "cd /tmp/mailsender/backend && pm2 start dist/index.js --name mailsender-api 2>&1", timeout=60)
run(ssh, "pm2 save 2>&1")
run(ssh, "sleep 4 && pm2 status")

# Health check
print("\n=== Backend health check ===")
health = run(ssh, "curl -s http://localhost:5000/api/health")
print("Health:", health)

# 6. Build frontend
print("\n=== Building React frontend ===")
run(ssh, "export CI=false && cd /tmp/mailsender/frontend && npm install 2>&1 | tail -5", timeout=240)
run(ssh, "export CI=false && cd /tmp/mailsender/frontend && npm run build 2>&1", timeout=180)

# 7. Deploy frontend
print("\n=== Deploying frontend ===")
run(ssh, "rm -rf /var/www/html/* && cp -r /tmp/mailsender/frontend/dist/. /var/www/html/")
print("Files:", run(ssh, "ls /var/www/html/"))

# 8. Nginx
print("\n=== Configuring Nginx ===")
nginx_conf = r"""server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html;
    server_name _;
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
    location / { 
        try_files $uri $uri/ /index.html; 
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
"""
run(ssh, f"cat > /etc/nginx/sites-available/mailsender << 'NGINXEOF'\n{nginx_conf}NGINXEOF")
run(ssh, "ln -sf /etc/nginx/sites-available/mailsender /etc/nginx/sites-enabled/mailsender && rm -f /etc/nginx/sites-enabled/default")
result = run(ssh, "nginx -t 2>&1 && systemctl reload nginx 2>&1 && echo 'NGINX_OK'")

if "NGINX_OK" in result:
    print("\n" + "="*52)
    print("  DEPLOYMENT COMPLETE!")
    print(f"  http://{HOST}")
    print("  Admin: admin@mailsender.com / Admin@1234")
    print("="*52)
else:
    print("Nginx issue:", result)

ssh.close()

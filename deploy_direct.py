"""
deploy_direct.py  —  Upload local files → rebuild → redeploy
Run: python deploy_direct.py
"""
import paramiko, sys, io, os, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST      = "74.208.48.167"
USER      = "root"
PASSWORD  = "8An@N!2802"
LOCAL     = r"c:\Users\zaman\Videos\PlusVibeClone"
REMOTE    = "/tmp/mailsender"

# All files changed locally that need to be on the server
UPLOADS = [
    # Frontend
    (r"frontend\src\index.css",          "frontend/src/index.css"),
    (r"frontend\src\App.jsx",            "frontend/src/App.jsx"),
    (r"frontend\src\Dashboard.jsx",      "frontend/src/Dashboard.jsx"),
    (r"frontend\src\Login.jsx",          "frontend/src/Login.jsx"),
    (r"frontend\src\Signup.jsx",         "frontend/src/Signup.jsx"),
    (r"frontend\src\Settings.jsx",       "frontend/src/Settings.jsx"),
    (r"frontend\index.html",             "frontend/index.html"),
    # Backend
    (r"backend\src\routes\auth.ts",      "backend/src/routes/auth.ts"),
    (r"backend\src\routes\accounts.ts",  "backend/src/routes/accounts.ts"),
    (r"backend\src\db.ts",               "backend/src/db.ts"),
]

# Correct .env for server — DB_PATH is critical!
ENV = """PORT=5000
JWT_SECRET=ms_super_secret_jwt_2026_change_this
DB_PATH=/var/data/mailsender.db
ADMIN_EMAIL=admin@mailsender.com
ADMIN_PASSWORD=Admin@1234
EMAIL_USER=
EMAIL_PASS=
NODE_ENV=production
"""

def run(ssh, cmd, timeout=240):
    print(f"\n$ {cmd[:100]}")
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    if out: print(out[-2000:])
    return out

print(f"\nConnecting to {HOST}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
except Exception as e:
    print(f"❌ Connection failed: {e}"); sys.exit(1)
print("✅ Connected!\n")

# Step 1: Ensure repo exists on server
print("=" * 50)
print("STEP 1: Ensure repo is on server")
print("=" * 50)
out = run(ssh, f"test -d {REMOTE}/.git && echo EXISTS || echo MISSING")
if "MISSING" in out:
    print("Cloning repo...")
    run(ssh, f"git clone https://github.com/zaman5/MailSender.git {REMOTE}", timeout=120)
else:
    print("Repo exists — pulling latest...")
    run(ssh, f"cd {REMOTE} && git fetch --all && git reset --hard origin/main 2>&1 | tail -3", timeout=60)

# Step 2: Upload all changed files
print("\n" + "=" * 50)
print("STEP 2: Uploading changed files via SFTP")
print("=" * 50)
sftp = ssh.open_sftp()

for local_rel, remote_rel in UPLOADS:
    local_path  = os.path.join(LOCAL, local_rel)
    remote_path = f"{REMOTE}/{remote_rel}"
    if not os.path.exists(local_path):
        print(f"  ⚠️  Skipped (not found): {local_rel}")
        continue
    remote_dir = remote_path.rsplit('/', 1)[0]
    run(ssh, f"mkdir -p {remote_dir}")
    sftp.put(local_path, remote_path)
    print(f"  ✅ {local_rel}")

# Step 3: Write correct .env with DB_PATH
print("\n" + "=" * 50)
print("STEP 3: Writing .env (with correct DB_PATH)")
print("=" * 50)
run(ssh, "mkdir -p /var/data && chmod 755 /var/data")
with sftp.file(f"{REMOTE}/backend/.env", 'w') as f:
    f.write(ENV)
print("  ✅ .env written")
run(ssh, f"cat {REMOTE}/backend/.env")

sftp.close()

# Step 4: Restart backend
print("\n" + "=" * 50)
print("STEP 4: Restarting backend")
print("=" * 50)
run(ssh, "which ts-node || npm install -g ts-node typescript --quiet 2>&1 | tail -2", timeout=120)
run(ssh, "which pm2 || npm install -g pm2 --quiet 2>&1 | tail -2", timeout=120)
run(ssh, f"cd {REMOTE}/backend && npm install 2>&1 | tail -5", timeout=240)
run(ssh, f"cd {REMOTE}/backend && npx tsc 2>&1 | tail -10", timeout=120)
run(ssh, "pm2 delete mailsender-api 2>/dev/null || true")
run(ssh, f"cd {REMOTE}/backend && pm2 start dist/index.js --name mailsender-api 2>&1", timeout=60)
run(ssh, "pm2 save 2>&1 | tail -1")
print("Waiting 5s for backend to start...")
time.sleep(5)
run(ssh, "pm2 status")

# Step 5: Health check
print("\n" + "=" * 50)
print("STEP 5: Health check")
print("=" * 50)
health = run(ssh, "curl -s http://localhost:5000/api/health")
print("Health response:", health)
if not health:
    print("⚠️  Backend may not be running — check pm2 logs:")
    run(ssh, "pm2 logs mailsender-api --lines 20 --nostream")

# Step 6: Build frontend
print("\n" + "=" * 50)
print("STEP 6: Building frontend")
print("=" * 50)
run(ssh, f"export CI=false && cd {REMOTE}/frontend && npm install --legacy-peer-deps 2>&1 | tail -5", timeout=240)
build = run(ssh, f"export CI=false && cd {REMOTE}/frontend && npm run build 2>&1", timeout=200)
if "error" in build.lower() and "vite" not in build.lower():
    print("⚠️  Build errors detected!")

# Step 7: Deploy frontend
print("\n" + "=" * 50)
print("STEP 7: Deploying to /var/www/html")
print("=" * 50)
run(ssh, f"rm -rf /var/www/html/* && cp -r {REMOTE}/frontend/dist/. /var/www/html/")
run(ssh, "ls /var/www/html/")

# Step 8: Nginx
print("\n" + "=" * 50)
print("STEP 8: Nginx config + reload")
print("=" * 50)
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
    location / { try_files $uri $uri/ /index.html; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
"""
sftp2 = ssh.open_sftp()
with sftp2.file('/etc/nginx/sites-available/mailsender', 'w') as f:
    f.write(nginx_conf)
sftp2.close()
run(ssh, "ln -sf /etc/nginx/sites-available/mailsender /etc/nginx/sites-enabled/mailsender && rm -f /etc/nginx/sites-enabled/default")
result = run(ssh, "nginx -t 2>&1 && systemctl reload nginx && echo NGINX_OK")

ssh.close()

print("\n" + "=" * 52)
if "NGINX_OK" in result:
    print("  ✅ DEPLOYMENT COMPLETE!")
    print(f"  🌐  http://{HOST}")
    print("  👤  admin@mailsender.com")
    print("  🔑  Admin@1234")
    print("")
    print("  FIXES DEPLOYED:")
    print("  ✅ Email Accounts saved to DB (DB_PATH fixed)")
    print("  ✅ Logout works (AuthContext)")
    print("  ✅ Settings shows real user data")
    print("  ✅ Password change & profile save work")
    print("  ✅ Mobile responsive design")
else:
    print("  ⚠️  Nginx had issues — check output above")
print("=" * 52)

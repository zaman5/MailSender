"""
fix_server.py
─────────────────────────────────────────────────────────────
Uses Windows built-in ssh.exe (OpenSSH, comes with Win10/11)
OR plink.exe if PuTTY is installed.
No extra Python packages needed.

Run:  python fix_server.py
─────────────────────────────────────────────────────────────
"""
import subprocess, sys, os, time, tempfile

HOST     = "74.208.48.167"
USER     = "root"
PASS     = "8An@N!2802"
REMOTE   = "/tmp/mailsender"
LOCAL    = r"c:\Users\zaman\Videos\PlusVibeClone"

# ── find ssh / scp ──────────────────────────────────────────
SSH = None
SCP = None
PLINK = None

for candidate in [
    r"C:\Windows\System32\OpenSSH\ssh.exe",
    r"C:\Windows\System32\ssh.exe",
    "ssh",
]:
    try:
        subprocess.run([candidate, "-V"], capture_output=True, timeout=3)
        SSH = candidate
        SCP = candidate.replace("ssh.exe","scp.exe").replace("ssh","scp")
        break
    except Exception:
        pass

for candidate in [
    r"C:\Program Files\PuTTY\plink.exe",
    r"C:\Program Files (x86)\PuTTY\plink.exe",
    "plink",
]:
    try:
        subprocess.run([candidate, "-V"], capture_output=True, timeout=3)
        PLINK = candidate
        break
    except Exception:
        pass

print(f"SSH found: {SSH}")
print(f"PLINK found: {PLINK}")

# ── helpers ─────────────────────────────────────────────────
def ssh_run(cmd, timeout=300):
    """Run a command on the remote server."""
    print(f"\n$ {cmd[:120]}")
    
    if PLINK:
        # Use plink (no host-key prompt with -batch)
        proc = subprocess.run(
            [PLINK, "-batch", "-pw", PASS, f"{USER}@{HOST}", cmd],
            capture_output=True, text=True, timeout=timeout
        )
    elif SSH:
        # Use OpenSSH with StrictHostKeyChecking disabled
        proc = subprocess.run(
            [SSH, "-o", "StrictHostKeyChecking=no",
             "-o", "UserKnownHostsFile=/dev/null",
             "-o", "BatchMode=no",
             f"{USER}@{HOST}", cmd],
            capture_output=True, text=True, timeout=timeout,
            input=PASS + "\n"
        )
    else:
        print("❌ No SSH client found. Please install PuTTY or enable OpenSSH.")
        sys.exit(1)
    
    out = (proc.stdout + proc.stderr).strip()
    if out: print(out[-2000:])
    return out

def scp_upload(local_file, remote_path):
    """Upload a file to the server."""
    if not os.path.exists(local_file):
        print(f"  ⚠ Skipped (not found): {local_file}")
        return False
    print(f"  Uploading {os.path.basename(local_file)}...")
    
    if PLINK:
        pscp = PLINK.replace("plink", "pscp")
        proc = subprocess.run(
            [pscp, "-batch", "-pw", PASS, local_file, f"{USER}@{HOST}:{remote_path}"],
            capture_output=True, text=True, timeout=60
        )
    elif SCP:
        proc = subprocess.run(
            [SCP, "-o", "StrictHostKeyChecking=no",
             "-o", "UserKnownHostsFile=/dev/null",
             local_file, f"{USER}@{HOST}:{remote_path}"],
            capture_output=True, text=True, timeout=60
        )
    else:
        print("  ❌ No SCP client found")
        return False
    
    if proc.returncode == 0:
        print(f"  ✅ Uploaded")
    else:
        print(f"  ❌ Failed: {proc.stderr[:200]}")
    return proc.returncode == 0

# ── write files via heredoc (doesn't need SCP) ──────────────
def write_remote_file(remote_path, content):
    """Write a file on server using a shell heredoc."""
    # Escape for shell heredoc
    escaped = content.replace("'", "'\\''")
    cmd = f"mkdir -p $(dirname {remote_path}) && cat > {remote_path} << 'HEREDOC_EOF'\n{content}\nHEREDOC_EOF\necho WRITE_OK"
    out = ssh_run(cmd)
    return "WRITE_OK" in out

# ── File contents to push ─────────────────────────────────────
ENV_CONTENT = """PORT=5000
JWT_SECRET=ms_super_secret_jwt_2026_change_this
DB_PATH=/var/data/mailsender.db
ADMIN_EMAIL=admin@mailsender.com
ADMIN_PASSWORD=Admin@1234
EMAIL_USER=
EMAIL_PASS=
NODE_ENV=production
"""

INDEX_TS = """import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import './db';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import campaignRoutes from './routes/campaigns';
import adminRoutes from './routes/admin';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin', adminRoutes);

app.listen(port, () => console.log(`MailSender API running on port ${port}`));
"""

# ── RUN ───────────────────────────────────────────────────────
print("\n" + "="*50)
print("  MailSender Server Fix")
print("="*50)

# 1. Test connection
print("\n[1] Testing connection...")
out = ssh_run("echo CONNECTED && whoami")
if "CONNECTED" not in out:
    print("\n❌ Cannot connect. Trying with paramiko...")
    try:
        import paramiko
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh_client.connect(HOST, username=USER, password=PASS, timeout=15)
        
        def paramiko_run(cmd, timeout=240):
            print(f"\n$ {cmd[:100]}")
            _, stdout, _ = ssh_client.exec_command(cmd, timeout=timeout, get_pty=True)
            out = stdout.read().decode('utf-8', errors='ignore').strip()
            if out: print(out[-2000:])
            return out
        
        # Override ssh_run with paramiko version
        ssh_run.__code__ = paramiko_run.__code__
        print("✅ Connected via paramiko!")
    except ImportError:
        print("paramiko not installed. Run: pip install paramiko")
        print("\n" + "="*50)
        print("MANUAL FIX INSTRUCTIONS:")
        print("="*50)
        print("Open Command Prompt and run:")
        print(f'  ssh root@{HOST}')
        print(f"  (password: {PASS})")
        print("\nThen paste these commands:")
        print(f"  cd {REMOTE} && git pull origin main")
        print(f"  echo 'DB_PATH=/var/data/mailsender.db' >> {REMOTE}/backend/.env")
        print(f"  pm2 restart mailsender-api")
        sys.exit(1)
    except Exception as e:
        print(f"❌ paramiko failed: {e}")
        sys.exit(1)

# 2. Setup
print("\n[2] Setup data directory...")
ssh_run("mkdir -p /var/data && chmod 755 /var/data")

# 3. Clone/pull repo
print("\n[3] Getting latest code...")
out = ssh_run(f"test -d {REMOTE}/.git && echo EXISTS || echo MISSING")
if "MISSING" in out:
    ssh_run(f"git clone https://github.com/zaman5/MailSender.git {REMOTE}", timeout=120)
else:
    ssh_run(f"cd {REMOTE} && git fetch --all && git reset --hard origin/main 2>&1 | tail -3", timeout=60)

# 4. Write .env
print("\n[4] Writing .env with correct DB_PATH...")
ssh_run(f"""cat > {REMOTE}/backend/.env << 'ENVEOF'
PORT=5000
JWT_SECRET=ms_super_secret_jwt_2026_change_this
DB_PATH=/var/data/mailsender.db
ADMIN_EMAIL=admin@mailsender.com
ADMIN_PASSWORD=Admin@1234
EMAIL_USER=
EMAIL_PASS=
NODE_ENV=production
ENVEOF
cat {REMOTE}/backend/.env""")

# 5. Write index.ts (ensure all routes are mounted)
print("\n[5] Writing backend index.ts...")
ssh_run(f"""cat > {REMOTE}/backend/src/index.ts << 'TSEOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import './db';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import campaignRoutes from './routes/campaigns';
import adminRoutes from './routes/admin';
const app = express();
const port = process.env.PORT || 5000;
app.use(cors({{ origin: '*' }}));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({{ status: 'ok', ts: Date.now() }}));
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin', adminRoutes);
app.listen(port, () => console.log('MailSender API on port '+port));
TSEOF
echo "INDEX_TS_OK" """)

# 6. Install deps + restart
print("\n[6] Installing backend dependencies...")
ssh_run(f"cd {REMOTE}/backend && npm install 2>&1 | tail -5", timeout=240)

print("\n[7] Restarting backend via PM2...")
ssh_run("pm2 delete mailsender-api 2>/dev/null || true")
ssh_run(f"cd {REMOTE}/backend && pm2 start src/index.ts --name mailsender-api --interpreter ts-node 2>&1", timeout=60)
ssh_run("pm2 save 2>&1 | tail -1")

print("\nWaiting 6 seconds for backend to start...")
time.sleep(6)
ssh_run("pm2 status")

# 7. Health check
print("\n[8] Health check...")
health = ssh_run("curl -s http://localhost:5000/api/health")
print("Health:", health)

auth_test = ssh_run("curl -s -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@mailsender.com\",\"password\":\"Admin@1234\"}' | head -c 200")
print("Auth test:", auth_test)

if "token" in auth_test.lower():
    print("\n✅ Backend is FULLY WORKING!")
else:
    print("\n⚠️ Auth not working yet, checking pm2 logs...")
    ssh_run("pm2 logs mailsender-api --lines 25 --nostream 2>&1 | tail -25")

# 8. Build + deploy frontend
print("\n[9] Building frontend...")
ssh_run(f"export CI=false && cd {REMOTE}/frontend && npm install --legacy-peer-deps 2>&1 | tail -3", timeout=240)
ssh_run(f"export CI=false && cd {REMOTE}/frontend && npm run build 2>&1 | tail -10", timeout=200)

print("\n[10] Deploying frontend...")
ssh_run(f"rm -rf /var/www/html/* && cp -r {REMOTE}/frontend/dist/. /var/www/html/ && ls /var/www/html/")
result = ssh_run("nginx -t 2>&1 && systemctl reload nginx && echo NGINX_OK")

print("\n" + "="*52)
if "NGINX_OK" in result:
    print("  ✅ DEPLOYMENT COMPLETE!")
    print(f"  🌐 http://{HOST}")
    print("  👤 admin@mailsender.com / Admin@1234")
else:
    print("  ⚠️ Check nginx output above")
print("="*52)

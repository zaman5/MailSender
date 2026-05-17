$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  MailSender Full Deploy Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# ── Step 1: Git commit & push ──────────────────────────────────────────────────
Write-Host "`n[1/3] Committing and pushing to GitHub..." -ForegroundColor Yellow

Set-Location "c:\Users\zaman\Videos\PlusVibeClone"

git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "Deploying complete code to live server"
    git push
    Write-Host "  ✅ Pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Nothing new to commit — pushing anyway..." -ForegroundColor Gray
    git push
}

# ── Step 2: Run deploy_server.py ───────────────────────────────────────────────
Write-Host "`n[2/3] Running server deployment (this takes ~3-5 minutes)..." -ForegroundColor Yellow

# Check paramiko is installed
$pipCheck = pip show paramiko 2>$null
if (-not $pipCheck) {
    Write-Host "  Installing paramiko..." -ForegroundColor Gray
    pip install paramiko --quiet
}

python deploy_server.py

Write-Host "`n[3/3] Done!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Live at: http://74.208.48.167" -ForegroundColor Green
Write-Host "  Admin:   admin@mailsender.com" -ForegroundColor Green
Write-Host "  Pass:    Admin@1234" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

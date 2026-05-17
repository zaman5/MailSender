Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Step 1: Committing changes to Git       " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
git add -A
git commit -m "feat: full backend auth with SQLite, Admin panel, JWT, and Campaigns/Accounts API integration"
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nWarning: Git push failed or nothing to commit. Continuing to deploy anyway..." -ForegroundColor Yellow
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Step 2: Deploying to Server via SSH     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
python deploy_server.py

Write-Host "`nDeployment process finished." -ForegroundColor Green

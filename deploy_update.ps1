# ============================================================
#  PetPoint Pro — VPS Update Helper
#  Run from the project root in PowerShell:
#    .\deploy_update.ps1 -VpsIp "your.vps.ip"
#
#  What this does:
#    1. Builds the app (npm run build)
#    2. Creates the update zip (dist/ + package.json)
#    3. Uploads zip + update_vps.sh to VPS via scp
#    4. SSH into VPS and runs the update script
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsIp,

    [string]$VpsUser = "root",
    [string]$AppDir  = "/var/www/vet-clinic",
    [string]$ZipName = "petpoint_update_latest.zip"
)

$ErrorActionPreference = "Stop"

$ProjectDir = $PSScriptRoot
$ZipPath    = Join-Path $ProjectDir $ZipName

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PetPoint Pro — VPS Update Workflow"   -ForegroundColor Cyan
Write-Host "  Target: $VpsUser@$VpsIp"               -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Build ────────────────────────────────────────────
Write-Host "[1/4] Building the application..." -ForegroundColor Yellow
Set-Location $ProjectDir
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed. Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "      Build successful!" -ForegroundColor Green
Write-Host ""

# ── Step 2: Create Zip ───────────────────────────────────────
Write-Host "[2/4] Creating update zip: $ZipName ..." -ForegroundColor Yellow

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Add-Type -Assembly System.IO.Compression.FileSystem
$zip  = [System.IO.Compression.ZipFile]::Open($ZipPath, 'Create')
$base = $ProjectDir

# Add dist/ folder recursively
Get-ChildItem -Recurse -File -Path (Join-Path $ProjectDir "dist") | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
}

# Add package.json
$pkgPath = Join-Path $base "package.json"
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $pkgPath, "package.json") | Out-Null

$zip.Dispose()

$zipSizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "      Zip created: $ZipName ($zipSizeMb MB)" -ForegroundColor Green
Write-Host ""

# ── Step 3: Upload to VPS ────────────────────────────────────
Write-Host "[3/4] Uploading files to ${VpsUser}@${VpsIp} ..." -ForegroundColor Yellow

Write-Host "      Uploading $ZipName ..."
scp $ZipPath "${VpsUser}@${VpsIp}:/root/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: scp upload of zip failed." -ForegroundColor Red
    exit 1
}

Write-Host "      Uploading update_vps.sh ..."
scp (Join-Path $ProjectDir "update_vps.sh") "${VpsUser}@${VpsIp}:/root/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: scp upload of update_vps.sh failed." -ForegroundColor Red
    exit 1
}

Write-Host "      Upload complete!" -ForegroundColor Green
Write-Host ""

# ── Step 4: Run Update on VPS ────────────────────────────────
Write-Host "[4/4] Running update script on VPS..." -ForegroundColor Yellow
Write-Host "      Connecting to ${VpsUser}@${VpsIp} ..."
Write-Host ""

ssh "${VpsUser}@${VpsIp}" "chmod +x /root/update_vps.sh && bash /root/update_vps.sh"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Update workflow complete!"             -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To check the app: Open https://your-domain in your browser"
Write-Host "For live logs:    ssh ${VpsUser}@${VpsIp} 'pm2 logs vet-clinic-app'"
Write-Host ""

# ============================================================
#  PetPoint Pro - VPS Update Package Creator
#  Features in this build:
#    - Revenue Reports dashboard (IP/OP, service/inventory by date range)
#    - MRP / Stock columns in Purchase Entry
#    - Purchase Entry Enter-key row navigation
#
#  Run from the project root in PowerShell:
#    .\script\make_update_revenue_mrp.ps1
#
#  Prerequisite: npm run build must have been run (or pass -Build)
# ============================================================

param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"

$ProjectRoot = "c:\Users\HOME\Desktop\Vetinary Clinic Management"
$ZipName     = "petpoint_update_revenue_mrp.zip"
$ZipPath     = Join-Path $ProjectRoot $ZipName

Set-Location $ProjectRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PetPoint Pro - Update Package Creator"     -ForegroundColor Cyan
Write-Host "  Bundle : $ZipName"                         -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Optional build step
if ($Build) {
    Write-Host "[BUILD] Running npm run build ..." -ForegroundColor Yellow
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed. Aborting." -ForegroundColor Red
        exit 1
    }
    Write-Host "       Build OK" -ForegroundColor Green
    Write-Host ""
}

# Verify dist exists
$distIndex = Join-Path $ProjectRoot "dist\index.cjs"
if (-not (Test-Path $distIndex)) {
    Write-Host "ERROR: dist\index.cjs not found!" -ForegroundColor Red
    Write-Host "       Run 'npm run build' first, or pass -Build flag." -ForegroundColor Yellow
    exit 1
}
Write-Host "[CHECK] dist/index.cjs found OK" -ForegroundColor Green

# Remove old zip
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
    Write-Host "[CLEAN] Removed old $ZipName" -ForegroundColor Yellow
}

# Create zip with forward-slash entry names
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$stream  = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-FileToZip($archive, $fullPath, $entryName) {
    $entry       = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream  = [System.IO.File]::OpenRead($fullPath)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
}

function Add-DirToZip($archive, $sourceDir, $zipPrefix) {
    Get-ChildItem -Recurse -File $sourceDir | ForEach-Object {
        $relative  = $_.FullName.Substring($sourceDir.Length).TrimStart('\').Replace('\', '/')
        $entryName = $zipPrefix + $relative
        Add-FileToZip $archive $_.FullName $entryName
    }
}

# Add dist/
Write-Host "[ZIP]   Adding dist/ ..." -ForegroundColor DarkGreen
Add-DirToZip $archive (Join-Path $ProjectRoot "dist") "dist/"

# Add shared/
$sharedDir = Join-Path $ProjectRoot "shared"
if (Test-Path $sharedDir) {
    Write-Host "[ZIP]   Adding shared/ ..." -ForegroundColor DarkGreen
    Add-DirToZip $archive $sharedDir "shared/"
}

# Add root config files
$singles = @("package.json", "package-lock.json", "ecosystem.config.cjs", "drizzle.config.ts")
foreach ($name in $singles) {
    $fp = Join-Path $ProjectRoot $name
    if (Test-Path $fp) {
        Write-Host "[ZIP]   Adding $name ..." -ForegroundColor DarkGreen
        Add-FileToZip $archive $fp $name
    }
}

$archive.Dispose()
$stream.Close()

# Verify zip contents
$zipCheck  = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
$distOk    = ($zipCheck.Entries | Where-Object { $_.FullName -eq "dist/index.cjs" }) -ne $null
$sharedOk  = ($zipCheck.Entries | Where-Object { $_.FullName -like "shared/*" })     -ne $null
$entryCount = $zipCheck.Entries.Count
$zipCheck.Dispose()

$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Verification" -ForegroundColor Cyan
if ($distOk)   { Write-Host "  dist/index.cjs   : OK" -ForegroundColor Green }
else            { Write-Host "  dist/index.cjs   : MISSING!" -ForegroundColor Red }
if ($sharedOk) { Write-Host "  shared/           : OK" -ForegroundColor Green }
else            { Write-Host "  shared/           : (not included)" -ForegroundColor Yellow }
Write-Host "  Total entries     : $entryCount" -ForegroundColor White
Write-Host "  Zip size          : $sizeMB MB" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Zip created: $ZipPath" -ForegroundColor Green
Write-Host ""
Write-Host "-- Upload Commands --" -ForegroundColor DarkCyan
Write-Host "  scp `"$ZipPath`" root@<vps-ip>:/root/"
Write-Host "  scp `"$ProjectRoot\update_vps.sh`" root@<vps-ip>:/root/"
Write-Host ""
Write-Host "-- Run on VPS --" -ForegroundColor DarkCyan
Write-Host "  ssh root@<vps-ip>"
Write-Host "  chmod +x /root/update_vps.sh"
Write-Host "  bash /root/update_vps.sh"
Write-Host ""

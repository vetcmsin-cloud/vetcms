$ErrorActionPreference = "Stop"

$projectRoot = "c:\Users\HOME\Desktop\Vetinary Clinic Management"
$zipOut = Join-Path $projectRoot "update_vps.zip"

Write-Host ""
Write-Host "=== PetPoint Pro - CODE UPDATE Packager ===" -ForegroundColor Cyan
Write-Host "  (Does NOT touch the database or any existing data)" -ForegroundColor DarkGray
Write-Host ""

# Remove old zip if it exists
if (Test-Path $zipOut) {
    Remove-Item $zipOut -Force
    Write-Host "  Removed old update_vps.zip" -ForegroundColor Yellow
}

# Verify build exists
if (-not (Test-Path (Join-Path $projectRoot "dist\index.cjs"))) {
    Write-Host "ERROR: dist\index.cjs not found!" -ForegroundColor Red
    Write-Host "       Run 'npm run build' first, then re-run this script." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] dist/index.cjs found" -ForegroundColor Green

# Verify update script exists
if (-not (Test-Path (Join-Path $projectRoot "update.sh"))) {
    Write-Host "ERROR: update.sh not found in project root!" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] update.sh found" -ForegroundColor Green

# Use .NET ZipFile API to write entries with forward-slash paths
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$stream = [System.IO.File]::Open($zipOut, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-FileToZip($archive, $fullPath, $entryName) {
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($fullPath)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
}

function Add-DirToZip($archive, $sourceDir, $zipPrefix) {
    $files = Get-ChildItem -Recurse -File $sourceDir
    foreach ($f in $files) {
        $relative = $f.FullName.Substring($sourceDir.Length).TrimStart("\").Replace("\", "/")
        $entryName = $zipPrefix + $relative
        Add-FileToZip $archive $f.FullName $entryName
    }
}

# ── Add dist/ (compiled server + client bundle) ──────────────────
Write-Host "  Packing dist/ ..." -ForegroundColor DarkGreen
Add-DirToZip $archive (Join-Path $projectRoot "dist") "dist/"

# ── Add shared/ (schema types used by server) ─────────────────────
Write-Host "  Packing shared/ ..." -ForegroundColor DarkGreen
Add-DirToZip $archive (Join-Path $projectRoot "shared") "shared/"

# ── Add individual config / runtime files ──────────────────────────
$singles = @(
    "package.json",
    "package-lock.json",
    "ecosystem.config.cjs",
    "drizzle.config.ts",
    "update.sh"
)

foreach ($name in $singles) {
    $fullPath = Join-Path $projectRoot $name
    if (Test-Path $fullPath) {
        Write-Host "  Packing $name ..." -ForegroundColor DarkGreen
        Add-FileToZip $archive $fullPath $name
    }
    else {
        Write-Host "  SKIP (not found): $name" -ForegroundColor Yellow
    }
}

$archive.Dispose()
$stream.Close()

# ── Verify the zip contents ──────────────────────────────────────
$zipCheck = [System.IO.Compression.ZipFile]::OpenRead($zipOut)
$distOk = ($zipCheck.Entries | Where-Object { $_.FullName -eq "dist/index.cjs" }) -ne $null
$sharedOk = ($zipCheck.Entries | Where-Object { $_.FullName -eq "shared/schema.ts" }) -ne $null
$updateOk = ($zipCheck.Entries | Where-Object { $_.FullName -eq "update.sh" }) -ne $null
$zipCheck.Dispose()

$sizeMB = [math]::Round((Get-Item $zipOut).Length / 1MB, 2)

Write-Host ""
Write-Host "=== Package Contents ===" -ForegroundColor Cyan
if ($distOk) { Write-Host "  dist/index.cjs   : OK" -ForegroundColor Green } else { Write-Host "  dist/index.cjs   : MISSING" -ForegroundColor Red }
if ($sharedOk) { Write-Host "  shared/schema.ts : OK" -ForegroundColor Green } else { Write-Host "  shared/schema.ts : MISSING" -ForegroundColor Red }
if ($updateOk) { Write-Host "  update.sh        : OK" -ForegroundColor Green } else { Write-Host "  update.sh        : MISSING" -ForegroundColor Red }
Write-Host ""
Write-Host "update_vps.zip created: $sizeMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "  1. Upload to VPS:"
Write-Host "     scp ""$zipOut"" root@<vps-ip>:/root/"
Write-Host ""
Write-Host "  2. SSH into your VPS and run:"
Write-Host "     cd /root && unzip -o update_vps.zip update.sh && chmod +x update.sh && ./update.sh"
Write-Host ""
Write-Host "  The update.sh will:"
Write-Host "    - Replace dist/ and shared/ with the new build"
Write-Host "    - Keep your .env, database, and uploaded files UNTOUCHED"
Write-Host "    - Run 'npm ci' to sync any new npm dependencies"
Write-Host "    - Restart the app with PM2"
Write-Host ""

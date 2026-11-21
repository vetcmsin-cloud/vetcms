# ============================================================
#  PetPoint Pro — Create Update ZIP (May 20 2026)
#  Packages: dist/ + ecosystem.config.cjs + package.json
#  Run from the project root (dist/ must already exist from npm run build)
# ============================================================

Add-Type -Assembly System.IO.Compression.FileSystem

$zipName = "petpoint_update_may20.zip"
$zipPath = [System.IO.Path]::GetFullPath($zipName)
$base    = (Get-Location).Path

# Remove old zip if present
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "  Removed old $zipName"
}

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

$fileCount = 0

# ── Add dist/ recursively (forward-slash paths so Linux unzip works cleanly) ──
$distPath = Join-Path $base "dist"
if (-not (Test-Path $distPath)) {
    $zip.Dispose()
    Write-Error "dist/ folder not found. Run 'npm run build' first."
    exit 1
}

Get-ChildItem -Recurse -File -Path $distPath | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
    $fileCount++
}
Write-Host "  Added $fileCount dist/ files"

# ── Add ecosystem.config.cjs ──
$ecoPath = Join-Path $base "ecosystem.config.cjs"
if (Test-Path $ecoPath) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $ecoPath, 'ecosystem.config.cjs') | Out-Null
    Write-Host "  Added ecosystem.config.cjs"
}

# ── Add package.json ──
$pkgPath = Join-Path $base "package.json"
if (Test-Path $pkgPath) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $pkgPath, 'package.json') | Out-Null
    Write-Host "  Added package.json"
}

$zip.Dispose()

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host ''
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
Write-Host '  OK  Created: ' -NoNewline
Write-Host $zipName -NoNewline
Write-Host " ($sizeMB MB)"
Write-Host '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
Write-Host ''
Write-Host '  Upload BOTH files to /root/ on your VPS:'
Write-Host "    $zipName"
Write-Host '    update_vps_may20.sh'
Write-Host ''
Write-Host '  Then run on the VPS:'
Write-Host '    chmod +x /root/update_vps_may20.sh'
Write-Host '    sudo bash /root/update_vps_may20.sh'
Write-Host ''

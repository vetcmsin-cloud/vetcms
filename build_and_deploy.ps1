# ================================================================
#  PetPoint Pro -- Build and Deploy to VPS
#
#  Zip name is auto-generated as:  petpoint_YYYYMMDD_HHMM.zip
#  so every build has a unique, conflict-free filename.
#
#  Usage:
#    .\build_and_deploy.ps1 -VpsIp "1.2.3.4"
#    .\build_and_deploy.ps1 -VpsIp "1.2.3.4" -SkipBuild
#    .\build_and_deploy.ps1 -ZipOnly          (build + zip, no upload)
#    .\build_and_deploy.ps1 -ZipOnly -SkipBuild
#
#  On the VPS the update script automatically picks the newest
#  petpoint_*.zip in ~/  -- no manual renaming ever needed.
#
#  DATA SAFETY:
#    .env            -- NEVER touched (DB creds, secrets safe)
#    PostgreSQL data -- NEVER touched (all patient data safe)
#    uploads/        -- NEVER touched (photos, documents safe)
#    dist/ backup    -- saved on VPS before each update
# ================================================================

param(
    [string]$VpsIp   = "",
    [string]$VpsUser = "root",
    [string]$AppDir  = "/var/www/vet-clinic",
    [switch]$SkipBuild,
    [switch]$ZipOnly,
    [switch]$SkipUpload
)

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

# ---- Date-stamped zip name (unique per build, no conflicts) -----
$Stamp   = Get-Date -Format "yyyyMMdd_HHmm"
$ZipName = "petpoint_$Stamp.zip"
$ZipPath = Join-Path $ProjectDir $ZipName

function Write-Step($n, $total, $msg) {
    Write-Host ""
    Write-Host "  [$n/$total] $msg" -ForegroundColor Yellow
}
function Write-OK($msg)   { Write-Host "        OK:   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "        WARN: $msg" -ForegroundColor DarkYellow }
function Write-Err($msg)  { Write-Host "  ERROR: $msg"     -ForegroundColor Red }

# ---- Param validation -------------------------------------------
if ((-not $ZipOnly) -and (-not $SkipUpload) -and ($VpsIp -eq "")) {
    Write-Host ""
    Write-Host "  Usage: .\build_and_deploy.ps1 -VpsIp <your.vps.ip>" -ForegroundColor Cyan
    Write-Host "         .\build_and_deploy.ps1 -VpsIp <ip> -SkipBuild"
    Write-Host "         .\build_and_deploy.ps1 -ZipOnly    (package only, no upload)"
    Write-Host ""
    exit 1
}

$totalSteps = if ($ZipOnly -or $SkipUpload) { 2 } else { 4 }

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    PetPoint Pro -- Build and Deploy"          -ForegroundColor Cyan
Write-Host "    Zip name : $ZipName"                       -ForegroundColor Cyan
if ($VpsIp) {
    Write-Host "    Target   : ${VpsUser}@${VpsIp}:${AppDir}" -ForegroundColor Cyan
}
Write-Host "  ============================================" -ForegroundColor Cyan

Set-Location $ProjectDir

# ================================================================
#  STEP 1: BUILD
# ================================================================
Write-Step 1 $totalSteps "Building application..."

if ($SkipBuild) {
    if (-not (Test-Path (Join-Path $ProjectDir "dist\index.cjs"))) {
        Write-Err "dist\index.cjs not found. Cannot skip build on missing dist/."
        Write-Host "         Run without -SkipBuild first." -ForegroundColor Yellow
        exit 1
    }
    Write-Warn "Build skipped (-SkipBuild). Using existing dist/."
} else {
    Write-Host "        Running: npm run build" -ForegroundColor DarkGray
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Build failed (exit $LASTEXITCODE). Deployment aborted."
        exit 1
    }
    Write-OK "Build successful"
}

# ================================================================
#  STEP 2: PACKAGE ZIP (date-stamped, conflict-free)
# ================================================================
Write-Step 2 $totalSteps "Packaging: $ZipName ..."

# Remove any zip with the exact same name (shouldn't happen given minute precision,
# but guard anyway)
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
    Write-Warn "Removed existing $ZipName (same-minute rebuild)"
}

# Remove stale petpoint_*.zip files older than 7 days to keep the folder clean
$cutoff = (Get-Date).AddDays(-7)
Get-ChildItem -Path $ProjectDir -Filter "petpoint_*.zip" |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Warn "Removed old zip: $($_.Name)"
    }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$stream  = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-FileEntry {
    param($arch, $fullPath, $entryName)
    $entry       = $arch.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileStream  = [System.IO.File]::OpenRead($fullPath)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
}

function Add-DirToArchive {
    param($arch, $sourceDir, $prefix)
    if (-not (Test-Path $sourceDir)) {
        Write-Warn "Directory not found, skipping: $sourceDir"
        return
    }
    Get-ChildItem -Recurse -File $sourceDir | ForEach-Object {
        $rel       = $_.FullName.Substring($sourceDir.Length).TrimStart("\").Replace("\", "/")
        $entryName = $prefix + $rel
        Add-FileEntry -arch $arch -fullPath $_.FullName -entryName $entryName
    }
}

# Core code directories
Add-DirToArchive -arch $archive -sourceDir (Join-Path $ProjectDir "dist")   -prefix "dist/"
Write-OK "dist/ packed"

Add-DirToArchive -arch $archive -sourceDir (Join-Path $ProjectDir "shared") -prefix "shared/"
Write-OK "shared/ packed"

# Individual config / runtime files
$singles = @(
    "package.json",
    "package-lock.json",
    "ecosystem.config.cjs",
    "vps_update.sh"          # server-side update script (runs on VPS)
)
foreach ($name in $singles) {
    $fullPath = Join-Path $ProjectDir $name
    if (Test-Path $fullPath) {
        Add-FileEntry -arch $archive -fullPath $fullPath -entryName $name
        Write-OK "$name packed"
    } else {
        Write-Warn "$name not found -- skipped"
    }
}

$archive.Dispose()
$stream.Close()

# ---- Verify zip contents ----------------------------------------
$zipCheck  = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
$hasServer = ($zipCheck.Entries | Where-Object { $_.FullName -eq "dist/index.cjs" })  -ne $null
$hasClient = ($zipCheck.Entries | Where-Object { $_.FullName -like "dist/public/*" }) -ne $null
$hasSchema = ($zipCheck.Entries | Where-Object { $_.FullName -eq "shared/schema.ts" }) -ne $null
$hasScript = ($zipCheck.Entries | Where-Object { $_.FullName -eq "vps_update.sh" })   -ne $null
$zipCheck.Dispose()

$sizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "        Verification:" -ForegroundColor DarkGray
if ($hasServer) { Write-OK "dist/index.cjs    -- server bundle" }
else            { Write-Err "dist/index.cjs MISSING -- aborting"; Remove-Item $ZipPath -Force; exit 1 }
if ($hasClient) { Write-OK "dist/public/      -- client bundle" }
else            { Write-Warn "dist/public/ not found in zip" }
if ($hasSchema) { Write-OK "shared/schema.ts  -- schema types"  }
else            { Write-Warn "shared/schema.ts not found" }
if ($hasScript) { Write-OK "vps_update.sh     -- deploy script" }
else            { Write-Warn "vps_update.sh not found in zip" }
Write-OK "Total size: $sizeMB MB"
Write-OK "Saved as  : $ZipPath"

# ---- List all petpoint_*.zip files in project dir ---------------
Write-Host ""
Write-Host "        All build zips in project folder:" -ForegroundColor DarkGray
Get-ChildItem -Path $ProjectDir -Filter "petpoint_*.zip" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10 |
    ForEach-Object {
        $mb  = [math]::Round($_.Length / 1MB, 2)
        $tag = if ($_.Name -eq $ZipName) { " <-- THIS BUILD" } else { "" }
        Write-Host "          $($_.Name)  ($mb MB)$tag" -ForegroundColor DarkGray
    }

if ($ZipOnly -or $SkipUpload) {
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "    Zip ready -- upload manually:"             -ForegroundColor Green
    Write-Host ""
    Write-Host "    scp `"$ZipPath`" root@<vps-ip>:~/"        -ForegroundColor White
    Write-Host "    ssh root@<vps-ip> 'bash ~/vps_update.sh'" -ForegroundColor White
    Write-Host ""
    Write-Host "    (The VPS script auto-picks the newest zip)" -ForegroundColor DarkGray
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host ""
    exit 0
}

# ================================================================
#  STEP 3: UPLOAD TO VPS
# ================================================================
Write-Step 3 $totalSteps "Uploading $ZipName to ${VpsUser}@${VpsIp} ..."

scp $ZipPath "${VpsUser}@${VpsIp}:~/"
if ($LASTEXITCODE -ne 0) {
    Write-Err "Upload failed. Check VPS IP and SSH key."
    exit 1
}
Write-OK "Upload complete"

# ================================================================
#  STEP 4: RUN UPDATE ON VPS
# ================================================================
Write-Step 4 $totalSteps "Running update on VPS..."
Write-Host "        Connecting to ${VpsUser}@${VpsIp} ..." -ForegroundColor DarkGray
Write-Host ""

# The VPS script auto-selects the newest petpoint_*.zip, so no args needed
ssh "${VpsUser}@${VpsIp}" "chmod +x ~/vps_update.sh && bash ~/vps_update.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Err "Remote update script exited with error."
    Write-Host "         Check logs: ssh ${VpsUser}@${VpsIp} 'pm2 logs vet-clinic-app --lines 30'"
    exit 1
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "    Deployment complete!"                       -ForegroundColor Green
Write-Host "    Build: $ZipName"                           -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "    Live logs : ssh ${VpsUser}@${VpsIp} 'pm2 logs vet-clinic-app --lines 20'" -ForegroundColor DarkGray
Write-Host "    Status    : ssh ${VpsUser}@${VpsIp} 'pm2 status'"                         -ForegroundColor DarkGray
Write-Host ""

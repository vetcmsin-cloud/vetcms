$ErrorActionPreference = "Stop"

$projectRoot = "c:\Users\HOME\Desktop\Vetinary Clinic Management"
$zipOut = Join-Path $projectRoot "deploy_vps.zip"

Write-Host ""
Write-Host "=== PetPoint Pro - Deployment Packager ===" -ForegroundColor Cyan
Write-Host ""

# Remove old zip
if (Test-Path $zipOut) {
    Remove-Item $zipOut -Force
    Write-Host "  Removed old deploy_vps.zip" -ForegroundColor Yellow
}

# Verify build exists
if (-not (Test-Path (Join-Path $projectRoot "dist\index.cjs"))) {
    Write-Host "ERROR: dist\index.cjs not found! Run 'npm run build' first." -ForegroundColor Red
    exit 1
}
Write-Host "  dist/index.cjs found" -ForegroundColor Green

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

# Add dist/ directory
Write-Host "  Adding dist/ ..." -ForegroundColor DarkGreen
Add-DirToZip $archive (Join-Path $projectRoot "dist") "dist/"

# Add shared/ directory
Write-Host "  Adding shared/ ..." -ForegroundColor DarkGreen
Add-DirToZip $archive (Join-Path $projectRoot "shared") "shared/"

# Add single files
$singles = @("package.json", "package-lock.json", "ecosystem.config.cjs", "drizzle.config.ts")
foreach ($name in $singles) {
    $fullPath = Join-Path $projectRoot $name
    if (Test-Path $fullPath) {
        Write-Host "  Adding $name ..." -ForegroundColor DarkGreen
        Add-FileToZip $archive $fullPath $name
    }
}

$archive.Dispose()
$stream.Close()

# Verify
$zipCheck = [System.IO.Compression.ZipFile]::OpenRead($zipOut)
$distOk = ($zipCheck.Entries | Where-Object { $_.FullName -eq "dist/index.cjs" }) -ne $null
$sharedOk = ($zipCheck.Entries | Where-Object { $_.FullName -eq "shared/schema.ts" }) -ne $null
$zipCheck.Dispose()

$sizeMB = [math]::Round((Get-Item $zipOut).Length / 1MB, 2)
Write-Host ""
if ($distOk) { Write-Host "  dist/index.cjs   : OK" -ForegroundColor Green } else { Write-Host "  dist/index.cjs   : MISSING" -ForegroundColor Red }
if ($sharedOk) { Write-Host "  shared/schema.ts : OK" -ForegroundColor Green } else { Write-Host "  shared/schema.ts : MISSING" -ForegroundColor Red }
Write-Host ""
Write-Host "deploy_vps.zip created: $sizeMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "Upload commands:" -ForegroundColor Cyan
Write-Host "  scp `"c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy_vps.zip`" root@<vps-ip>:/root/"
Write-Host "  scp `"c:\Users\HOME\Desktop\Vetinary Clinic Management\deploy.sh`" root@<vps-ip>:/root/"
Write-Host ""

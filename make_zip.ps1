Set-Location 'c:\Users\SYSTEM1\Desktop\Vetinary Clinic Management'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$Stamp   = Get-Date -Format 'yyyyMMdd_HHmm'
$ZipName = "petpoint_$Stamp.zip"
$ZipPath = Join-Path (Get-Location) $ZipName
$Base    = (Get-Location).Path

Write-Host ""
Write-Host "  Creating: $ZipName" -ForegroundColor Cyan

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

$stream  = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)

function AddFile($arch, $full, $entry) {
    $e  = $arch.CreateEntry($entry, [System.IO.Compression.CompressionLevel]::Optimal)
    $es = $e.Open()
    $fs = [System.IO.File]::OpenRead($full)
    $fs.CopyTo($es); $fs.Close(); $es.Close()
}
function AddDir($arch, $dir, $prefix) {
    if (-not (Test-Path $dir)) { Write-Host "  SKIP (missing): $dir" -ForegroundColor Yellow; return }
    Get-ChildItem -Recurse -File $dir | ForEach-Object {
        $rel = $_.FullName.Substring($dir.Length).TrimStart('\').Replace('\','/')
        AddFile $arch $_.FullName ($prefix + $rel)
    }
}

AddDir  $archive (Join-Path $Base 'dist')   'dist/'
Write-Host "  OK: dist/ packed" -ForegroundColor Green
AddDir  $archive (Join-Path $Base 'shared') 'shared/'
Write-Host "  OK: shared/ packed" -ForegroundColor Green

foreach ($f in @('package.json','package-lock.json','ecosystem.config.cjs','vps_update.sh')) {
    $fp = Join-Path $Base $f
    if (Test-Path $fp) {
        AddFile $archive $fp $f
        Write-Host "  OK: $f packed" -ForegroundColor Green
    } else {
        Write-Host "  SKIP (missing): $f" -ForegroundColor Yellow
    }
}

$archive.Dispose()
$stream.Close()

$zc  = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
$ok  = ($zc.Entries | Where-Object { $_.FullName -eq 'dist/index.cjs' }) -ne $null
$zc.Dispose()
$mb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

Write-Host ""
if ($ok) {
    Write-Host "  READY: $ZipName ($mb MB)" -ForegroundColor Green
    Write-Host "  Path : $ZipPath"          -ForegroundColor Green
} else {
    Write-Host "  ERROR: dist/index.cjs missing from zip!" -ForegroundColor Red
    exit 1
}
Write-Host ""

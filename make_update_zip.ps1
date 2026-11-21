Add-Type -Assembly System.IO.Compression.FileSystem

$zipPath = [System.IO.Path]::GetFullPath('petpoint_update_appointment_id.zip')
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip  = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
$base = (Get-Location).Path

Get-ChildItem -Recurse -File -Path 'dist' | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
}

$pkgPath = Join-Path $base 'package.json'
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $pkgPath, 'package.json') | Out-Null

$zip.Dispose()

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "Done! Created: $zipPath ($sizeMB MB)"

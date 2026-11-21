Add-Type -Assembly System.IO.Compression.FileSystem

$zipPath = [System.IO.Path]::GetFullPath('petpoint_update_apr11_inventory_op_fix.zip')
if (Test-Path $zipPath) { Remove-Item $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
$base = (Get-Location).Path

# Add dist/ recursively with forward-slash paths
Get-ChildItem -Recurse -File -Path 'dist' | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
}

# Add package.json
$pkgPath = Join-Path $base 'package.json'
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $pkgPath, 'package.json') | Out-Null

$zip.Dispose()
Write-Host "Done! Created: $zipPath"

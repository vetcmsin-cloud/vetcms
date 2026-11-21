Add-Type -Assembly System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead('petpoint_update_zz_inventory_fix.zip')
Write-Host "Total entries: $($z.Entries.Count)"
$z.Entries | Where-Object { $_.FullName -match 'index' } | ForEach-Object { Write-Host $_.FullName }
Write-Host "Sample paths:"
$z.Entries | Select-Object -First 5 | ForEach-Object { Write-Host $_.FullName }
$z.Dispose()

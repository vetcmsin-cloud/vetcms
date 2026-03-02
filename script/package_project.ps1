$ErrorActionPreference = "Stop"

$zipFile = "deploy_package.zip"
$exclude = @(".git", "node_modules", "deploy_package.zip", ".env", ".DS_Store")

# Remove existing zip if it exists
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Get all items in the current directory, excluding the ones we don't want
$itemsToZip = Get-ChildItem -Path . | Where-Object { $exclude -notcontains $_.Name }

Write-Host "Zipping the following items:"
$itemsToZip | ForEach-Object { Write-Host " - $($_.Name)" }

# Compress
Compress-Archive -Path $itemsToZip.FullName -DestinationPath $zipFile -CompressionLevel Optimal

Write-Host "Successfully created $zipFile"

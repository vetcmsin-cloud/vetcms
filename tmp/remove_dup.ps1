$file = 'c:\Users\SYSTEM1\Desktop\Vetinary Clinic Management\client\src\components\NewInvoiceTerminal.tsx'
$lines = Get-Content $file -Encoding UTF8
$start = -1
$end   = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($start -eq -1 -and $lines[$i] -match 'Owner search logic') { $start = $i }
    if ($start -ge 0 -and $i -gt $start -and $lines[$i] -match 'mobileSearch, owners, allPets') { $end = $i; break }
}
if ($start -ge 0 -and $end -ge 0) {
    Write-Host "Removing lines $($start+1) to $($end+1)"
    $newLines = @()
    if ($start -gt 0) { $newLines += $lines[0..($start-1)] }
    $newLines += $lines[($end+1)..($lines.Count-1)]
    $newLines | Set-Content -Path $file -Encoding UTF8
    Write-Host "Done. Lines removed."
} else {
    Write-Host "Block not found: start=$start end=$end"
    for ($i = 560; $i -lt [Math]::Min(600, $lines.Count); $i++) {
        Write-Host "$($i+1): $($lines[$i])"
    }
}

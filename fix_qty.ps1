$file = "c:\Users\HOME\Desktop\Vetinary Clinic Management\client\src\components\NewInvoiceTerminal.tsx"
$content = [System.IO.File]::ReadAllText($file)

# Add onFocus to qty EditCell - select all on focus
$old = "                        onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}`r`n                      />`r`n                    </div>`r`n`r`n                    <div className=`"w-20 shrink-0"
$new = "                        onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}`r`n                        onFocus={e => e.target.select()}`r`n                      />`r`n                    </div>`r`n`r`n                    <div className=`"w-20 shrink-0"

# Only replace the FIRST occurrence (the qty cell, not rate or others)
$idx = $content.IndexOf($old)
if ($idx -ge 0) {
    $content = $content.Substring(0, $idx) + $new + $content.Substring($idx + $old.Length)
    [System.IO.File]::WriteAllText($file, $content)
    Write-Host "SUCCESS: Added onFocus to qty EditCell"
} else {
    Write-Host "ERROR: Target string not found"
}

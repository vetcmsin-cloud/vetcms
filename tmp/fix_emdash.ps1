$file = "client\src\components\document-designer\LabReportRenderer.tsx"
$raw = [System.IO.File]::ReadAllBytes($file)
$text = [System.Text.Encoding]::UTF8.GetString($raw)

# The garbled sequence is multi-byte UTF-8 em-dash that was double/triple encoded.
# We'll replace any fallback || "???" patterns using regex on the raw text.
# Target: replace   || "????"  with  || ""   where ??? is any non-ASCII run after ||

# Replace the garbled em-dash fallback with empty string fallback
# Pattern: the encoded bytes of the garbled string are E3 83 BD in some variant
# Simplest: replace any char sequence between the quotes that contains non-ASCII 
$fixed = [System.Text.RegularExpressions.Regex]::Replace($text, '\|\| "[^\x00-\x7F]+"', '|| ""')

# Also fix the val !== "???" check - replace with val !== ""
$fixed = [System.Text.RegularExpressions.Regex]::Replace($fixed, 'val !== "[^\x00-\x7F]+"', 'val !== ""')

[System.IO.File]::WriteAllText($file, $fixed, [System.Text.Encoding]::UTF8)
Write-Host "Done. Fixed garbled em-dash sequences."

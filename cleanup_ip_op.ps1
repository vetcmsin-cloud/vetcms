$path = "c:\Users\HOME\Desktop\Vetinary Clinic Management\client\src\pages\admin-billing.tsx"
$content = Get-Content $path -Raw

# 1. Update InvoiceWithMeta type
$content = $content -replace 'invoiceType\?:\s*string\s*\|\s*null;\s*//\s*''ip''\s*\|\s*''op''\s*\r?\n\s*opOwnerName\?:\s*string\s*\|\s*null;\s*//\s*OP\s*free-text\s*owner\s*\r?\n\s*opPetName\?:\s*string\s*\|\s*null;\s*//\s*OP\s*free-text\s*pet', ""

# 2. Update CreateInvoiceDialog states
$content = $content -replace '//\s*IP\s*/\s*OP\s*selector\s*\r?\n\s*const\s*\[invoiceType,\s*setInvoiceType\]\s*=\s*useState<"ip"\s*\|\s*"op">\("ip"\);\s*\r?\n\s*\r?\n\s*//\s*IP\s*fields', ""
$content = $content -replace '//\s*OP\s*fields\s*\r?\n\s*const\s*\[opOwnerName,\s*setOpOwnerName\]\s*=\s*useState\(""\);\s*\r?\n\s*const\s*\[opPetName,\s*setOpPetName\]\s*=\s*useState\(""\);', ""

# 3. Update resetForm
$content = $content -replace 'setInvoiceType\("ip"\);\s*\r?\n\s*', ""
$content = $content -replace 'setOpOwnerName\(""\);\s*\r?\n\s*setOpPetName\(""\);\s*\r?\n\s*', ""

# 4. Update mutationFn (simplify to IP body only, without the conditional)
$oldMutation = 'mutationFn: async \(\) => \{.+?const res = await apiRequest\("POST", "/api/invoices", body\);'
$newMutation = 'mutationFn: async () => {
      const body = {
        ownerId: parseInt(ownerId),
        petId: petId ? parseInt(petId) : null,
        date,
        status: "draft",
        subtotal: "0",
        tax: "0",
        discount: "0",
        total: "0",
        items: []
      };
      const res = await apiRequest("POST", "/api/invoices", body);'
$content = [regex]::Replace($content, $oldMutation, $newMutation, "Singleline")

# 5. Update canSubmit
$content = $content -replace 'const\s*canSubmit\s*=\s*invoiceType\s*===\s*"ip"\s*\?\s*\(ownerId\s*&&\s*date\)\s*:\s*\(opOwnerName\.trim\(\)\s*&&\s*date\);', 'const canSubmit = ownerId && date;'

# 6. Update CreateInvoiceDialog UI (Remove Toggle and OP fields)
$content = $content -replace '\{\/\*\s*IP\s*\/\s*OP\s*Selector\s*\*\/.*?\{\/\*\s*IP\s*Mode:\s*dropdowns\s*\*\/\}', ""
$content = $content -replace '\{invoiceType\s*===\s*"ip"\s*&&\s*\(', ""
$content = $content -replace '\s*\)\}', "" -replace '\{\/\*\s*OP\s*Mode:\s*free-text\s*inputs\s*\*\/\}', ""
# Need to be more careful with the closing parens of the IP Mode block.
# Actually, let's just replace the whole body of the DialogContent.

# 7. Update getPetInfo
$oldGetPetInfo = 'const getPetInfo = \(inv: InvoiceWithMeta\) => \{.+?return \{ petName: pet\?\.name \|\| "-", ownerName \};'
$newGetPetInfo = 'const getPetInfo = (inv: InvoiceWithMeta) => {
    const pet = inv.petId ? allPets?.find((p) => p.id === inv.petId) : null;
    const ownerName = getOwnerName(inv.ownerId);
    return { petName: pet?.name || "-", ownerName };'
$content = [regex]::Replace($content, $oldGetPetInfo, $newGetPetInfo, "Singleline")

# 8. Update ViewInvoiceDialog previewInvoiceData
$content = $content -replace 'const isOp = inv\.invoiceType === "op";', ""
$content = $content -replace 'patientName: isOp \? \(inv\.opPetName \|\| "-"\) : \(pet\?\.name \|\| inv\.patientName \|\| ""\)', 'patientName: pet?.name || inv.patientName || ""'
$content = $content -replace 'petName: isOp \? \(inv\.opPetName \|\| "-"\) : \(pet\?\.name \|\| inv\.petName \|\| ""\)', 'petName: pet?.name || inv.petName || ""'
$content = $content -replace 'ownerName: isOp \? \(inv\.opOwnerName \|\| "Outpatient"\) : \(ownerFullName \|\| inv\.ownerName \|\| ""\)', 'ownerName: ownerFullName || inv.ownerName || ""'

Set-Content $path $content -NoNewline

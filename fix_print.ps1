# Script to revert print preview and print method to the old approach
# This replaces:
# 1. getPrintStyles function (simpler CSS)
# 2. ViewInvoiceDialog (single-column scrollable, createPortal for print container)
# 3. Removes forcePreview prop
# 4. Fixes accounts.tsx usage

$file = "c:\Users\HOME\Desktop\Vetinary Clinic Management\client\src\pages\admin-billing.tsx"
$content = [System.IO.File]::ReadAllText($file)

# ─── 1. Replace getPrintStyles function ───────────────────────────────────────
$oldPrintStylesStart = 'function getPrintStyles(printerType: string) {'
$oldPrintStylesEnd = "  }`;" + "`n" + "  }" + "`n" + "}" # end of the switch/function

# Find the start and end positions
$startIdx = $content.IndexOf('function getPrintStyles(printerType: string) {')
$endIdx = $content.IndexOf("function buildUpiUrl(")

if ($startIdx -lt 0 -or $endIdx -lt 0) {
    Write-Error "Could not find getPrintStyles or buildUpiUrl markers"
    exit 1
}

$newPrintStyles = @'
function getPrintStyles(printerType: string) {
  switch (printerType) {
    case "thermal_58mm":
      return `
        @media print {
          @page { size: 58mm auto; margin: 2mm; }
          body { margin: 0; padding: 0; visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-invoice-container { 
            visibility: visible; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 58mm;
          }
          #printable-invoice-container * { visibility: visible; }
          .invoice-container { padding: 2mm !important; box-shadow: none !important; }
          .invoice-container h2 { font-size: 12px !important; }
          .invoice-container table { font-size: 9px !important; }
          .invoice-qr { width: 60px !important; height: 60px !important; }
        }
      `;
    case "thermal_80mm":
      return `
        @media print {
          @page { size: 80mm auto; margin: 3mm; }
          body { margin: 0; padding: 0; visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-invoice-container { 
            visibility: visible; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 80mm;
          }
          #printable-invoice-container * { visibility: visible; }
          .invoice-container { padding: 3mm !important; box-shadow: none !important; }
          .invoice-container h2 { font-size: 13px !important; }
          .invoice-container table { font-size: 10px !important; }
          .invoice-qr { width: 80px !important; height: 80px !important; }
        }
      `;
    case "a5":
      return `
        @media print {
          @page { size: A5 portrait; margin: 0mm; }
          body { margin: 0; padding: 0; visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-invoice-container {
            visibility: visible;
            position: fixed;
            left: 0;
            top: 0;
            width: 148mm !important;
            height: 210mm !important;
            margin: 0;
            padding: 0;
            background: white;
            z-index: 9999;
            overflow: hidden !important;
            transform-origin: top left;
          }
          #printable-invoice-container > div {
            width: 559px !important;
            height: 794px !important;
            transform: scale(calc(148mm / 559px));
            transform-origin: top left;
          }
          #printable-invoice-container * { visibility: visible; }
        }
      `;
    case "a5_landscape":
      return `
        @media print {
          @page { size: A5 landscape; margin: 0; }
          body { visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-invoice-container { 
            visibility: visible; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 794px !important;
            min-height: 559px !important;
            height: auto !important;
            margin: 0;
            padding: 0;
            background: white;
            z-index: 9999;
            overflow: visible !important;
          }
          #printable-invoice-container * { visibility: visible; }
        }
      `;
    default:
      return `
        @media print {
          @page { size: A4; margin: 0; }
          body { visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          
          /* Show the invoice print container */
          #printable-invoice-container {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 794px !important;
            min-height: 1123px !important;
            height: auto !important;
            margin: 0;
            padding: 0;
            background: white;
            z-index: 9999;
            overflow: visible !important;
          }
          
          #printable-invoice-container * {
            visibility: visible;
          }
        }
      `;
  }
}

'@

$content = $content.Substring(0, $startIdx) + $newPrintStyles + $content.Substring($endIdx)

Write-Host "Step 1 done: getPrintStyles replaced"

# ─── 2. Replace ViewInvoiceDialog function signature and body ─────────────────
# Remove forcePreview from the function signature
$content = $content -replace 'forcePreview = false,\r?\n', ''
$content = $content -replace '  forcePreview\?: boolean;\r?\n', ''

Write-Host "Step 2a done: forcePreview prop removed from signature"

# Remove the forcePreview-dependent logic in the init state
$content = $content -replace '\!forcePreview\)', 'true)'
$content = $content -replace 'const \[isEditing, setIsEditing\] = useState\(!forcePreview\);', 'const [isEditing, setIsEditing] = useState(false);'

Write-Host "Step 2b done: isEditing init fixed"

# Fix the useEffect that checks forcePreview
$content = $content -replace 'if \(!forcePreview && fullInvoice\.status === "draft" && isCreator\) \{', 'if ((fullInvoice.status === "draft" && isCreator)) {'
$content = $content -replace '\} else if \(forcePreview\) \{\r?\n\s+setIsEditing\(false\);\r?\n\s+\}', '} else {' + "`r`n" + '        setIsEditing(false);' + "`r`n" + '      }'
$content = $content -replace ', forcePreview\]', ']'

Write-Host "Step 2c done: useEffect forcePreview logic removed"

# ─── 3. Replace the Dialog Content (the entire render section) ────────────────
# Replace the complex split-pane dialog with the old single-column scrollable one

# Find the return statement of ViewInvoiceDialog
$returnStart = $content.IndexOf('  return (' + "`r`n" + '    <Dialog open={open} onOpenChange={onOpenChange}>' + "`r`n" + '      <DialogContent hideClose')
if ($returnStart -lt 0) {
    $returnStart = $content.IndexOf('  return (' + "`n" + '    <Dialog open={open} onOpenChange={onOpenChange}>' + "`n" + '      <DialogContent hideClose')
}

# Find the end of ViewInvoiceDialog (the closing of the export function)
$returnEnd = $content.IndexOf('// ─── Delete Confirm Dialog')
if ($returnEnd -lt 0) {
    $returnEnd = $content.IndexOf('// --- Delete Confirm Dialog')
}

if ($returnStart -lt 0 -or $returnEnd -lt 0) {
    Write-Host "WARNING: Could not find ViewInvoiceDialog return block markers. startIdx=$returnStart endIdx=$returnEnd"
    Write-Host "Trying alternate markers..."
    
    # Try finding it by the isA5 variables which come just before return
    $isA5Pos = $content.IndexOf('const isA5 = clinicSettings?.printerType')
    if ($isA5Pos -gt 0) {
        # Go back to find the start of the return statement
        $returnStart = $content.IndexOf('  return (', $isA5Pos)
    }
}

if ($returnStart -gt 0 -and $returnEnd -gt 0) {
    # Build the old-style return block
    $oldReturn = @'

  const isA5 = clinicSettings?.printerType === "a5";
  const previewWidthClass = isA5 ? "w-[559px]" : "w-[794px]";
  const previewHeightClass = isA5 ? "min-h-[794px]" : "min-h-[1123px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-full">
        <style>{getPrintStyles(clinicSettings?.printerType || "a4")}</style>

        {/* Render the printable version in a portal to escape the Dialog constraints */}
        {createPortal(
          <div id="printable-invoice-container" className="hidden print:block">
            <InvoiceRenderer
              settings={previewSettings}
              invoice={previewInvoiceData}
              layout={invoiceLayout}
              className="w-full h-full"
            />
          </div>,
          document.body
        )}

        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center flex-wrap gap-2">
            Invoice #{inv.invoiceNumber}
            <Badge variant={statusBadgeVariant(inv.status)}>
              {statusLabel(inv.status)}
            </Badge>
            {inv.forwardedTo && (
              <Badge variant="outline">
                Forwarded to: {inv.forwardedTo}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap items-center">
          {isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => updateInvoiceMutation.mutate(false)}
                disabled={updateInvoiceMutation.isPending}
              >
                {inv.status === 'forwarded' ? 'Save Changes' : (inv.status === 'pending' ? 'Revert to Draft' : 'Save Draft')}
              </Button>
              <Button
                onClick={() => updateInvoiceMutation.mutate(true)}
                disabled={updateInvoiceMutation.isPending || !canSave}
              >
                {inv.status === 'forwarded' ? 'Finalize & Send' : (inv.status === 'pending' ? 'Update Invoice' : 'Save & Create Invoice')}
              </Button>
            </>
          )}
          {!isEditing && canTriggerEdit && (
            <Button onClick={() => setIsEditing(true)}>
              {inv.status === 'draft' ? 'Edit Draft' : 'Edit Invoice'}
            </Button>
          )}
          {!isEditing && inv.status === 'pending' && (
            <>
              <Button
                variant="outline"
                onClick={() => statusMutation.mutate({ status: "forwarded", forwardedTo: "Pharmacy" })}
                disabled={statusMutation.isPending}
              >
                <Forward className="w-4 h-4 mr-2" />
                To Pharmacy
              </Button>
              <Button
                variant="outline"
                onClick={() => statusMutation.mutate({ status: "forwarded", forwardedTo: "Cash" })}
                disabled={statusMutation.isPending}
              >
                <Forward className="w-4 h-4 mr-2" />
                To Cash
              </Button>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Controls / Actions */}
            <div className="w-full flex flex-col gap-6">

              {/* Edit Mode: Items Editor */}
              {isEditing && (
                <Card className="border-dashed border-2">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Invoice Items (Draft)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="flex flex-col gap-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-2 rounded-md border bg-muted/40">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Select
                                value={item.feeId ? String(item.feeId) : "manual"}
                                onValueChange={(v) => selectFee(idx, v)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Fee/Service" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manual">Manual Entry</SelectItem>
                                  {fees?.filter((f) => f.isActive === "true").map((f) => (
                                    <SelectItem key={f.id} value={String(f.id)}>
                                      {f.name} - {formatCurrency(f.amount)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Desc"
                              value={item.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              className="col-span-1 h-8 text-xs"
                            />
                            <Input
                              type="number" min={1} placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="number" placeholder="Price"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
                        <Plus className="w-3 h-3 mr-1" /> Add Item
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <Label className="text-xs">Tax %</Label>
                        <Input type="number" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs">Discount</Label>
                        <Input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} className="h-8" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="h-20 text-xs" placeholder="Add notes..." />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Read-Only / Actions Panel */}
              {!isEditing && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status Actions */}
                    <div className="flex flex-wrap gap-2">
                      {(inv.status === "pending" || inv.status === "forwarded") && (
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => onMarkPaid(inv as InvoiceWithMeta)}
                        >
                          Mark as Paid
                        </Button>
                      )}
                      {inv.status === "paid" && (
                        <div className="p-2 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-md text-center w-full text-sm font-medium">
                          ✔ Payment Received{inv.paymentMethod ? ` · ${inv.paymentMethod.charAt(0).toUpperCase() + inv.paymentMethod.slice(1)}` : ""}
                        </div>
                      )}
                    </div>

                    {/* Print / Share */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => {
                        const element = document.getElementById("invoice-preview-content");
                        if (!element) return;
                        const fileName = `Invoice_${inv.invoiceNumber}.pdf`;
                        html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
                          const imgData = canvas.toDataURL("image/png");
                          const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
                          const imgProps = pdf.getImageProperties(imgData);
                          const pdfWidth = pdf.internal.pageSize.getWidth();
                          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                          pdf.save(fileName);
                        });
                      }}>
                        <Share2 className="w-4 h-4 mr-2" /> Share
                      </Button>
                      <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Live Preview */}
            <div className="w-full flex justify-center bg-muted/20 p-4 rounded-md overflow-x-auto print:bg-white print:p-0 print:overflow-visible relative">
              <div className="flex flex-col max-w-full">
                <div className="mb-2 flex justify-between items-center print:hidden text-center justify-center">
                  <Label className="text-muted-foreground w-full">Live Preview</Label>
                </div>
                <div id="invoice-preview-content" className={`origin-top transition-transform transform-gpu print:scale-100 print:transform-none ${previewWidthClass} mx-auto`}>
                  <InvoiceRenderer
                    settings={previewSettings}
                    invoice={previewInvoiceData}
                    layout={invoiceLayout}
                    className={`shadow-md bg-white ${previewWidthClass} ${previewHeightClass} print:shadow-none print:w-full print:max-w-none print:min-h-0`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'@

    # We need to find the exact range. Let's find the isA5 line and go from there
    $isA5Pos = $content.IndexOf('  const isA5 = clinicSettings?.printerType')
    if ($isA5Pos -gt 0) {
        # Find the "return (" that follows
        # But first let's also capture the isA5Landscape line
        $content = $content.Substring(0, $isA5Pos) + $oldReturn + $content.Substring($returnEnd)
        Write-Host "Step 3 done: ViewInvoiceDialog return block replaced"
    } else {
        Write-Host "WARNING: Could not find isA5 position"
    }
}

# ─── 4. Remove viewInvoiceMode state and forcePreview from AdminBilling ──────
$content = $content -replace '  const \[viewInvoiceMode, setViewInvoiceMode\] = useState<"view" \| "edit">\("edit"\);\r?\n', ''
$content = $content -replace 'setViewInvoiceMode\("edit"\); ', ''
$content = $content -replace '\r?\n\s+setViewInvoiceMode\("view"\);', ''
$content = $content -replace '\r?\n\s+forcePreview=\{viewInvoiceMode === "view"\}', ''

Write-Host "Step 4 done: viewInvoiceMode removed from AdminBilling"

# ─── 5. Fix accounts.tsx ─────────────────────────────────────────────────────
$accountsFile = "c:\Users\HOME\Desktop\Vetinary Clinic Management\client\src\pages\accounts.tsx"
$accountsContent = [System.IO.File]::ReadAllText($accountsFile)
# Remove forcePreview prop if it exists in accounts.tsx
$accountsContent = $accountsContent -replace '\r?\n\s+forcePreview=\{[^}]*\}', ''
[System.IO.File]::WriteAllText($accountsFile, $accountsContent)
Write-Host "Step 5 done: accounts.tsx fixed"

# Save the file
[System.IO.File]::WriteAllText($file, $content)
Write-Host "All done! File saved."
Write-Host "File size: $($content.Length) chars"

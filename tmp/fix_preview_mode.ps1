$path = "client/src/pages/admin-billing.tsx"
$content = Get-Content -Path $path -Raw
$targetText = '                        <div className="flex flex-col gap-4">
                           <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/40 border-b pb-2 flex items-center gap-2">
                             <Settings2 className="w-3 h-3" /> Commands & Operations
                           </h4>'
$newText = '                        {!forcePreview && (
                           <div className="flex flex-col gap-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/40 border-b pb-2 flex items-center gap-2">
                                <Settings2 className="w-3 h-3" /> Commands & Operations
                              </h4>'

if ($content.Contains($targetText)) {
    $content = $content.Replace($targetText, $newText)
    # Add closing tag (this one is tricky to find precisely, so I will find a nearby anchor)
    $closingAnchor = '                           </div>
                        </div>
                     </div>
                  )}'
    $newClosing = '                           </div>
                        </div>
                     )}
                     {forcePreview && (
                        <div className="flex items-center justify-center gap-4 pt-4 border-t border-dashed mt-4">
                           <Button variant="outline" className="h-14 px-10 font-black rounded-2xl border-primary/10 hover:border-primary/30 transition-all shadow-sm" onClick={() => window.print()}>
                              <Printer className="w-5 h-5 mr-3" /> PRINT INVOICE
                           </Button>
                           <Button variant="outline" className="h-14 px-10 font-black rounded-2xl border-blue-500/10 text-blue-600 hover:bg-blue-50 transition-all shadow-sm" onClick={() => {
                                const element = document.getElementById("printable-invoice-container");
                                if (!element) return;
                                html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
                                   const imgData = canvas.toDataURL("image/png");
                                   const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
                                   const imgProps = pdf.getImageProperties(imgData);
                                   const pdfWidth = pdf.internal.pageSize.getWidth();
                                   const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                                   pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                                   pdf.save(`Invoice_${inv.invoiceNumber}.pdf`);
                                });
                           }}>
                              <CreditCard className="w-5 h-5 mr-3" /> EXPORT PDF
                           </Button>
                           <Button variant="default" className="h-14 px-20 font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-transform uppercase tracking-widest" onClick={() => onOpenChange(false)}>
                              Close Preview
                           </Button>
                        </div>
                     )}
                  </div>
               )}'
    $content = $content.Replace($closingAnchor, $newClosing)
    Set-Content -Path $path -Value $content -Encoding UTF8
    Write-Host "File updated successfully."
} else {
    Write-Error "Could not find target block for replacement."
}

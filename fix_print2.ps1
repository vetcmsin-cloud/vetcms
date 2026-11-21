# Restore the working copy from before and then surgically fix ONLY the print method
# Step 1: We need to reconstruct the newer working version with old print method
# The git HEAD version already has the old print method we want
# We need to add back: OP/IP, inventory catalog, export type, cn import, etc.

$file = "c:\Users\HOME\Desktop\Vetinary Clinic Management\client\src\pages\admin-billing.tsx"
$content = [System.IO.File]::ReadAllText($file)

# ─── 1. Fix imports ──────────────────────────────────────────────────────────
# Add cn import
$content = $content.Replace(
    'import { createPortal } from "react-dom";',
    "import { createPortal } from `"react-dom`";`r`nimport { cn } from `"@/lib/utils`";"
)

# Add ScrollArea import
$content = $content.Replace(
    'import { useToast } from "@/hooks/use-toast";',
    "import { ScrollArea, ScrollBar } from `"@/components/ui/scroll-area`";`r`nimport { Tabs, TabsContent, TabsList, TabsTrigger } from `"@/components/ui/tabs`";`r`nimport { useToast } from `"@/hooks/use-toast`";"
)

# Fix the schema import to include InventoryItem and InventoryCategory
$content = $content.Replace(
    'import type { Owner, Pet, FeeStructure } from "@shared/schema";',
    'import type { Owner, Pet, FeeStructure, InventoryItem, InventoryCategory } from "@shared/schema";'
)

# Export InvoiceWithMeta
$content = $content.Replace(
    'type InvoiceWithMeta = {',
    'export type InvoiceWithMeta = {'
)

Write-Host "Step 1 done: Imports fixed"

# ─── 2. Add OP/IP fields to InvoiceWithMeta type ─────────────────────────────
$content = $content.Replace(
    '  items?: InvoiceItemType[];' + "`r`n" + '};',
    '  items?: InvoiceItemType[];' + "`r`n" + '  invoiceType?: string | null;   // ''ip'' | ''op''' + "`r`n" + '  opOwnerName?: string | null;   // OP free-text owner' + "`r`n" + '  opPetName?: string | null;     // OP free-text pet' + "`r`n" + '};'
)

Write-Host "Step 2 done: OP/IP fields added to type"

# ─── 3. Add OP/IP to CreateInvoiceDialog ──────────────────────────────────────
# Replace the CreateInvoiceDialog to add IP/OP selector
$oldCreateStart = '  const [ownerId, setOwnerId] = useState<string>("");'
$newCreateState = @'
  // IP / OP selector
  const [invoiceType, setInvoiceType] = useState<"ip" | "op">("ip");

  // IP fields
  const [ownerId, setOwnerId] = useState<string>("");
'@
$content = $content.Replace($oldCreateStart, $newCreateState)

# Add OP fields state
$content = $content.Replace(
    '  const [petId, setPetId] = useState<string>("");' + "`r`n" + '  const [date, setDate] = useState(todayStr());',
    '  const [petId, setPetId] = useState<string>("");' + "`r`n" + "`r`n" + '  // OP fields' + "`r`n" + '  const [opOwnerName, setOpOwnerName] = useState("");' + "`r`n" + '  const [opPetName, setOpPetName] = useState("");' + "`r`n" + "`r`n" + '  const [date, setDate] = useState(todayStr());'
)

# Fix resetForm to include OP fields
$content = $content.Replace(
    '  const resetForm = () => {' + "`r`n" + '    setOwnerId("");' + "`r`n" + '    setPetId("");' + "`r`n" + '    setDate(todayStr());',
    '  const resetForm = () => {' + "`r`n" + '    setInvoiceType("ip");' + "`r`n" + '    setOwnerId("");' + "`r`n" + '    setPetId("");' + "`r`n" + '    setOpOwnerName("");' + "`r`n" + '    setOpPetName("");' + "`r`n" + '    setDate(todayStr());'
)

# Fix mutation to handle OP invoices
$content = $content.Replace(
    '    mutationFn: async () => {' + "`r`n" + '      const body = {' + "`r`n" + '        ownerId: parseInt(ownerId),',
    '    mutationFn: async () => {' + "`r`n" + '      const body = invoiceType === "ip"' + "`r`n" + '        ? {' + "`r`n" + '          invoiceType: "ip",' + "`r`n" + '          ownerId: parseInt(ownerId),'
)

$content = $content.Replace(
    '        petId: petId ? parseInt(petId) : null,' + "`r`n" + '        date,' + "`r`n" + '        status: "draft",' + "`r`n" + '        subtotal: "0",' + "`r`n" + '        tax: "0",' + "`r`n" + '        discount: "0",' + "`r`n" + '        total: "0",' + "`r`n" + '        items: []' + "`r`n" + '      };',
    '          petId: petId ? parseInt(petId) : null,' + "`r`n" + '          date,' + "`r`n" + '          status: "draft",' + "`r`n" + '          subtotal: "0",' + "`r`n" + '          tax: "0",' + "`r`n" + '          discount: "0",' + "`r`n" + '          total: "0",' + "`r`n" + '          items: []' + "`r`n" + '        }' + "`r`n" + '        : {' + "`r`n" + '          invoiceType: "op",' + "`r`n" + '          ownerId: 0,' + "`r`n" + '          petId: null,' + "`r`n" + '          opOwnerName: opOwnerName.trim(),' + "`r`n" + '          opPetName: opPetName.trim(),' + "`r`n" + '          date,' + "`r`n" + '          status: "draft",' + "`r`n" + '          subtotal: "0",' + "`r`n" + '          tax: "0",' + "`r`n" + '          discount: "0",' + "`r`n" + '          total: "0",' + "`r`n" + '          items: []' + "`r`n" + '        };'
)

# Fix canSubmit
$content = $content.Replace(
    '  const canSubmit = ownerId && date;',
    '  const canSubmit = invoiceType === "ip"' + "`r`n" + '    ? (ownerId && date)' + "`r`n" + '    : (opOwnerName.trim() && date);'
)

Write-Host "Step 3 done: OP/IP in CreateInvoiceDialog"

# ─── 4. Fix ViewInvoiceDialog to handle OP invoices ──────────────────────────
# Add isOp variable and handle OP in previewInvoiceData
$content = $content.Replace(
    '  const baseInv = fullInvoice || invoice;',
    '  const baseInv = fullInvoice || invoice;' + "`r`n" + '  const isOp = baseInv.invoiceType === "op";'
)

# Add OP handling in previewInvoiceData
$content = $content.Replace(
    '    const isOp = inv.invoiceType === "op";' + "`r`n" + "`r`n" + '    inv = {' + "`r`n" + '      ...inv,',
    '    const isOp = inv.invoiceType === "op";' + "`r`n" + "`r`n" + '    inv = {' + "`r`n" + '      ...inv,'
)

Write-Host "Step 4 done: OP handling in ViewInvoiceDialog"

# ─── 5. Add A5 landscape support ─────────────────────────────────────────────
$content = $content.Replace(
    '  const isA5 = clinicSettings?.printerType === "a5";' + "`r`n" + '  const previewWidthClass = isA5 ? "w-[559px]" : "w-[794px]";' + "`r`n" + '  const previewHeightClass = isA5 ? "min-h-[794px]" : "min-h-[1123px]";',
    '  const isA5 = clinicSettings?.printerType === "a5" || clinicSettings?.printerType === "a5_portrait";' + "`r`n" + '  const isA5Landscape = clinicSettings?.printerType === "a5_landscape";' + "`r`n" + '  const previewWidthClass = isA5Landscape ? "w-[794px]" : (isA5 ? "w-[559px]" : "w-[794px]");' + "`r`n" + '  const previewHeightClass = isA5Landscape ? "min-h-[559px]" : (isA5 ? "min-h-[794px]" : "min-h-[1123px]");'
)

Write-Host "Step 5 done: A5 landscape support"

# ─── 6. Export ViewInvoiceDialog ─────────────────────────────────────────────
$content = $content.Replace(
    'function ViewInvoiceDialog({',
    'export function ViewInvoiceDialog({'
)

Write-Host "Step 6 done: Export ViewInvoiceDialog"

# ─── Save ─────────────────────────────────────────────────────────────────────
[System.IO.File]::WriteAllText($file, $content)
Write-Host "All done! File saved."
Write-Host "File size: $($content.Length) chars"

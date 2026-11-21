import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  X, Printer, CreditCard, Banknote, Smartphone, CheckSquare,
  GripVertical, RotateCcw, Trash2, AlertTriangle, Forward, Plus,
  Save, FileCheck, ChevronDown, Loader2, Eye, MessageCircle
} from "lucide-react";
import type { Owner, Pet, FeeStructure } from "@shared/schema";
import { InvoiceRenderer } from "@/components/invoice-designer/InvoiceRenderer";
import type { InvoiceSection } from "@/components/invoice-designer/types";
import { useReactToPrint } from "react-to-print";
import { generatePDFFromElement } from "@/lib/pdf-generator";
import { openWhatsAppLink } from "@/lib/utils";

export type InvoiceWithMeta = {
  id: number;
  invoiceNumber: string;
  status: string;
  date: string;
  dueDate: string;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  notes: string | null;
  paymentMethod: string | null;
  forwardedTo: string | null;
  ownerId: number;
  ownerName: string;
  ownerAddress?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  petId: number | null;
  petName: string | null;
  patientName?: string;
  petGender?: string;
  petAge?: number;
  petSpecies?: string;
  petBreed?: string;
  createdByName: string;
  createdBy: number;
  billedByName?: string;
  createdAt?: string;
  // Out-Patient fields
  invoiceType?: string | null;
  opOwnerName?: string | null;
  opPetName?: string | null;
  items: Array<{
    id: number;
    feeId: number | null;
    productCode: string | null;
    description: string;
    quantity: number;
    unitPrice: string;
    total?: string;
  }>;
};


export function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function statusLabel(status: string) {
  switch (status) {
    case "paid": return "Paid";
    case "pending": return "Pending";
    case "forwarded": return "Forwarded";
    case "cancelled": return "Cancelled";
    case "draft": return "Draft";
    default: return status;
  }
}

export function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "paid": return "default";
    case "pending": return "secondary";
    case "forwarded": return "outline";
    case "cancelled": return "destructive";
    case "draft": return "secondary";
    default: return "outline";
  }
}

interface LineItem {
  feeId: number | null;
  productCode: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
}

// ─── Status Badge Pills ─────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    forwarded: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return (
    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", colors[status] || "bg-muted text-muted-foreground border-border")}>
      {statusLabel(status)}
    </span>
  );
}

function parseOpOwner(raw: string | null | undefined) {
  if (!raw) return { name: "Walk-in", phone: "", address: "" };
  const parts = raw.split("|").map(s => s.trim());
  const name = parts[0] || "Walk-in";
  const phonePart = parts.find(p => p.startsWith("Ph:"));
  const addrPart  = parts.find(p => p.startsWith("Addr:"));
  return {
    name,
    phone: phonePart ? phonePart.replace("Ph:", "").trim() : "",
    address: addrPart ? addrPart.replace("Addr:", "").trim() : "",
  };
}

// ─── View Invoice Dialog ─────────────────────────────────────────────────────

export function ViewInvoiceDialog({
  invoice,
  owners,
  allPets,
  open,
  onOpenChange,
  onMarkPaid,
  onDeleteRequest,
  forcePreview = false,
  printDesignOverride,
  autoShare = false,
}: {
  invoice: InvoiceWithMeta;
  owners: Owner[];
  allPets: Pet[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMarkPaid: (inv: InvoiceWithMeta) => void;
  onDeleteRequest?: (inv: InvoiceWithMeta) => void;
  forcePreview?: boolean;
  printDesignOverride?: "print1" | "print2" | "print3";
  autoShare?: boolean;
}) {
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission("billing.edit", "billing.manage");
  const canDelete = hasPermission("billing.manage", "billing.delete");
  const isReceptionist = user?.role === "receptionist";

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrintAction = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${invoice?.invoiceNumber || 'Print'}`,
  });

  const [isSharingPdf, setIsSharingPdf] = useState(false);

  const handleWhatsAppPdf = async () => {
    if (!printRef.current) return;
    setIsSharingPdf(true);
    toast({ title: "Generating Invoice PDF...", description: "Please wait..." });
    try {
      const base64Pdf = await generatePDFFromElement("printable-invoice-renderer");

      const ownerPhone = invoice?.ownerPhone || "";
      const cleanPhone = ownerPhone.replace(/\D/g, "");
      const pdfFileName = cleanPhone
        ? `${cleanPhone}_inv_${invoice?.id}.pdf`
        : `Invoice_${invoice?.invoiceNumber || Date.now()}.pdf`;

      const ownerName = invoice?.ownerName || invoice?.opOwnerName || "Customer";
      const petName = invoice?.petName || invoice?.opPetName || "";
      const total = parseFloat(invoice?.total || "0").toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const mode = clinicSettings?.whatsappMode || "direct";
      const countryCode = clinicSettings?.whatsappCountryCode || "91";

      // ── Server-side auto-send: UltraMsg or Evolution API ──
      if (mode === "ultramsg" || mode === "evolution") {
        const caption = `Hello ${ownerName}! 🐾\n\nPlease find your invoice *${invoice?.invoiceNumber}*${petName ? ` for *${petName}*` : ""} attached.\n\n💰 *Total Amount: ₹${total}*\n\nThank you for visiting us! 🙏`;
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: ownerPhone,
            message: caption,
            document: base64Pdf,
            filename: pdfFileName,
          }),
        });
        const data: any = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || data.message || "Failed to send WhatsApp document");
        toast({ title: "✅ Invoice Sent!", description: `PDF invoice sent to ${ownerName} on WhatsApp.` });
        return;
      }

      // ── Direct / Custom mode: upload PDF → get short link ──
      const uploadRes = await fetch("/api/upload/base64-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: base64Pdf,
          filename: pdfFileName,
          ownerPhone: cleanPhone || null,
          petName: invoice?.petName || invoice?.opPetName || null,
          reportTitle: `Invoice ${invoice?.invoiceNumber}`,
        }),
      });
      if (!uploadRes.ok) throw new Error("Failed to generate invoice sharing link");
      const uploadData = await uploadRes.json();

      const reportPath = uploadData.url || (uploadData.token ? `/r/${uploadData.token}` : `/r/${pdfFileName}`);
      const fullUrl = `${window.location.origin}${reportPath}`;
      const msg = `Hello ${ownerName}! 🐾\n\nYour invoice *${invoice?.invoiceNumber}*${petName ? ` for *${petName}*` : ""} is ready.\n\n💰 *Total Amount: ₹${total}*\n\n🔗 *View & Download Invoice:* ${fullUrl}\n\nThank you for visiting us! 🙏`;

      // Convert base64 PDF to a Blob for clipboard + download
      const pdfBlob = base64Pdf.includes("base64,")
        ? await (await fetch(base64Pdf)).blob()
        : new Blob([Uint8Array.from(atob(base64Pdf.split("base64,")[1] || base64Pdf), c => c.charCodeAt(0))], { type: "application/pdf" });

      // ── Try to copy PDF to clipboard (WhatsApp Web supports Ctrl+V paste) ──
      let clipboardCopied = false;
      try {
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "application/pdf": pdfBlob }),
          ]);
          clipboardCopied = true;
        }
      } catch {
        // Clipboard API not supported or permission denied — fall back to download
      }

      // Always also trigger a download as a safety net
      const dlUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = pdfFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);

      toast({
        title: clipboardCopied ? "📋 PDF Copied — Opening WhatsApp" : "📎 PDF Downloaded — Opening WhatsApp",
        description: clipboardCopied
          ? "PDF copied to clipboard! When WhatsApp Web opens, press Ctrl+V in the chat to attach it instantly."
          : "PDF saved to Downloads. Open WhatsApp Web, click the 📎 attachment icon and select the file.",
        duration: 8000,
      });

      // Open WhatsApp Web / App with pre-filled message + link
      openWhatsAppLink(ownerPhone, msg, countryCode);
    } catch (err: any) {
      toast({ title: "Share Failed", description: err.message || "Could not share invoice.", variant: "destructive" });
    } finally {
      setIsSharingPdf(false);
    }
  };
  // Auto-trigger WhatsApp share when opened from the WHATSAPP PDF button (like lab sharing)
  useEffect(() => {
    if (autoShare && open) {
      // Wait for the invoice to render before capturing
      const timer = setTimeout(() => {
        handleWhatsAppPdf();
      }, 900);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShare, open]);

  const [fullInvoice, setFullInvoice] = useState<InvoiceWithMeta | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const { data: clinicSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/clinic-settings"] });
  const { data: fees } = useQuery<FeeStructure[]>({ queryKey: ["/api/fee-structures"] });

  useEffect(() => {
    if (open && invoice?.id) {
      setLoadingFull(true);
      apiRequest("GET", `/api/invoices/${invoice.id}`)
        .then(res => res.json())
        .then(data => setFullInvoice(data))
        .catch(err => console.error("Failed to load full invoice", err))
        .finally(() => setLoadingFull(false));
    }
  }, [open, invoice?.id]);

  const [items, setItems] = useState<LineItem[]>([]);
  const [taxPercent, setTaxPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async ({ status, forwardedTo }: { status: string; forwardedTo?: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, { status, forwardedTo });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      onOpenChange(false);
      toast({ title: "Invoice Updated", description: `Status changed to ${statusLabel(data.status)}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        items: items.map(it => ({
          feeId: it.feeId,
          productCode: it.productCode || null,
          description: it.description,
          quantity: it.quantity,
          unitPrice: parseFloat(it.unitPrice || "0").toFixed(2),
          total: (it.quantity * parseFloat(it.unitPrice || "0")).toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        tax: taxAmount.toFixed(2),
        discount: parseFloat(discountAmount || "0").toFixed(2),
        total: total.toFixed(2),
        notes: notes || null,
      };
      const res = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, body);
      if (!res.ok) throw new Error("Failed to save invoice");
      return res.json();
    },
    onSuccess: (data) => {
      setFullInvoice(data);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice Saved", description: "Changes have been saved." });
    },
    onError: (err: Error) => toast({ title: "Save Failed", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (fullInvoice) {
      setItems(fullInvoice.items?.map(i => ({ ...i })) || []);
      setNotes(fullInvoice.notes || "");
      setDiscountAmount(fullInvoice.discount || "0");
    }
  }, [fullInvoice]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setFullInvoice(null);
    }
  }, [open]);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * parseFloat(item.unitPrice || "0"), 0);
  const taxAmount = subtotal * (parseFloat(taxPercent || "0") / 100);
  const total = subtotal + taxAmount - parseFloat(discountAmount || "0");

  const addItem = () => setItems([...items, { feeId: null, productCode: "", description: "", quantity: 1, unitPrice: "0" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, u: Partial<LineItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...u } : it));

  const selectFee = (i: number, feeIdStr: string) => {
    if (feeIdStr === "manual") { updateItem(i, { feeId: null, description: "", unitPrice: "0" }); return; }
    const fee = fees?.find(f => f.id === parseInt(feeIdStr));
    if (fee) updateItem(i, { feeId: fee.id, productCode: fee.productCode || "", description: fee.name, unitPrice: String(fee.amount) });
  };

  const previewInvoiceData = useMemo(() => {
    if (!fullInvoice && !invoice) return null;
    const inv = fullInvoice || invoice;
    const op = inv.invoiceType === "op" ? parseOpOwner(inv.opOwnerName) : null;
    const owner = owners.find(o => o.id === inv.ownerId);
    const pet = inv.petId ? allPets.find(p => p.id === inv.petId) : null;

    return {
      ...inv,
      ownerAddress: owner?.address || inv.ownerAddress || op?.address || "",
      ownerPhone: owner?.phone || inv.ownerPhone || op?.phone || "",
      ownerEmail: owner?.email || inv.ownerEmail || "",
      patientName: pet?.name || inv.patientName || inv.petName || inv.opPetName || "",
      petSpecies: (pet as any)?.species || inv.petSpecies || "",
      petBreed: (pet as any)?.breed || inv.petBreed || "",
      petAge: (pet as any)?.age || inv.petAge,
      petGender: (pet as any)?.gender || inv.petGender || "",
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : (inv.ownerName || op?.name || ""),
      subtotal: subtotal.toFixed(2),
      tax: taxAmount.toFixed(2),
      discount: parseFloat(discountAmount || "0").toFixed(2),
      total: total.toFixed(2),
      items: items.map((it, i) => ({ ...it, id: i, total: (it.quantity * parseFloat(it.unitPrice)).toFixed(2) }))
    };
  }, [fullInvoice, invoice, items, subtotal, taxAmount, discountAmount, total, owners, allPets]);

  const invoiceLayout = useMemo(() => {
    if (!clinicSettings) return undefined;

    // Determine active print design (print1/print2/print3)
    // The active design is stored as 'activePrintDesign', falling back to 'print1'
    const activePrintDesign = printDesignOverride || clinicSettings.activePrintDesign || "print1";

    // Determine the printer type for the active design
    let pType = clinicSettings.printerType || "a4";
    if (activePrintDesign === "print2") pType = clinicSettings.printerType_print2 || clinicSettings.printerType || "a4";
    else if (activePrintDesign === "print3") pType = clinicSettings.printerType_print3 || clinicSettings.printerType || "a4";

    // Base layout key depends on print design
    let layoutKey = "invoiceLayout";
    if (activePrintDesign === "print2") layoutKey = "invoiceLayout_print2";
    else if (activePrintDesign === "print3") layoutKey = "invoiceLayout_print3";

    // Then apply A5 suffix if needed
    if (pType === "a5_landscape") layoutKey += "_a5_landscape";
    else if (pType.startsWith("a5")) layoutKey += "_a5";

    if (clinicSettings[layoutKey]) {
      try { return JSON.parse(clinicSettings[layoutKey]); } catch (e) { }
    }

    // Fallback: try without A5 suffix
    const baseKey = activePrintDesign === "print2" ? "invoiceLayout_print2"
      : activePrintDesign === "print3" ? "invoiceLayout_print3"
      : "invoiceLayout";
    if (clinicSettings[baseKey]) {
      try { return JSON.parse(clinicSettings[baseKey]); } catch (e) { }
    }

    // Final fallback: default invoiceLayout
    if (baseKey !== "invoiceLayout" && clinicSettings.invoiceLayout) {
      try { return JSON.parse(clinicSettings.invoiceLayout); } catch (e) { }
    }

    return undefined;
  }, [clinicSettings]);

  const previewSettings = { ...clinicSettings, activePrintDesign: printDesignOverride || clinicSettings?.activePrintDesign || "print1" };
  const activePrintDesign = printDesignOverride || clinicSettings?.activePrintDesign || "print1";
  const effectivePrinterType = activePrintDesign === "print2"
    ? (clinicSettings?.printerType_print2 || clinicSettings?.printerType || "a4")
    : activePrintDesign === "print3"
    ? (clinicSettings?.printerType_print3 || clinicSettings?.printerType || "a4")
    : (clinicSettings?.printerType || "a4");
  const isA5 = effectivePrinterType.startsWith("a5");
  const isA5Landscape = effectivePrinterType === "a5_landscape";

  const isPaid = invoice.status === "paid";
  const isDraft = invoice.status === "draft";
  const isPending = invoice.status === "pending";
  const isForwarded = invoice.status === "forwarded";
  const isCancelled = invoice.status === "cancelled";
  const canEditInvoice = canEdit && !isPaid && !isCancelled;

  if (!invoice) return null;

  const previewWidth = isA5Landscape ? 794 : (isA5 ? 559 : 794);
  const previewHeight = isA5Landscape ? 559 : (isA5 ? 794 : 1123);
  const previewScale = forcePreview
    ? (isA5Landscape ? 0.9 : 0.7)
    : (isA5Landscape ? 0.56 : 0.46);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className={cn(
        "max-h-[96vh] p-0 overflow-hidden flex flex-col gap-0",
        "print:static print:transform-none print:w-auto print:h-auto print:max-w-none print:max-h-none print:overflow-visible print:border-none print:shadow-none print:bg-transparent print:p-0 print:m-0",
        "max-w-4xl w-[98vw]"
      )}>

        {/* ── Top Bar ── */}
        <div className="flex border-b bg-zinc-50 dark:bg-zinc-900 px-5 py-3 items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base tracking-tight">{invoice.invoiceNumber}</span>
                <StatusPill status={invoice.status} />
                {invoice.forwardedTo && (
                  <span className="text-xs text-muted-foreground">→ {invoice.forwardedTo}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {new Date(invoice.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                {invoice.createdByName && ` · Billed by ${invoice.createdByName}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPending && (
               <>
                 <Button size="sm" variant="outline" className="h-8 text-xs px-3 border-sky-300 text-sky-700 hover:bg-sky-50" onClick={() => statusMutation.mutate({ status: "forwarded", forwardedTo: "Pharmacy" })} disabled={statusMutation.isPending}>
                   <Forward className="w-3.5 h-3.5 mr-1.5 text-sky-600" /> To Pharmacy
                 </Button>
                 <Button size="sm" variant="outline" className="h-8 text-xs px-3 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => statusMutation.mutate({ status: "forwarded", forwardedTo: "Cash" })} disabled={statusMutation.isPending}>
                   <Banknote className="w-3.5 h-3.5 mr-1.5 text-orange-600" /> To Cash
                 </Button>
               </>
            )}
            {(isPending || isForwarded || isDraft) && (
               <Button size="sm" onClick={() => onMarkPaid(invoice)} className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs font-bold shadow-sm px-4">
                 <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Collect Payment
               </Button>
            )}
            {canDelete && (isDraft || isPending) && (
               <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 h-8 text-xs border-destructive/30" onClick={() => { if (confirm(`Cancel invoice ${invoice.invoiceNumber}?`)) statusMutation.mutate({ status: "cancelled" }); }} disabled={statusMutation.isPending}>
                 <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Cancel
               </Button>
            )}
            {user?.role === "superadmin" && isPaid && onDeleteRequest && (
               <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 h-8 text-xs border-destructive/30" onClick={() => onDeleteRequest(invoice)}>
                 <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
               </Button>
            )}
            <Button size="sm" variant="default" className="h-8 text-xs px-4" onClick={() => handlePrintAction()} title="Print">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Invoice
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 font-bold"
              onClick={handleWhatsAppPdf}
              disabled={isSharingPdf}
              title="Share invoice PDF on WhatsApp"
            >
              {isSharingPdf
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <MessageCircle className="w-3.5 h-3.5 mr-1.5" />}
              {isSharingPdf ? "Preparing..." : "WhatsApp"}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Body: Left Panel + Right Preview ── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 relative print:overflow-visible print:block">

          {/* ════ LEFT PANEL ════ */}
          {false && (
            <ScrollArea className="w-full lg:w-[420px] xl:w-[500px] shrink-0 border-r print:hidden border-zinc-200">
              <div className="p-5 flex flex-col gap-5">

                {loadingFull ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* ── Summary Cards ── */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-xl border bg-white dark:bg-zinc-900 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Subtotal</span>
                        <span className="text-base font-mono font-bold text-foreground">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="p-3 rounded-xl border bg-white dark:bg-zinc-900 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Tax / Disc</span>
                        <span className="text-sm font-mono text-muted-foreground">
                          +₹{taxAmount.toFixed(0)} / -₹{parseFloat(discountAmount || "0").toFixed(0)}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border bg-primary/5 border-primary/20 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-primary tracking-wide">Total</span>
                        <span className="text-base font-mono font-black text-primary">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* ── Patient / Owner Info ── */}
                    <div className="rounded-xl border bg-muted/30 p-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Owner</p>
                        {invoice.invoiceType === "op" ? (
                          <>
                            <p className="font-semibold">{parseOpOwner(invoice.opOwnerName).name}</p>
                            <p className="text-muted-foreground text-xs">{parseOpOwner(invoice.opOwnerName).phone}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold">{invoice.ownerName}</p>
                            <p className="text-muted-foreground text-xs">{owners.find(o => o.id === invoice.ownerId)?.phone || ""}</p>
                          </>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Patient</p>
                        <p className="font-semibold">{invoice.invoiceType === "op" ? (invoice.opPetName || "—") : (invoice.petName || "—")}</p>
                        <p className="text-muted-foreground text-xs">{allPets.find(p => p.id === invoice.petId)?.species || ""}</p>
                      </div>
                    </div>

                    {/* ── Line Items ── */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Line Items</p>
                        {isEditing && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addItem}>
                            <Plus className="w-3 h-3 mr-1" /> Add Item
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {items.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                            No items. {isEditing ? "Click 'Add Item' to begin." : ""}
                          </div>
                        )}

                        {isEditing ? (
                          items.map((item, idx) => (
                            <div key={idx} className="border rounded-xl bg-white dark:bg-zinc-900 p-3 flex flex-col gap-2">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Select
                                    value={item.feeId ? String(item.feeId) : "manual"}
                                    onValueChange={v => selectFee(idx, v)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Select fee / service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="manual">Manual Entry</SelectItem>
                                      {fees?.filter(f => f.isActive === "true" || f.isActive === true as any).map(f => (
                                        <SelectItem key={f.id} value={String(f.id)}>
                                          {f.name} — ₹{parseFloat(String(f.amount)).toLocaleString("en-IN")}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0"
                                  onClick={() => removeItem(idx)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-6 gap-2">
                                <Input
                                  className="h-8 text-[10px] uppercase font-mono"
                                  placeholder="Code"
                                  value={item.productCode || ""}
                                  onChange={e => updateItem(idx, { productCode: e.target.value })}
                                />
                                <Input
                                  className="col-span-3 h-8 text-xs"
                                  placeholder="Description"
                                  value={item.description}
                                  onChange={e => updateItem(idx, { description: e.target.value })}
                                />
                                <Input
                                  className="h-8 text-xs"
                                  type="number"
                                  min={1}
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                                />
                                <Input
                                  className="h-8 text-xs"
                                  type="number"
                                  placeholder="Price"
                                  value={item.unitPrice}
                                  onChange={e => updateItem(idx, { unitPrice: e.target.value })}
                                />
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                Subtotal: <span className="font-semibold text-foreground">
                                  ₹{(item.quantity * parseFloat(item.unitPrice || "0")).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          /* Read-only items */
                          <div className="rounded-xl border overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/40 border-b">
                                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-20">Code</th>
                                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Description</th>
                                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground w-12">Qty</th>
                                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-24">Price</th>
                                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-24">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => (
                                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-3 py-2 font-mono text-muted-foreground">{item.productCode || "—"}</td>
                                    <td className="px-3 py-2 font-medium">{item.description}</td>
                                    <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                      ₹{parseFloat(item.unitPrice || "0").toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold">
                                      ₹{(item.quantity * parseFloat(item.unitPrice || "0")).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Tax / Discount / Notes (editing) ── */}
                    {isEditing && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Tax %</Label>
                          <Input
                            type="number"
                            value={taxPercent}
                            onChange={e => setTaxPercent(e.target.value)}
                            className="h-8 text-sm"
                            min={0}
                            max={100}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Discount (₹)</Label>
                          <Input
                            type="number"
                            value={discountAmount}
                            onChange={e => setDiscountAmount(e.target.value)}
                            className="h-8 text-sm"
                            min={0}
                          />
                        </div>
                        <div className="col-span-2 flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Notes</Label>
                          <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Notes / remarks..."
                            className="text-xs resize-none h-16"
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Totals Summary ── */}
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex flex-col gap-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-mono font-semibold">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                        </div>
                        {taxAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                            <span className="font-mono">₹{taxAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {parseFloat(discountAmount || "0") > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="font-mono text-rose-600">−₹{parseFloat(discountAmount || "0").toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 mt-1 border-t font-bold text-base">
                          <span>Total</span>
                          <span className="font-mono text-primary">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* ── Notes (read-only) ── */}
                    {!isEditing && notes && (
                      <div className="rounded-xl border bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Notes</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                      </div>
                    )}

                    {/* ── Action Buttons ── */}
                    <div className="flex flex-col gap-2">
                      {/* Collect Payment */}
                      {(isPending || isForwarded || isDraft) && (
                        <Button
                          className="w-full h-12 rounded-xl font-bold text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          onClick={() => onMarkPaid(invoice)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Collect Payment
                        </Button>
                      )}

                      {/* Forward Actions */}
                      {isPending && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="h-10 text-xs rounded-xl"
                            onClick={() => statusMutation.mutate({ status: "forwarded", forwardedTo: "Pharmacy" })}
                            disabled={statusMutation.isPending}
                          >
                            <Forward className="w-3.5 h-3.5 mr-1.5" />
                            To Pharmacy
                          </Button>
                          <Button
                            variant="outline"
                            className="h-10 text-xs rounded-xl"
                            onClick={() => statusMutation.mutate({ status: "forwarded", forwardedTo: "Cash" })}
                            disabled={statusMutation.isPending}
                          >
                            <Banknote className="w-3.5 h-3.5 mr-1.5" />
                            To Cash
                          </Button>
                        </div>
                      )}

                      {/* Cancel (for draft/pending only) */}
                      {canDelete && (isDraft || isPending) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl border-destructive/30"
                          onClick={() => {
                            if (confirm(`Cancel invoice ${invoice.invoiceNumber}?`)) {
                              statusMutation.mutate({ status: "cancelled" });
                            }
                          }}
                          disabled={statusMutation.isPending}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                          Cancel Invoice
                        </Button>
                      )}

                      {/* Delete (Paid, SuperAdmin only) */}
                      {user?.role === "superadmin" && isPaid && onDeleteRequest && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl border-destructive/30 mt-2"
                          onClick={() => onDeleteRequest!(invoice)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete Invoice
                        </Button>
                      )}

                      {/* Payment method display for paid */}
                      {isPaid && invoice.paymentMethod && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60">
                          {invoice.paymentMethod === "cash" && <Banknote className="w-4 h-4 text-emerald-600" />}
                          {invoice.paymentMethod === "upi" && <Smartphone className="w-4 h-4 text-emerald-600" />}
                          {invoice.paymentMethod === "card" && <CreditCard className="w-4 h-4 text-emerald-600" />}
                          {invoice.paymentMethod === "cheque" && <CheckSquare className="w-4 h-4 text-emerald-600" />}
                          <span className="text-sm font-semibold text-emerald-700 uppercase">
                            Paid via {invoice.paymentMethod}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          {/* ════ RIGHT PANEL: LIVE INVOICE PREVIEW / PRINT ONLY ════ */}
          <div className={cn(
            "flex-1 bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-start p-6 overflow-auto relative z-0 print:p-0 print:bg-white print:overflow-visible print:block"
          )}>
            <div
              ref={printRef}
              className="bg-white shadow-2xl origin-top print:!shadow-none print:!transform-none print:!m-0 print:!overflow-visible"
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: "top center",
                overflow: "hidden",
                flexShrink: 0,
                marginBottom: `${-(previewHeight * (1 - previewScale)) + 24}px` 
              }}
            >
              <div id="printable-invoice-renderer" className="w-full h-full">
                <InvoiceRenderer
                  settings={previewSettings as any}
                  invoice={previewInvoiceData}
                  layout={invoiceLayout}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark As Paid Dialog ─────────────────────────────────────────────────────

// ─── Invoice WhatsApp Sender (Lab-report style — no dialog needed) ───────────
/**
 * Mount once at the billing page level.
 * Call triggerInvoiceWhatsApp(invoice) from any row button.
 * It renders the invoice off-screen, generates a PDF, then sends it exactly
 * like lab-reports-tab does — via Evolution API / UltraMsg, or WhatsApp Web.
 */
export function InvoiceWhatsAppSender({
  invoice,
  owners,
  allPets,
  onDone,
}: {
  invoice: InvoiceWithMeta | null;
  owners: Owner[];
  allPets: Pet[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const { data: clinicSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/clinic-settings"] });

  // ── Step 1: Fetch FULL invoice (with all items) — same as ViewInvoiceDialog does ──
  const [fullInvoice, setFullInvoice] = useState<InvoiceWithMeta | null>(null);
  const [fullLoaded, setFullLoaded] = useState(false);

  useEffect(() => {
    if (!invoice?.id) return;
    setFullInvoice(null);
    setFullLoaded(false);
    apiRequest("GET", `/api/invoices/${invoice.id}`)
      .then(res => res.json())
      .then(data => { setFullInvoice(data); setFullLoaded(true); })
      .catch(() => { setFullLoaded(true); }); // fallback: use list-level invoice
  }, [invoice?.id]);

  const invoiceLayout = useMemo(() => {
    if (!clinicSettings) return undefined;
    const activePrintDesign = clinicSettings.activePrintDesign || "print1";
    let layoutKey = activePrintDesign === "print2" ? "invoiceLayout_print2"
      : activePrintDesign === "print3" ? "invoiceLayout_print3"
      : "invoiceLayout";
    const pType = clinicSettings.printerType || "a4";
    if (pType === "a5_landscape") layoutKey += "_a5_landscape";
    else if (pType.startsWith("a5")) layoutKey += "_a5";
    if (clinicSettings[layoutKey]) {
      try { return JSON.parse(clinicSettings[layoutKey]); } catch {}
    }
    const baseKey = activePrintDesign === "print2" ? "invoiceLayout_print2"
      : activePrintDesign === "print3" ? "invoiceLayout_print3"
      : "invoiceLayout";
    if (clinicSettings[baseKey]) {
      try { return JSON.parse(clinicSettings[baseKey]); } catch {}
    }
    return undefined;
  }, [clinicSettings]);

  // ── Step 2: Build enriched invoice data using fullInvoice ──
  const previewInvoiceData = useMemo(() => {
    const inv = fullInvoice || invoice;
    if (!inv) return null;
    const isOp = inv.invoiceType === "op" || inv.ownerId === 0;
    const owner = !isOp ? owners.find(o => o.id === inv.ownerId) : null;
    const pet = inv.petId ? allPets.find(p => p.id === inv.petId) : null;
    return {
      ...inv,
      ownerAddress: owner?.address || inv.ownerAddress || "",
      ownerPhone: owner?.phone || inv.ownerPhone || "",
      ownerEmail: owner?.email || inv.ownerEmail || "",
      patientName: pet?.name || inv.patientName || inv.petName || inv.opPetName || "",
      petSpecies: (pet as any)?.species || inv.petSpecies || "",
      petBreed: (pet as any)?.breed || inv.petBreed || "",
      petAge: (pet as any)?.age || inv.petAge,
      petGender: (pet as any)?.gender || inv.petGender || "",
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : (inv.ownerName || ""),
      // Ensure items are from fullInvoice
      items: (fullInvoice?.items || inv.items || []).map((it: any, i: number) => ({
        ...it,
        id: it.id ?? i,
        total: it.total ?? ((it.quantity || 1) * parseFloat(it.unitPrice || "0")).toFixed(2),
      })),
    };
  }, [fullInvoice, invoice, owners, allPets]);

  const effectivePrinterType = clinicSettings?.printerType || "a4";
  const isA5 = effectivePrinterType.startsWith("a5");
  const isA5Landscape = effectivePrinterType === "a5_landscape";
  const rendererWidth = isA5Landscape ? 794 : (isA5 ? 559 : 794);
  const rendererHeight = isA5Landscape ? 559 : (isA5 ? 794 : 1123);

  // ── Step 3: Only capture PDF after FULL invoice loaded + renderer has painted ──
  useEffect(() => {
    if (!invoice || !clinicSettings || !fullLoaded) return;

    // Give renderer 1.5s to fully paint (fonts, images, items table)
    const timer = setTimeout(async () => {
      const inv = fullInvoice || invoice;
      toast({ title: "Generating Invoice PDF...", description: "Please wait..." });
      try {
        const base64Pdf = await generatePDFFromElement("wa-invoice-renderer-hidden");

        const ownerPhone = (() => {
          const owner = owners.find(o => o.id === inv.ownerId);
          return owner?.phone || inv.ownerPhone || "";
        })();
        const cleanPhone = ownerPhone.replace(/\D/g, "");
        const pdfFileName = cleanPhone
          ? `${cleanPhone}_inv_${inv.id}.pdf`
          : `Invoice_${inv.invoiceNumber || Date.now()}.pdf`;

        const ownerName = inv.ownerName || inv.opOwnerName || "Customer";
        const petName = inv.petName || inv.opPetName || "";
        const totalAmt = parseFloat(inv.total || "0").toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const mode = clinicSettings.whatsappMode || "direct";
        const countryCode = clinicSettings.whatsappCountryCode || "91";

        if (mode === "ultramsg" || mode === "evolution") {
          const caption = `Hello ${ownerName}! 🐾\n\nPlease find your invoice *${inv.invoiceNumber}*${petName ? ` for *${petName}*` : ""} attached.\n\n💰 *Total Amount: ₹${totalAmt}*\n\nThank you for visiting us! 🙏`;
          const res = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: ownerPhone, message: caption, document: base64Pdf, filename: pdfFileName }),
          });
          const data: any = await res.json().catch(() => ({}));
          if (!res.ok || data.error) throw new Error(data.error || data.message || "Failed to send");
          toast({ title: "✅ Invoice Sent!", description: `PDF invoice sent to ${ownerName} on WhatsApp.` });
        } else {
          const uploadRes = await fetch("/api/upload/base64-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64: base64Pdf,
              filename: pdfFileName,
              ownerPhone: cleanPhone || null,
              petName: petName || null,
              reportTitle: `Invoice ${inv.invoiceNumber}`,
            }),
          });
          if (!uploadRes.ok) throw new Error("Failed to generate invoice sharing link");
          const uploadData = await uploadRes.json();
          const reportPath = uploadData.url || (uploadData.token ? `/r/${uploadData.token}` : `/r/${pdfFileName}`);
          const fullUrl = `${window.location.origin}${reportPath}`;
          const msg = `Hello ${ownerName}! 🐾\n\nYour invoice *${inv.invoiceNumber}*${petName ? ` for *${petName}*` : ""} is ready.\n\n💰 *Total Amount: ₹${totalAmt}*\n\n🔗 *View & Download Invoice:* ${fullUrl}\n\nThank you for visiting us! 🙏`;

          let clipboardCopied = false;
          try {
            const pdfBlob = base64Pdf.includes("base64,")
              ? await (await fetch(base64Pdf)).blob()
              : new Blob([Uint8Array.from(atob(base64Pdf.split("base64,")[1] || base64Pdf), c => c.charCodeAt(0))], { type: "application/pdf" });
            if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
              await navigator.clipboard.write([new ClipboardItem({ "application/pdf": pdfBlob })]);
              clipboardCopied = true;
            }
          } catch {}

          toast({
            title: clipboardCopied ? "📋 PDF Copied — Opening WhatsApp" : "📎 Opening WhatsApp",
            description: clipboardCopied
              ? "PDF copied! Press Ctrl+V in WhatsApp Web chat to attach it instantly."
              : `Opening WhatsApp for ${ownerName}...`,
            duration: 8000,
          });
          openWhatsAppLink(ownerPhone, msg, countryCode);
        }
      } catch (err: any) {
        toast({ title: "WhatsApp Share Failed", description: err.message || "Could not send invoice.", variant: "destructive" });
      } finally {
        onDone();
      }
    }, 1500); // 1.5s: full invoice loaded + renderer painted

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, clinicSettings, fullLoaded]);

  if (!invoice || !previewInvoiceData) return null;

  // Hidden off-screen renderer — renders with FULL invoice data including all items
  return (
    <div
      style={{
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: `${rendererWidth}px`,
        height: `${rendererHeight}px`,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: -1,
        background: "white",
      }}
      aria-hidden
    >
      <div id="wa-invoice-renderer-hidden" style={{ width: rendererWidth, height: rendererHeight }}>
        <InvoiceRenderer
          settings={{ ...clinicSettings } as any}
          invoice={previewInvoiceData as any}
          layout={invoiceLayout}
        />
      </div>
    </div>
  );
}

export function MarkAsPaidDialog({

  invoice,
  open,
  onOpenChange,
  onSuccess
}: {
  invoice: InvoiceWithMeta | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [method, setMethod] = useState<"cash" | "upi" | "card" | "cheque" | "split">("cash");
  const [singleReceived, setSingleReceived] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [splitCard, setSplitCard] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const finalMethod = method === "split" 
        ? `Cash:${splitCash||0}, UPI:${splitUpi||0}, Card:${splitCard||0}` 
        : method;
      const res = await apiRequest("POST", `/api/invoices/${invoice!.id}/mark-paid`, { paymentMethod: finalMethod });
      if (!res.ok) throw new Error("Failed to mark as paid");
      return res.json();
    },
    onSuccess: (data) => {
      // Immediately update the specific invoice in the cache so any
      // open ViewInvoiceDialog reflects the new "paid" status instantly
      queryClient.setQueryData(["/api/invoices", invoice!.id], (old: any) =>
        old ? { ...old, status: "paid", paymentMethod: data.paymentMethod } : old
      );
      // Invalidate all related queries so every page refreshes
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice!.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      onSuccess();
      onOpenChange(false);
      toast({ title: "✓ Payment Collected", description: `${invoice!.invoiceNumber} marked as paid via ${method.toUpperCase()}.` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });


  if (!invoice) return null;

  const methods: { value: typeof method; label: string; icon: any; color: string }[] = [
    { value: "cash", label: "Cash", icon: Banknote, color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" },
    { value: "upi", label: "UPI", icon: Smartphone, color: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100" },
    { value: "card", label: "Card", icon: CreditCard, color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
    { value: "cheque", label: "Cheque", icon: CheckSquare, color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" },
    { value: "split", label: "Split", icon: Plus, color: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Collect Payment
          </DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber} — Total: <strong>{formatCurrency(invoice.total)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <p className="text-sm font-semibold text-muted-foreground">Select payment method:</p>
          <div className="grid grid-cols-2 gap-2">
            {methods.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 transition-all font-semibold text-sm",
                    method === m.value ? m.color + " border-2 ring-2 ring-offset-1" : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {method === "split" ? (
            <div className="flex flex-col gap-2 mt-2 bg-zinc-50 border border-zinc-200 p-3 rounded-xl">
              <div className="flex bg-white items-center gap-2 border border-border rounded overflow-hidden h-9 px-2 focus-within:ring-1 focus-within:ring-teal-400 transition-all">
                 <span className="w-12 text-[10px] font-bold text-muted-foreground uppercase opacity-80 tracking-widest">Cash</span>
                 <input type="number" placeholder="0" value={splitCash} onChange={e => setSplitCash(e.target.value)} className="w-full bg-transparent text-right outline-none font-mono text-sm placeholder:text-zinc-300" autoFocus />
              </div>
              <div className="flex bg-white items-center gap-2 border border-border rounded overflow-hidden h-9 px-2 focus-within:ring-1 focus-within:ring-teal-400 transition-all">
                 <span className="w-12 text-[10px] font-bold text-muted-foreground uppercase opacity-80 tracking-widest">UPI</span>
                 <input type="number" placeholder="0" value={splitUpi} onChange={e => setSplitUpi(e.target.value)} className="w-full bg-transparent text-right outline-none font-mono text-sm placeholder:text-zinc-300" />
              </div>
              <div className="flex bg-white items-center gap-2 border border-border rounded overflow-hidden h-9 px-2 focus-within:ring-1 focus-within:ring-teal-400 transition-all">
                 <span className="w-12 text-[10px] font-bold text-muted-foreground uppercase opacity-80 tracking-widest">Card</span>
                 <input type="number" placeholder="0" value={splitCard} onChange={e => setSplitCard(e.target.value)} className="w-full bg-transparent text-right outline-none font-mono text-sm placeholder:text-zinc-300" />
              </div>
              
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-200 px-1">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Inserted</span>
                 <span className={cn("text-xs font-mono font-bold", 
                   (parseFloat(splitCash||"0") + parseFloat(splitUpi||"0") + parseFloat(splitCard||"0")) >= parseFloat(invoice.total) ? "text-emerald-600" : "text-amber-600"
                 )}>
                   ₹{(parseFloat(splitCash||"0") + parseFloat(splitUpi||"0") + parseFloat(splitCard||"0")).toFixed(2)}
                 </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-2 bg-zinc-50 border border-zinc-200 p-3 rounded-xl">
              <div className="flex bg-white items-center gap-2 border border-border rounded overflow-hidden h-10 px-2 focus-within:ring-1 focus-within:ring-teal-400 transition-all">
                 <span className="w-20 text-[10px] font-bold text-muted-foreground uppercase opacity-80 tracking-widest pl-1">Amount Rcvd</span>
                 <input 
                   type="number" 
                   placeholder={invoice.total.toString()} 
                   value={singleReceived} 
                   onChange={e => setSingleReceived(e.target.value)} 
                   className="w-full bg-transparent text-right outline-none font-mono text-lg text-zinc-800" 
                   autoFocus 
                 />
              </div>
              <div className="flex justify-between items-center px-1 pt-1 opacity-90">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {parseFloat(singleReceived || "0") > parseFloat(invoice.total) ? "Return Change" : "Remaining"}
                 </span>
                 <span className={cn("text-xs font-mono font-bold", 
                   parseFloat(singleReceived || "0") >= parseFloat(invoice.total) ? "text-emerald-600" : "text-amber-600"
                 )}>
                   ₹{Math.abs(parseFloat(singleReceived || "0") - parseFloat(invoice.total)).toFixed(2)}
                 </span>
              </div>
            </div>
          )}

          <Button
            className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-base"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />}
            Confirm — {formatCurrency(invoice.total)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Invoice Dialog ───────────────────────────────────────────────────

export function DeleteInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onConfirm,
  isDeleting
}: {
  invoice: InvoiceWithMeta | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!invoice) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Delete Invoice
          </DialogTitle>
          <DialogDescription>
            This will permanently delete invoice <strong>{invoice.invoiceNumber}</strong>.
            {invoice.status === "paid" && (
              <span className="block mt-1 text-amber-600 font-medium">⚠ This is a paid invoice. Deleting it will affect your accounting records.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="destructive"
          className="w-full mt-2"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Confirm Delete
        </Button>
      </DialogContent>
    </Dialog>
  );
}

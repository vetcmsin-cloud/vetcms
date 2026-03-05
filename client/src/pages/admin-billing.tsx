import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, X, Printer, Eye, Forward, Search, Share2, CreditCard, Banknote, Smartphone, CheckSquare, Settings2, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, EyeOff, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Owner, Pet, FeeStructure } from "@shared/schema";
import { InvoiceRenderer } from "@/components/invoice-designer/InvoiceRenderer";
import type { InvoiceSection } from "@/components/invoice-designer/types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type InvoiceWithMeta = {
  id: number;
  invoiceNumber: string;
  ownerId: number;
  petId: number | null;
  date: string;
  dueDate: string | null;
  status: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  notes: string | null;
  createdBy: number | null;
  createdByName: string;
  clinicName: string | null;
  clinicAddress: string | null;
  clinicPhone: string | null;
  paymentMethod: string | null;
  forwardedTo?: string | null;
  ownerName?: string;
  ownerAddress?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  patientName?: string;
  petName?: string;
  petGender?: string;
  petAge?: number | null;
  petSpecies?: string;
  petBreed?: string;
  invoiceType?: string | null;   // 'ip' | 'op'
  opOwnerName?: string | null;   // OP free-text owner
  opPetName?: string | null;     // OP free-text pet
  items?: InvoiceItemType[];
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" },
  { value: "upi", label: "UPI", icon: Smartphone, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800" },
  { value: "card", label: "Card", icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
  { value: "cheque", label: "Cheque", icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
] as const;

type InvoiceItemType = {
  id: number;
  invoiceId: number;
  feeId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
};

interface LineItem {
  feeId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
}

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `\u20B9${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "paid":
      return "default";
    case "pending":
      return "secondary";
    case "forwarded":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "paid": return "Paid";
    case "pending": return "Pending";
    case "forwarded": return "Forwarded";
    case "cancelled": return "Cancelled";
    case "draft": return "Draft";
    default: return status;
  }
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

interface CreateInvoiceDialogProps {
  onInvoiceCreated: (invoice: any) => void;
}

function CreateInvoiceDialog({ onInvoiceCreated }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  // IP / OP selector
  const [invoiceType, setInvoiceType] = useState<"ip" | "op">("ip");

  // IP fields
  const [ownerId, setOwnerId] = useState<string>("");
  const [petId, setPetId] = useState<string>("");

  // OP fields
  const [opOwnerName, setOpOwnerName] = useState("");
  const [opPetName, setOpPetName] = useState("");

  const [date, setDate] = useState(todayStr());

  const filteredPets = useMemo(() => {
    if (!ownerId || !allPets) return [];
    return allPets.filter((p) => p.ownerId === parseInt(ownerId));
  }, [ownerId, allPets]);

  const resetForm = () => {
    setInvoiceType("ip");
    setOwnerId("");
    setPetId("");
    setOpOwnerName("");
    setOpPetName("");
    setDate(todayStr());
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // For OP invoices we need a placeholder ownerId = 0. The server
      // should allow ownerId=0 or we create with a dummy; we store real
      // name in opOwnerName/opPetName. We pass ownerId=0 for OP.
      const body = invoiceType === "ip"
        ? {
          invoiceType: "ip",
          ownerId: parseInt(ownerId),
          petId: petId ? parseInt(petId) : null,
          date,
          status: "draft",
          subtotal: "0",
          tax: "0",
          discount: "0",
          total: "0",
          items: []
        }
        : {
          invoiceType: "op",
          ownerId: 0,           // sentinel — OP has no DB owner
          petId: null,
          opOwnerName: opOwnerName.trim(),
          opPetName: opPetName.trim(),
          date,
          status: "draft",
          subtotal: "0",
          tax: "0",
          discount: "0",
          total: "0",
          items: []
        };
      const res = await apiRequest("POST", "/api/invoices", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setOpen(false);
      resetForm();
      toast({ title: "Invoice started", description: "Draft created. Please add items." });
      if (onInvoiceCreated) onInvoiceCreated(data);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = invoiceType === "ip"
    ? (ownerId && date)
    : (opOwnerName.trim() && date);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-invoice">
          <Plus className="w-4 h-4 mr-1" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Invoice</DialogTitle>
          <DialogDescription>Select the patient type and fill in details.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">

          {/* IP / OP Selector */}
          <div className="flex flex-col gap-1.5">
            <Label>Patient Type</Label>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors ${invoiceType === "ip"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                onClick={() => { setInvoiceType("ip"); setOpOwnerName(""); setOpPetName(""); }}
              >
                🏥 IP — Inpatient
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors border-l ${invoiceType === "op"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                onClick={() => { setInvoiceType("op"); setOwnerId(""); setPetId(""); }}
              >
                🚶 OP — Outpatient
              </button>
            </div>
          </div>

          {/* IP Mode: dropdowns */}
          {invoiceType === "ip" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Owner</Label>
                <Select value={ownerId} onValueChange={(v) => { setOwnerId(v); setPetId(""); }}>
                  <SelectTrigger data-testid="select-invoice-owner">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners?.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.firstName} {o.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Pet</Label>
                <Select value={petId} onValueChange={setPetId} disabled={!ownerId}>
                  <SelectTrigger data-testid="select-invoice-pet">
                    <SelectValue placeholder={ownerId ? "Select pet (optional)" : "Select owner first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPets.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.species})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* OP Mode: free-text inputs */}
          {invoiceType === "op" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="op-owner-name">Owner Name <span className="text-destructive">*</span></Label>
                <Input
                  id="op-owner-name"
                  placeholder="e.g. Rahul Kumar"
                  value={opOwnerName}
                  onChange={(e) => setOpOwnerName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="op-pet-name">Pet Name</Label>
                <Input
                  id="op-pet-name"
                  placeholder="e.g. Bruno (optional)"
                  value={opPetName}
                  onChange={(e) => setOpPetName(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-date">Date</Label>
            <Input
              id="invoice-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="input-invoice-date"
            />
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
            data-testid="button-submit-invoice"
            className="mt-2"
          >
            {mutation.isPending ? "Creating..." : "Create Draft & Add Items"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ClinicSettingsMap = Record<string, string>;

function getFontFamily(fontSetting: string) {
  switch (fontSetting) {
    case "serif": return "'Times New Roman', 'Georgia', serif";
    case "mono": return "'Courier New', 'Consolas', monospace";
    default: return "system-ui, -apple-system, sans-serif";
  }
}

function getPrintStyles(printerType: string) {
  switch (printerType) {
    case "thermal_58mm":
      return `
        @media print {
          @page { size: 58mm auto; margin: 2mm; }
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

function buildUpiUrl(upiId: string, payeeName: string, amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const params = new URLSearchParams();
  params.set("pa", upiId);
  params.set("pn", payeeName);
  params.set("am", num.toFixed(2));
  params.set("cu", "INR");
  return `upi://pay?${params.toString()}`;
}

// ─── Standalone Pay Dialog (must be outside ViewInvoiceDialog to avoid nested-Dialog issues) ──────
function MarkAsPaidDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: {
  invoice: InvoiceWithMeta | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [cashGiven, setCashGiven] = useState<string>("");

  const invoiceTotal = invoice ? parseFloat(invoice.total || "0") : 0;
  const cashGivenNum = parseFloat(cashGiven || "0");
  const change = cashGivenNum >= invoiceTotal ? cashGivenNum - invoiceTotal : 0;
  const deficit = cashGivenNum > 0 && cashGivenNum < invoiceTotal ? invoiceTotal - cashGivenNum : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error("No invoice selected");
      const res = await apiRequest("POST", `/api/invoices/${invoice.id}/mark-paid`, {
        paymentMethod: selectedMethod,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(err.message || "Failed to mark paid");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      if (invoice) queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice.id] });
      const pm = PAYMENT_METHODS.find(p => p.value === selectedMethod);
      toast({ title: "Payment collected", description: `Marked as paid via ${pm?.label || selectedMethod}.` });
      onOpenChange(false);
      onSuccess();
      // Reset
      setCashGiven("");
      setSelectedMethod("cash");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setCashGiven(""); setSelectedMethod("cash"); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogDescription>
            Invoice #{invoice.invoiceNumber} &mdash; Amount: <strong>{formatCurrency(invoice.total)}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Payment method selector */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          {PAYMENT_METHODS.map((pm) => {
            const Icon = pm.icon;
            const selected = selectedMethod === pm.value;
            return (
              <button
                key={pm.value}
                onClick={() => { setSelectedMethod(pm.value); setCashGiven(""); }}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${selected
                  ? `${pm.bg} ${pm.color} border-current shadow-sm`
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                  }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold">{pm.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cash breakdown — only for Cash */}
        {selectedMethod === "cash" && (
          <div className="flex flex-col gap-3 mt-2 p-3 rounded-lg bg-muted/40 border">
            <div className="flex flex-col gap-1">
              <Label htmlFor="cash-given" className="text-sm font-medium">Cash Given by Customer (₹)</Label>
              <Input
                id="cash-given"
                type="number"
                min={0}
                step={0.5}
                placeholder={`Min: ${invoiceTotal.toFixed(2)}`}
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="text-base"
              />
            </div>
            {cashGiven !== "" && (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Total</span>
                  <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Given</span>
                  <span className="font-medium">{formatCurrency(cashGivenNum)}</span>
                </div>
                <div className="h-px bg-border my-0.5" />
                {change > 0 ? (
                  <div className="flex justify-between text-green-700 dark:text-green-400 font-semibold">
                    <span>Balance to Return</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                ) : deficit > 0 ? (
                  <div className="flex justify-between text-red-600 dark:text-red-400 font-semibold">
                    <span>Short by</span>
                    <span>{formatCurrency(deficit)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-green-700 dark:text-green-400 font-semibold">
                    <span>Exact Payment</span>
                    <span>✓</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white mt-1"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || (selectedMethod === "cash" && cashGivenNum > 0 && cashGivenNum < invoiceTotal)}
        >
          {mutation.isPending
            ? "Processing..."
            : `Confirm Payment — ${PAYMENT_METHODS.find(p => p.value === selectedMethod)?.label}`
          }
        </Button>
        {selectedMethod === "cash" && cashGivenNum > 0 && cashGivenNum < invoiceTotal && (
          <p className="text-xs text-center text-red-500 -mt-1">Cash given is less than the invoice total</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ViewInvoiceDialog({
  invoice,
  owners,
  allPets,
  open,
  onOpenChange,
  onMarkPaid,
}: {
  invoice: InvoiceWithMeta;
  owners: Owner[];
  allPets: Pet[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMarkPaid: (invoice: InvoiceWithMeta) => void;
}) {
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();
  const canEdit = hasPermission("billing.edit", "billing.manage");
  const isReceptionist = user?.role === "receptionist";

  // Queries
  const { data: fullInvoice, isLoading } = useQuery<InvoiceWithMeta>({
    queryKey: ["/api/invoices", invoice.id],
    enabled: open,
  });
  const { data: clinicSettings } = useQuery<ClinicSettingsMap>({
    queryKey: ["/api/clinic-settings"],
  });
  const { data: fees } = useQuery<FeeStructure[]>({ queryKey: ["/api/fee-structures"] });

  // State for editing
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxPercent, setTaxPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Initialize state when invoice loads
  useEffect(() => {
    if (fullInvoice) {
      setItems(fullInvoice.items?.map(i => ({
        feeId: i.feeId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })) || []);
      // Calculate tax percent based on tax amount if not explicitly stored (simplified for now)
      // For draft, we might want to store these in the invoice or just defaults
      setTaxPercent(fullInvoice.tax === "0" && fullInvoice.subtotal !== "0" ? "0" : "0");
      setDiscountAmount(fullInvoice.discount);
      setNotes(fullInvoice.notes || "");

      // Auto-enable edit mode if authorized draft or forwarded
      const isCreator = user?.id === fullInvoice.createdBy;
      const isForwardedRecipient = fullInvoice.status === "forwarded" && fullInvoice.forwardedTo && user?.role?.toLowerCase() === fullInvoice.forwardedTo.toLowerCase();

      if ((fullInvoice.status === "draft" && isCreator) || isForwardedRecipient) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    }
  }, [fullInvoice, user]);

  // Derived calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + item.quantity * parseFloat(item.unitPrice || "0");
    }, 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    return subtotal * (parseFloat(taxPercent || "0") / 100);
  }, [subtotal, taxPercent]);

  const discount = parseFloat(discountAmount || "0");
  const total = subtotal + taxAmount - discount;

  // Invoice Data for Preview (Real-time)
  const previewInvoiceData = useMemo(() => {
    let inv = fullInvoice ? { ...fullInvoice, ...invoice } : { ...invoice }; // Merge

    const owner = owners.find(o => o.id === inv.ownerId);
    const pet = inv.petId ? allPets.find(p => p.id === inv.petId) : null;
    const ownerFullName = owner ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") : "";

    const isOp = inv.invoiceType === "op";

    inv = {
      ...inv,
      ownerAddress: owner?.address || inv.ownerAddress || "",
      ownerPhone: owner?.phone || inv.ownerPhone || "",
      ownerEmail: owner?.email || inv.ownerEmail || "",
      patientName: isOp ? (inv.opPetName || "-") : (pet?.name || inv.patientName || ""),
      petName: isOp ? (inv.opPetName || "-") : (pet?.name || inv.petName || ""),
      ownerName: isOp ? (inv.opOwnerName || "Outpatient") : (ownerFullName || inv.ownerName || ""),
      // Patient details from pet record
      petGender: pet?.gender || "",
      petAge: pet?.age ?? null,
      petSpecies: pet?.species || "",
      petBreed: pet?.breed || "",
    };

    if (isEditing) {
      return {
        ...inv,
        subtotal: subtotal.toFixed(2),
        tax: taxAmount.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        notes,
        items: items.map((item, idx) => ({
          id: idx, // temp id
          invoiceId: inv.id,
          feeId: item.feeId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: (item.quantity * parseFloat(item.unitPrice || "0")).toFixed(2)
        }))
      };
    }
    return inv;
  }, [fullInvoice, invoice, isEditing, items, subtotal, taxAmount, discount, total, notes, owners, allPets]);


  // Handlers for Items
  const addItem = () => setItems([...items, { feeId: null, description: "", quantity: 1, unitPrice: "0" }]);

  const removeItem = (index: number) => {
    if (items.length <= 1 && items[0].description === "") {
      setItems([]); // Allow clearing all if it's just one empty item? No, keep logic simple
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<LineItem>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const selectFee = (index: number, feeIdStr: string) => {
    if (feeIdStr === "manual") {
      updateItem(index, { feeId: null, description: "", unitPrice: "0" });
      return;
    }
    const fee = fees?.find((f) => f.id === parseInt(feeIdStr));
    if (fee) {
      updateItem(index, { feeId: fee.id, description: fee.name, unitPrice: fee.amount });
    }
  };

  // Mutations
  const updateInvoiceMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      let newStatus = finalize ? "pending" : "draft";
      // If saving changes (not finalizing) on a forwarded invoice, keep it forwarded
      const currentStatus = fullInvoice?.status || invoice.status;
      if (!finalize && currentStatus === "forwarded") {
        newStatus = "forwarded";
      }
      // If saving an estimate (not converting), keep it as estimate
      if (currentStatus === "estimate") {
        newStatus = "estimate";
      }

      const body = {
        status: newStatus,
        subtotal: subtotal.toFixed(2),
        tax: taxAmount.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        notes: notes || null,
        items: items.map((item) => ({
          feeId: item.feeId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice || "0").toFixed(2),
          total: (item.quantity * parseFloat(item.unitPrice || "0")).toFixed(2),
        })),
      };
      const res = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, body);
      return res.json();
    },
    onSuccess: (data, finalize) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice.id] });
      toast({
        title: finalize ? "Invoice Finalized" : "Changes Saved",
        description: finalize ? "Invoice is now pending payment." : "Invoice updated successfully."
      });
      if (finalize) {
        setIsEditing(false); // Exit edit mode on finalize
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (vars: { status: string, forwardedTo?: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoice.id}`, vars);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice.id] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Mark as Paid: delegate to parent-level dialog via callback ──────────

  const inv = previewInvoiceData;
  const owner = owners.find((o) => o.id === inv.ownerId);
  const pet = inv.petId ? allPets.find((p) => p.id === inv.petId) : null;

  const previewSettings = useMemo(() => {
    if (!clinicSettings) return {};
    const set = { ...clinicSettings };
    const pType = set.printerType || "a4";
    if (pType === "a5_landscape" && set.invoiceBackgroundImage_a5_landscape) {
      set.invoiceBackgroundImage = set.invoiceBackgroundImage_a5_landscape;
    } else if ((pType === "a5" || pType === "a5_portrait") && set.invoiceBackgroundImage_a5) {
      set.invoiceBackgroundImage = set.invoiceBackgroundImage_a5;
    }
    return set;
  }, [clinicSettings]);

  const invoiceLayout = useMemo(() => {
    if (!clinicSettings) return undefined;
    const pType = clinicSettings.printerType || "a4";
    let layoutKey = "invoiceLayout";

    if (pType === "a5_landscape") {
      layoutKey = "invoiceLayout_a5_landscape";
    } else if (pType === "a5" || pType === "a5_portrait") {
      layoutKey = "invoiceLayout_a5";
    }

    if (clinicSettings[layoutKey]) {
      try {
        return JSON.parse(clinicSettings[layoutKey] as string);
      } catch (e) {
        console.error("Failed to parse invoice layout", e);
      }
    }
    return undefined;
  }, [
    clinicSettings?.invoiceLayout,
    clinicSettings?.invoiceLayout_a5,
    clinicSettings?.invoiceLayout_a5_landscape,
    clinicSettings?.printerType
  ]);

  const canSave = items.length > 0 && items.some(i => i.description && parseFloat(i.unitPrice || "0") > 0);

  const canTriggerEdit = useMemo(() => {
    if (!inv || !user) return false;

    // Superadmin/Admin/Billing Manager specific overrides
    if (canEdit) {
      // Allow editing Draft, Pending, and Forwarded invoices
      if (["draft", "pending", "forwarded"].includes(inv.status)) {
        return true;
      }
    }

    // Draft: Only creator can edit (fallback if no global permission)
    if (inv.status === "draft") {
      return user.id === inv.createdBy;
    }

    // Forwarded: Only the forwarded role can edit (e.g. Pharmacy)
    if (inv.status === "forwarded" && inv.forwardedTo) {
      return user.role.toLowerCase() === inv.forwardedTo.toLowerCase();
    }

    return false;
  }, [inv, user, canEdit]);

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

        {/* Action buttons — placed below header so they never collide with the ✕ close button */}
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
            {/* Left Panel: Controls / Actions */}
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
                          ✓ Payment Received{inv.paymentMethod ? ` · ${inv.paymentMethod.charAt(0).toUpperCase() + inv.paymentMethod.slice(1)}` : ""}
                        </div>
                      )}
                    </div>

                    {/* Print / Share */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => {
                        // Share logic (simplified copy from previous)
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

            {/* Right Panel: Live Preview */}
            <div className="w-full flex justify-center bg-muted/20 p-4 rounded-md overflow-x-auto print:bg-white print:p-0 print:overflow-visible relative">
              <div className="flex flex-col max-w-full">
                <div className="mb-2 flex justify-between items-center print:hidden text-center justify-center">
                  <Label className="text-muted-foreground w-full">Live Preview</Label>
                </div>
                <div id="invoice-preview-content" className={`origin-top transition-transform transform-gpu print:scale-100 print:transform-none ${previewWidthClass} mx-auto`}>
                  <InvoiceRenderer
                    settings={previewSettings}
                    invoice={previewInvoiceData} // Use the preview data which merges draft state
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

// ─── Delete Confirm Dialog ───────────────────────────────────────────────────
function DeleteInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  invoice: InvoiceWithMeta | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!invoice) return null;
  const isPaid = invoice.status === "paid";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Delete Invoice
          </DialogTitle>
          <DialogDescription>
            This action <strong>cannot be undone</strong>. The invoice and all its items will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Invoice summary */}
          <div className="rounded-lg border bg-muted/40 px-4 py-3 flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-semibold">#{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusBadgeVariant(invoice.status)} className="text-xs h-5">{statusLabel(invoice.status)}</Badge>
            </div>
          </div>

          {/* Extra warning for paid invoices */}
          {isPaid && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
              <span>This invoice is already <strong>paid</strong>. Deleting it will remove the payment record as well.</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? "Deleting…" : "Delete Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Grid Settings Types ─────────────────────────────────────────────────────
type ColKey = "invoiceId" | "date" | "patient" | "owner" | "amount" | "status" | "forwardedTo" | "createdBy" | "actions";
type SortDir = "asc" | "desc" | null;

interface ColDef {
  key: ColKey;
  label: string;
  defaultWidth: number;
  minWidth: number;
  sortable: boolean;
  hideable: boolean;
}

const ALL_COLUMNS: ColDef[] = [
  { key: "invoiceId", label: "Invoice ID", defaultWidth: 110, minWidth: 80, sortable: true, hideable: false },
  { key: "date", label: "Date", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
  { key: "patient", label: "Patient", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
  { key: "owner", label: "Owner", defaultWidth: 130, minWidth: 80, sortable: true, hideable: true },
  { key: "amount", label: "Amount", defaultWidth: 100, minWidth: 70, sortable: true, hideable: true },
  { key: "status", label: "Status", defaultWidth: 100, minWidth: 70, sortable: true, hideable: true },
  { key: "forwardedTo", label: "Forwarded To", defaultWidth: 120, minWidth: 90, sortable: false, hideable: true },
  { key: "createdBy", label: "Created By", defaultWidth: 130, minWidth: 90, sortable: true, hideable: true },
  { key: "actions", label: "Actions", defaultWidth: 195, minWidth: 155, sortable: false, hideable: false },
];

const SETTINGS_STORAGE_KEY = "billing_grid_settings_v1";

interface GridSettings {
  columnWidths: Record<ColKey, number>;
  hiddenCols: ColKey[];
  sortCol: ColKey | null;
  sortDir: SortDir;
}

function loadGridSettings(): GridSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GridSettings;
  } catch { }
  return {
    columnWidths: Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<ColKey, number>,
    hiddenCols: [],
    sortCol: null,
    sortDir: null,
  };
}

function saveGridSettings(s: GridSettings) {
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s)); } catch { }
}

// ─── Grid Settings Panel ──────────────────────────────────────────────────────
function GridSettingsPanel({
  settings,
  onSettingsChange,
  onClose,
}: {
  settings: GridSettings;
  onSettingsChange: (s: GridSettings) => void;
  onClose: () => void;
}) {
  const toggleCol = (key: ColKey) => {
    const hidden = settings.hiddenCols.includes(key)
      ? settings.hiddenCols.filter(k => k !== key)
      : [...settings.hiddenCols, key];
    onSettingsChange({ ...settings, hiddenCols: hidden });
  };

  const resetAll = () => {
    const fresh: GridSettings = {
      columnWidths: Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<ColKey, number>,
      hiddenCols: [],
      sortCol: null,
      sortDir: null,
    };
    onSettingsChange(fresh);
  };

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border bg-popover shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-1.5"><Settings2 className="w-4 h-4 text-primary" /> Grid Settings</span>
        <div className="flex gap-1">
          <button onClick={resetAll} title="Reset to defaults" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground font-medium mb-1">Show / Hide Columns</p>
        {ALL_COLUMNS.filter(c => c.hideable).map(col => {
          const isVisible = !settings.hiddenCols.includes(col.key);
          return (
            <label key={col.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors">
              <div
                onClick={() => toggleCol(col.key)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${isVisible
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/40"
                  }`}
              >
                {isVisible && <span className="text-[10px] font-bold">✓</span>}
              </div>
              <span className="text-sm">{col.label}</span>
              {!isVisible && <EyeOff className="w-3 h-3 text-muted-foreground ml-auto" />}
            </label>
          );
        })}
      </div>

      <div className="h-px bg-border" />
      <p className="text-xs text-muted-foreground text-center">
        Drag column borders to resize • Click headers to sort
      </p>
    </div>
  );
}

export default function AdminBilling() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceWithMeta | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithMeta | null>(null);
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission("billing.create", "billing.manage");
  const canEdit = hasPermission("billing.edit", "billing.manage");
  const canDelete = hasPermission("billing.manage", "billing.delete");
  const isReceptionist = user?.role === "receptionist";
  const isAdmin = user?.role === "admin" || user?.role === "super admin" || user?.role === "superadmin";

  // Grid settings state (admin only)
  const [gridSettings, setGridSettings] = useState<GridSettings>(loadGridSettings);
  const [showGridSettings, setShowGridSettings] = useState(false);

  const updateGridSettings = useCallback((s: GridSettings) => {
    setGridSettings(s);
    saveGridSettings(s);
  }, []);

  // Resizing state
  const resizingRef = useRef<{ col: ColKey; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent, col: ColKey) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { col, startX: e.clientX, startWidth: gridSettings.columnWidths[col] };
    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const colDef = ALL_COLUMNS.find(c => c.key === resizingRef.current!.col)!;
      const newWidth = Math.max(colDef.minWidth, resizingRef.current.startWidth + delta);
      setGridSettings(prev => {
        const next = { ...prev, columnWidths: { ...prev.columnWidths, [resizingRef.current!.col]: newWidth } };
        saveGridSettings(next);
        return next;
      });
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [gridSettings.columnWidths]);

  const handleSort = useCallback((col: ColKey) => {
    setGridSettings(prev => {
      let dir: SortDir;
      if (prev.sortCol !== col) dir = "asc";
      else if (prev.sortDir === "asc") dir = "desc";
      else dir = null;
      const next = { ...prev, sortCol: dir ? col : null, sortDir: dir };
      saveGridSettings(next);
      return next;
    });
  }, []);

  const { data: invoicesData, isLoading } = useQuery<InvoiceWithMeta[]>({ queryKey: ["/api/invoices"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  const markPaidMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentMethod }: { invoiceId: number; paymentMethod?: string }) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/mark-paid`, { paymentMethod: paymentMethod || "cash" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setPayingInvoice(null);
      toast({ title: "Invoice marked as paid" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const forwardMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, { status: "forwarded" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice forwarded to pharmacy" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to delete" }));
        throw new Error(err.message || "Failed to delete invoice");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDeletingInvoice(null);
      setViewInvoice(null);
      toast({ title: "Invoice deleted", description: "The invoice has been permanently removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    // Check URL params for invoiceId
    const params = new URLSearchParams(window.location.search);
    const invoiceIdParam = params.get("invoiceId");

    if (invoiceIdParam && invoicesData) {
      const invoiceId = parseInt(invoiceIdParam);
      const inv = invoicesData.find(i => i.id === invoiceId);
      if (inv) {
        setViewInvoice(inv);
        // Clear param to avoid re-opening on refresh if desired, but keeping history clean:
        const url = new URL(window.location.href);
        url.searchParams.delete("invoiceId");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [invoicesData]);

  const filteredInvoices = useMemo(() => {
    if (!invoicesData) return [];
    let list = invoicesData;
    if (statusFilter !== "all") {
      list = list.filter((inv) => inv.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((inv) => {
        const { petName, ownerName } = getPetInfo(inv);
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          petName.toLowerCase().includes(q) ||
          ownerName.toLowerCase().includes(q) ||
          (inv.createdByName || "").toLowerCase().includes(q)
        );
      });
    }
    // Apply sort
    if (gridSettings.sortCol && gridSettings.sortDir) {
      const col = gridSettings.sortCol;
      const dir = gridSettings.sortDir;
      list = [...list].sort((a, b) => {
        let aVal = "";
        let bVal = "";
        switch (col) {
          case "invoiceId": aVal = a.invoiceNumber; bVal = b.invoiceNumber; break;
          case "date": aVal = a.date; bVal = b.date; break;
          case "patient": aVal = getPetInfo(a).petName; bVal = getPetInfo(b).petName; break;
          case "owner": aVal = getPetInfo(a).ownerName; bVal = getPetInfo(b).ownerName; break;
          case "amount": return dir === "asc" ? parseFloat(a.total) - parseFloat(b.total) : parseFloat(b.total) - parseFloat(a.total);
          case "status": aVal = a.status; bVal = b.status; break;
          case "createdBy": aVal = a.createdByName; bVal = b.createdByName; break;
        }
        return dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return list;
  }, [invoicesData, statusFilter, searchQuery, allPets, owners, gridSettings.sortCol, gridSettings.sortDir]);

  const getOwnerName = (ownerId: number) => {
    const owner = owners?.find((o) => o.id === ownerId);
    return owner ? `${owner.firstName} ${owner.lastName}` : "Unknown";
  };

  const getPetInfo = (inv: InvoiceWithMeta) => {
    if (inv.invoiceType === "op") {
      return {
        petName: inv.opPetName || "-",
        ownerName: inv.opOwnerName || "Outpatient"
      };
    }
    const pet = inv.petId ? allPets?.find((p) => p.id === inv.petId) : null;
    const ownerName = getOwnerName(inv.ownerId);
    return { petName: pet?.name || "-", ownerName };
  };

  const handlePrint = (inv: InvoiceWithMeta) => {
    const { petName, ownerName } = getPetInfo(inv);
    setViewInvoice({ ...inv, patientName: petName, ownerName });
    setTimeout(() => window.print(), 500);
  };

  const statusTabs = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "forwarded", label: "Forwarded" },
    { value: "paid", label: "Paid" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-billing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-2">Manage invoices and payments.</p>
        </div>
        {canCreate && (
          <CreateInvoiceDialog onInvoiceCreated={(invoice) => setViewInvoice(invoice)} />
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-invoices"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              data-testid={`tab-${tab.value}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground" data-testid="text-no-invoices">
              {statusFilter === "all" ? "No invoices yet. Create your first invoice." : `No ${statusFilter} invoices found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden sm:block">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              {isAdmin && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setShowGridSettings(v => !v)}
                    title="Grid Settings"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Grid Settings
                  </Button>
                  {showGridSettings && (
                    <GridSettingsPanel
                      settings={gridSettings}
                      onSettingsChange={updateGridSettings}
                      onClose={() => setShowGridSettings(false)}
                    />
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {/* Scrollable wrapper: overflow-x for horizontal bar (always visible),
                  max-height + overflow-y so the bar doesn't end up off-screen */}
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)", minHeight: 200 }}>
                {/* Resizable/Sortable Table */}
                <table
                  style={{ tableLayout: "fixed", width: ALL_COLUMNS.filter(c => !gridSettings.hiddenCols.includes(c.key)).reduce((sum, c) => sum + gridSettings.columnWidths[c.key], 0) }}
                  className="w-full text-sm"
                >
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b bg-muted/40">
                      {ALL_COLUMNS.filter(c => !gridSettings.hiddenCols.includes(c.key)).map(col => {
                        const isSorted = gridSettings.sortCol === col.key;
                        const sortDir = isSorted ? gridSettings.sortDir : null;
                        return (
                          <th
                            key={col.key}
                            style={{ width: gridSettings.columnWidths[col.key], minWidth: col.minWidth, position: "relative", userSelect: "none" }}
                            className={`px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground tracking-wide bg-muted/40 ${col.sortable ? "cursor-pointer hover:text-foreground hover:bg-muted/60 transition-colors" : ""
                              } ${isSorted ? "text-primary bg-primary/5" : ""}`}
                            onClick={() => col.sortable && handleSort(col.key)}
                          >
                            <div className="flex items-center gap-1 pr-2">
                              <span className="truncate">{col.label.toUpperCase()}</span>
                              {col.sortable && (
                                <span className="flex-shrink-0 ml-auto">
                                  {sortDir === "asc" ? (
                                    <ArrowUp className="w-3 h-3 text-primary" />
                                  ) : sortDir === "desc" ? (
                                    <ArrowDown className="w-3 h-3 text-primary" />
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                                  )}
                                </span>
                              )}
                            </div>
                            {/* Resize handle */}
                            {isAdmin && (
                              <div
                                onMouseDown={e => startResize(e, col.key)}
                                onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center group"
                                title="Drag to resize"
                              >
                                <div className="w-0.5 h-4 bg-border rounded group-hover:bg-primary/60 transition-colors" />
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                      const { petName, ownerName } = getPetInfo(inv);
                      const isHidden = (k: ColKey) => gridSettings.hiddenCols.includes(k);
                      return (
                        <tr key={inv.id} data-testid={`row-invoice-${inv.id}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          {!isHidden("invoiceId") && (
                            <td style={{ width: gridSettings.columnWidths["invoiceId"] }} className="px-3 py-2.5">
                              <span className="text-sm font-medium text-primary truncate block" data-testid={`text-invoice-number-${inv.id}`}>
                                {inv.invoiceNumber}
                              </span>
                            </td>
                          )}
                          {!isHidden("date") && (
                            <td style={{ width: gridSettings.columnWidths["date"] }} className="px-3 py-2.5" data-testid={`text-invoice-date-${inv.id}`}>
                              <span className="truncate block text-sm">{inv.date}</span>
                            </td>
                          )}
                          {!isHidden("patient") && (
                            <td style={{ width: gridSettings.columnWidths["patient"] }} className="px-3 py-2.5">
                              <span className="text-sm font-medium truncate block" data-testid={`text-invoice-pet-${inv.id}`}>{petName}</span>
                            </td>
                          )}
                          {!isHidden("owner") && (
                            <td style={{ width: gridSettings.columnWidths["owner"] }} className="px-3 py-2.5">
                              <span className="text-sm truncate block" data-testid={`text-invoice-owner-${inv.id}`}>{ownerName}</span>
                            </td>
                          )}
                          {!isHidden("amount") && (
                            <td style={{ width: gridSettings.columnWidths["amount"] }} className="px-3 py-2.5">
                              <span className="font-medium truncate block" data-testid={`text-invoice-total-${inv.id}`}>
                                {formatCurrency(inv.total)}
                              </span>
                            </td>
                          )}
                          {!isHidden("status") && (
                            <td style={{ width: gridSettings.columnWidths["status"] }} className="px-3 py-2.5">
                              <Badge variant={statusBadgeVariant(inv.status)} data-testid={`badge-status-${inv.id}`}>
                                {statusLabel(inv.status)}
                              </Badge>
                            </td>
                          )}
                          {!isHidden("forwardedTo") && (
                            <td style={{ width: gridSettings.columnWidths["forwardedTo"] }} className="px-3 py-2.5">
                              {inv.forwardedTo ? (
                                <Badge variant="outline" className="text-xs">{inv.forwardedTo}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>
                          )}
                          {!isHidden("createdBy") && (
                            <td style={{ width: gridSettings.columnWidths["createdBy"] }} className="px-3 py-2.5" data-testid={`text-invoice-creator-${inv.id}`}>
                              <span className="text-sm truncate block">{inv.createdByName}</span>
                            </td>
                          )}
                          {!isHidden("actions") && (
                            <td style={{ width: gridSettings.columnWidths["actions"] }} className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                {(canEdit || isReceptionist) && (inv.status === "pending" || inv.status === "forwarded") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); setPayingInvoice(inv as InvoiceWithMeta); }}
                                    data-testid={`button-mark-paid-${inv.id}`}
                                    className="text-xs h-7"
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); setViewInvoice(inv); }}
                                  data-testid={`button-view-${inv.id}`}
                                  title="View Invoice"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); handlePrint(inv); }}
                                  data-testid={`button-print-${inv.id}`}
                                  title="Print Invoice"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                                {canDelete && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); setDeletingInvoice(inv as InvoiceWithMeta); }}
                                    data-testid={`button-delete-${inv.id}`}
                                    title="Delete Invoice"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:hidden">
            {filteredInvoices.map((inv) => {
              const { petName, ownerName } = getPetInfo(inv);
              return (
                <Card
                  key={inv.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setViewInvoice(inv)}
                  data-testid={`card-invoice-${inv.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-primary">{inv.invoiceNumber}</span>
                        <span className="text-xs text-muted-foreground">{petName} - {ownerName}</span>
                        <span className="text-xs text-muted-foreground">{inv.date}</span>
                        <span className="text-xs text-muted-foreground">By: {inv.createdByName}</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={statusBadgeVariant(inv.status)}>
                          {statusLabel(inv.status)}
                        </Badge>
                        <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 justify-end">
                      {(canEdit || isReceptionist) && (inv.status === "pending" || inv.status === "forwarded") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); setPayingInvoice(inv as InvoiceWithMeta); }}
                          data-testid={`button-mark-paid-mobile-${inv.id}`}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handlePrint(inv); }}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); setDeletingInvoice(inv as InvoiceWithMeta); }}
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {viewInvoice !== null && owners && allPets && (
        <ViewInvoiceDialog
          invoice={viewInvoice}
          owners={owners}
          allPets={allPets}
          open={viewInvoice !== null}
          onOpenChange={(v) => { if (!v) setViewInvoice(null); }}
          onMarkPaid={(inv) => setPayingInvoice(inv)}
        />
      )}

      {/* Payment dialog — rendered OUTSIDE ViewInvoiceDialog to avoid nested-Dialog conflict */}
      <MarkAsPaidDialog
        invoice={payingInvoice}
        open={payingInvoice !== null}
        onOpenChange={(v) => { if (!v) setPayingInvoice(null); }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          setViewInvoice(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <DeleteInvoiceDialog
        invoice={deletingInvoice}
        open={deletingInvoice !== null}
        onOpenChange={(v) => { if (!v) setDeletingInvoice(null); }}
        onConfirm={() => deletingInvoice && deleteInvoiceMutation.mutate(deletingInvoice.id)}
        isDeleting={deleteInvoiceMutation.isPending}
      />
    </div>
  );
}

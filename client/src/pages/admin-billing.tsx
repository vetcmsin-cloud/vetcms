import { useState, useMemo, useEffect } from "react";
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
import { Plus, X, Printer, Eye, Forward, Search, Share2 } from "lucide-react";
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
  items?: InvoiceItemType[];
};

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

  const [ownerId, setOwnerId] = useState<string>("");
  const [petId, setPetId] = useState<string>("");
  const [date, setDate] = useState(todayStr());

  const filteredPets = useMemo(() => {
    if (!ownerId || !allPets) return [];
    return allPets.filter((p) => p.ownerId === parseInt(ownerId));
  }, [ownerId, allPets]);

  const resetForm = () => {
    setOwnerId("");
    setPetId("");
    setDate(todayStr());
  };

  const mutation = useMutation({
    mutationFn: async () => {
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

  const canSubmit = ownerId && date;

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
          <DialogDescription>Select the client to start a new invoice.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
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
          @page { size: A5 portrait; margin: 0; }
          body { visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-invoice-container { 
            visibility: visible; 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 559px !important;
            min-height: 794px !important;
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

function ViewInvoiceDialog({
  invoice,
  owners,
  allPets,
  open,
  onOpenChange,
}: {
  invoice: InvoiceWithMeta;
  owners: Owner[];
  allPets: Pet[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
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

    inv = {
      ...inv,
      ownerAddress: owner?.address || inv.ownerAddress || "",
      ownerPhone: owner?.phone || inv.ownerPhone || "",
      ownerEmail: owner?.email || inv.ownerEmail || "",
      patientName: pet?.name || inv.patientName || "",
      petName: pet?.name || inv.petName || "",
      ownerName: ownerFullName || inv.ownerName || "",
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

  const markPaidMutationView = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invoices/${invoice.id}/mark-paid`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice.id] });
      toast({ title: "Payment collected", description: "Invoice marked as paid." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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

        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Invoice #{inv.invoiceNumber}
              <Badge variant={statusBadgeVariant(inv.status)} className="ml-2">
                {statusLabel(inv.status)}
              </Badge>
              {inv.forwardedTo && (
                <Badge variant="outline" className="ml-2">
                  Forwarded to: {inv.forwardedTo}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex gap-2">
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
          </div>
        </DialogHeader>

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
                      {inv.status === "pending" && (
                        <Button className="w-full" onClick={() => markPaidMutationView.mutate()}>
                          Mark as Paid
                        </Button>
                      )}
                      {inv.status === "paid" && (
                        <div className="p-2 bg-green-50 text-green-700 rounded-md text-center w-full text-sm font-medium">
                          Include Payment Received
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

export default function AdminBilling() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();

  const canCreate = hasPermission("billing.create", "billing.manage");
  const canEdit = hasPermission("billing.edit", "billing.manage");
  const isReceptionist = user?.role === "receptionist";

  const { data: invoicesData, isLoading } = useQuery<InvoiceWithMeta[]>({ queryKey: ["/api/invoices"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const endpoint = canEdit
        ? `/api/invoices/${invoiceId}`
        : `/api/invoices/${invoiceId}/mark-paid`;
      const method = canEdit ? "PATCH" : "POST";
      const body = canEdit ? { status: "paid" } : undefined;
      const res = await apiRequest(method, endpoint, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
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
        const petName = inv.petId ? (allPets?.find((p) => p.id === inv.petId)?.name || "") : "";
        const ownerName = owners?.find((o) => o.id === inv.ownerId);
        const ownerFullName = ownerName ? `${ownerName.firstName} ${ownerName.lastName}` : "";
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          petName.toLowerCase().includes(q) ||
          ownerFullName.toLowerCase().includes(q) ||
          inv.createdByName.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [invoicesData, statusFilter, searchQuery, allPets, owners]);

  const getOwnerName = (ownerId: number) => {
    const owner = owners?.find((o) => o.id === ownerId);
    return owner ? `${owner.firstName} ${owner.lastName}` : "Unknown";
  };

  const getPetInfo = (petId: number | null, ownerId: number) => {
    const pet = petId ? allPets?.find((p) => p.id === petId) : null;
    const ownerName = getOwnerName(ownerId);
    return { petName: pet?.name || "-", ownerName };
  };

  const handlePrint = (inv: InvoiceWithMeta) => {
    const { petName, ownerName } = getPetInfo(inv.petId, inv.ownerId);
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
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>INVOICE ID</TableHead>
                    <TableHead>DATE</TableHead>
                    <TableHead>PATIENT</TableHead>
                    <TableHead>OWNER</TableHead>
                    <TableHead>AMOUNT</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>FORWARDED TO</TableHead>
                    <TableHead>CREATED BY</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const { petName, ownerName } = getPetInfo(inv.petId, inv.ownerId);
                    return (
                      <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                        <TableCell>
                          <span className="text-sm font-medium text-primary" data-testid={`text-invoice-number-${inv.id}`}>
                            {inv.invoiceNumber}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`text-invoice-date-${inv.id}`}>
                          {inv.date}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium" data-testid={`text-invoice-pet-${inv.id}`}>{petName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-invoice-owner-${inv.id}`}>{ownerName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium" data-testid={`text-invoice-total-${inv.id}`}>
                            {formatCurrency(inv.total)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(inv.status)} data-testid={`badge-status-${inv.id}`}>
                            {statusLabel(inv.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.forwardedTo ? (
                            <Badge variant="outline">{inv.forwardedTo}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-invoice-creator-${inv.id}`}>
                          {inv.createdByName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {(canEdit || isReceptionist) && (inv.status === "pending" || inv.status === "forwarded") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); markPaidMutation.mutate(inv.id); }}
                                disabled={markPaidMutation.isPending}
                                data-testid={`button-mark-paid-${inv.id}`}
                              >
                                Mark Paid
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setViewInvoice(inv); }}
                              data-testid={`button-view-${inv.id}`}
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handlePrint(inv); }}
                              data-testid={`button-print-${inv.id}`}
                              title="Print Invoice"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:hidden">
            {filteredInvoices.map((inv) => {
              const { petName, ownerName } = getPetInfo(inv.petId, inv.ownerId);
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
                          onClick={(e) => { e.stopPropagation(); markPaidMutation.mutate(inv.id); }}
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
        />
      )}
    </div>
  );
}

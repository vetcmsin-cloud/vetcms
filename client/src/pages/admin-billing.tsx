import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, X, Printer, Receipt } from "lucide-react";
import type { Invoice, InvoiceItem, Owner, Pet, FeeStructure } from "@shared/schema";

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

interface LineItem {
  feeId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
}

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "paid":
      return "default";
    case "sent":
      return "secondary";
    case "draft":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `INV-${y}${m}${d}-${rand}`;
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });
  const { data: fees } = useQuery<FeeStructure[]>({ queryKey: ["/api/fee-structures"] });

  const [ownerId, setOwnerId] = useState<string>("");
  const [petId, setPetId] = useState<string>("");
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [items, setItems] = useState<LineItem[]>([
    { feeId: null, description: "", quantity: 1, unitPrice: "0" },
  ]);

  const filteredPets = useMemo(() => {
    if (!ownerId || !allPets) return [];
    return allPets.filter((p) => p.ownerId === parseInt(ownerId));
  }, [ownerId, allPets]);

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

  const addItem = () => {
    setItems([...items, { feeId: null, description: "", quantity: 1, unitPrice: "0" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
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
      updateItem(index, {
        feeId: fee.id,
        description: fee.name,
        unitPrice: fee.amount,
      });
    }
  };

  const resetForm = () => {
    setOwnerId("");
    setPetId("");
    setDate(todayStr());
    setNotes("");
    setTaxPercent("0");
    setDiscountAmount("0");
    setItems([{ feeId: null, description: "", quantity: 1, unitPrice: "0" }]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const invoiceNumber = generateInvoiceNumber();
      const body = {
        invoiceNumber,
        ownerId: parseInt(ownerId),
        petId: petId ? parseInt(petId) : null,
        date,
        status: "draft",
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
      const res = await apiRequest("POST", "/api/invoices", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setOpen(false);
      resetForm();
      toast({ title: "Invoice created", description: "New invoice has been created as draft." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = ownerId && date && items.some((i) => i.description && parseFloat(i.unitPrice || "0") > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-invoice">
          <Plus className="w-4 h-4 mr-1" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Create a new invoice for a pet owner.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <SelectValue placeholder={ownerId ? "Select pet" : "Select owner first"} />
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

          <div className="flex flex-col gap-2">
            <Label>Line Items</Label>
            <div className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 rounded-md border">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <Select
                        value={item.feeId ? String(item.feeId) : "manual"}
                        onValueChange={(v) => selectFee(idx, v)}
                      >
                        <SelectTrigger data-testid={`select-item-fee-${idx}`}>
                          <SelectValue placeholder="Select fee or manual" />
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
                    {items.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        data-testid={`button-remove-item-${idx}`}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        data-testid={`input-item-description-${idx}`}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Qty"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                        data-testid={`input-item-quantity-${idx}`}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                        data-testid={`input-item-price-${idx}`}
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground" data-testid={`text-item-total-${idx}`}>
                    Line Total: {formatCurrency(item.quantity * parseFloat(item.unitPrice || "0"))}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addItem} data-testid="button-add-item">
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Subtotal</Label>
              <div className="text-sm font-medium" data-testid="text-subtotal">{formatCurrency(subtotal)}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-tax">Tax (%)</Label>
              <Input
                id="invoice-tax"
                type="number"
                min={0}
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                data-testid="input-invoice-tax"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-discount">Discount (₹)</Label>
              <Input
                id="invoice-discount"
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                data-testid="input-invoice-discount"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 flex-wrap">
            <span className="text-sm text-muted-foreground">Tax: {formatCurrency(taxAmount)}</span>
            <span className="text-sm text-muted-foreground">Discount: {formatCurrency(discount)}</span>
            <span className="font-semibold" data-testid="text-total">Total: {formatCurrency(total)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea
              id="invoice-notes"
              placeholder="Additional notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-invoice-notes"
            />
          </div>

          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
            data-testid="button-submit-invoice"
          >
            {mutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewInvoiceDialog({
  invoiceId,
  owners,
  allPets,
  open,
  onOpenChange,
}: {
  invoiceId: number;
  owners: Owner[];
  allPets: Pet[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: invoice, isLoading } = useQuery<InvoiceWithItems>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: open,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const owner = invoice ? owners.find((o) => o.id === invoice.ownerId) : null;
  const pet = invoice?.petId ? allPets.find((p) => p.id === invoice.petId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <DialogHeader className="no-print">
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>View and print invoice details.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : invoice ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-2 no-print flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={invoice.status}
                  onValueChange={(v) => statusMutation.mutate(v)}
                >
                  <SelectTrigger className="w-32" data-testid="select-invoice-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => window.print()} data-testid="button-print-invoice">
                <Printer className="w-4 h-4 mr-1" />
                Print Invoice
              </Button>
            </div>

            <div className="border rounded-md p-6">
              <div className="flex flex-col gap-1 mb-6 text-center">
                <h2 className="text-xl font-bold" data-testid="text-clinic-name">PetPoint Pro Veterinary Clinic</h2>
                <p className="text-sm text-muted-foreground">123 Pet Care Lane, Bangalore, Karnataka 560001</p>
                <p className="text-sm text-muted-foreground">Phone: +91 80 1234 5678</p>
              </div>

              <div className="border-t pt-4 flex justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">INVOICE</span>
                  <span className="font-semibold" data-testid="text-invoice-number">{invoice.invoiceNumber}</span>
                  <span className="text-sm text-muted-foreground" data-testid="text-invoice-date">Date: {invoice.date}</span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-xs text-muted-foreground">BILL TO</span>
                  {owner && (
                    <span className="font-semibold" data-testid="text-invoice-owner">
                      {owner.firstName} {owner.lastName}
                    </span>
                  )}
                  {owner?.phone && <span className="text-sm text-muted-foreground">{owner.phone}</span>}
                  {owner?.email && <span className="text-sm text-muted-foreground">{owner.email}</span>}
                  {pet && (
                    <span className="text-sm text-muted-foreground" data-testid="text-invoice-pet">
                      Pet: {pet.name} ({pet.species})
                    </span>
                  )}
                </div>
              </div>

              <Table className="mt-6">
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item, idx) => (
                    <TableRow key={item.id || idx} data-testid={`row-invoice-item-${idx}`}>
                      <TableCell data-testid={`text-item-desc-${idx}`}>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col items-end gap-1 mt-4 pt-4 border-t">
                <div className="flex justify-between gap-8 w-full max-w-xs">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-sm" data-testid="text-print-subtotal">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {parseFloat(String(invoice.tax)) > 0 && (
                  <div className="flex justify-between gap-8 w-full max-w-xs">
                    <span className="text-sm text-muted-foreground">Tax</span>
                    <span className="text-sm">{formatCurrency(invoice.tax)}</span>
                  </div>
                )}
                {parseFloat(String(invoice.discount)) > 0 && (
                  <div className="flex justify-between gap-8 w-full max-w-xs">
                    <span className="text-sm text-muted-foreground">Discount</span>
                    <span className="text-sm">-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-8 w-full max-w-xs border-t pt-2 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold" data-testid="text-print-total">{formatCurrency(invoice.total)}</span>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">NOTES</span>
                  <p className="text-sm mt-1" data-testid="text-invoice-notes">{invoice.notes}</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBilling() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);

  const { data: invoicesData, isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  const filteredInvoices = useMemo(() => {
    if (!invoicesData) return [];
    if (statusFilter === "all") return invoicesData;
    return invoicesData.filter((inv) => inv.status === statusFilter);
  }, [invoicesData, statusFilter]);

  const getOwnerName = (ownerId: number) => {
    const owner = owners?.find((o) => o.id === ownerId);
    return owner ? `${owner.firstName} ${owner.lastName}` : "Unknown";
  };

  const getPetName = (petId: number | null) => {
    if (!petId) return "-";
    const pet = allPets?.find((p) => p.id === petId);
    return pet ? pet.name : "Unknown";
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-billing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/">
              <Button size="icon" variant="ghost" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Billing & Invoices</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create and manage invoices for pet owners.
          </p>
        </div>
        <CreateInvoiceDialog />
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList data-testid="tabs-invoice-status">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
          <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-paid">Paid</TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

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
            <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-invoices">
              {statusFilter === "all" ? "No invoices yet. Create your first invoice." : `No ${statusFilter} invoices found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setViewInvoiceId(inv.id)}
                      data-testid={`row-invoice-${inv.id}`}
                    >
                      <TableCell>
                        <span className="text-sm font-medium" data-testid={`text-invoice-number-${inv.id}`}>
                          {inv.invoiceNumber}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-invoice-owner-${inv.id}`}>
                        {getOwnerName(inv.ownerId)}
                      </TableCell>
                      <TableCell data-testid={`text-invoice-pet-${inv.id}`}>
                        {getPetName(inv.petId)}
                      </TableCell>
                      <TableCell data-testid={`text-invoice-date-${inv.id}`}>
                        {inv.date}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(inv.status)} data-testid={`badge-status-${inv.id}`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-invoice-total-${inv.id}`}>
                        {formatCurrency(inv.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:hidden">
            {filteredInvoices.map((inv) => (
              <Card
                key={inv.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setViewInvoiceId(inv.id)}
                data-testid={`card-invoice-${inv.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{inv.invoiceNumber}</span>
                      <span className="text-xs text-muted-foreground">{getOwnerName(inv.ownerId)}</span>
                      <span className="text-xs text-muted-foreground">{getPetName(inv.petId)}</span>
                      <span className="text-xs text-muted-foreground">{inv.date}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={statusBadgeVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                      <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {viewInvoiceId !== null && owners && allPets && (
        <ViewInvoiceDialog
          invoiceId={viewInvoiceId}
          owners={owners}
          allPets={allPets}
          open={viewInvoiceId !== null}
          onOpenChange={(v) => { if (!v) setViewInvoiceId(null); }}
        />
      )}
    </div>
  );
}

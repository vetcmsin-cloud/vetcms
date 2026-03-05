import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Plus, X, Printer, Eye, Search, FileText, ArrowRight,
    CheckCircle2, Trash2,
} from "lucide-react";
import type { Owner, Pet, FeeStructure } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// ─── Types ─────────────────────────────────────────────────────────────────

type EstimateItem = {
    id: number;
    estimateId: number;
    feeId: number | null;
    description: string;
    quantity: number;
    unitPrice: string;
    total: string;
};

type EstimateWithMeta = {
    id: number;
    estimateNumber: string;
    clientName: string;
    petName: string | null;
    date: string;
    status: string; // draft | finalized | converted
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    notes: string | null;
    convertedInvoiceId: number | null;
    createdBy: number | null;
    createdByName: string;
    items?: EstimateItem[];
};

type LineItem = {
    feeId: number | null;
    description: string;
    quantity: number;
    unitPrice: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: string | number) {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function statusBadge(status: string): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
        case "finalized": return "default";
        case "draft": return "secondary";
        case "converted": return "outline";
        default: return "secondary";
    }
}

function statusLabel(status: string) {
    switch (status) {
        case "draft": return "Draft";
        case "finalized": return "Finalized";
        case "converted": return "Converted";
        default: return status;
    }
}

// ─── Create Estimate Dialog ─────────────────────────────────────────────────

function CreateEstimateDialog({ onCreated }: { onCreated: (est: EstimateWithMeta) => void }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [clientName, setClientName] = useState("");
    const [petName, setPetName] = useState("");
    const [date, setDate] = useState(todayStr());

    const reset = () => { setClientName(""); setPetName(""); setDate(todayStr()); };

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/estimates", {
                clientName,
                petName: petName || undefined,
                date,
                status: "draft",
                subtotal: "0", tax: "0", discount: "0", total: "0",
                items: [],
            });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
            setOpen(false);
            reset();
            toast({ title: "Estimate created", description: `${data.estimateNumber} ready to add items.` });
            onCreated(data);
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    return (
        <>
            <Button onClick={() => setOpen(true)} data-testid="button-new-estimate">
                <Plus className="w-4 h-4 mr-1" />
                New Estimate
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>New Estimate</DialogTitle>
                        <DialogDescription>Enter client details. No owner account needed.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="est-client">Client Name *</Label>
                            <Input
                                id="est-client"
                                placeholder="e.g. Rahul Sharma"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                data-testid="input-estimate-client"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="est-pet">Pet Name (optional)</Label>
                            <Input
                                id="est-pet"
                                placeholder="e.g. Bruno"
                                value={petName}
                                onChange={(e) => setPetName(e.target.value)}
                                data-testid="input-estimate-pet"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="est-date">Date</Label>
                            <Input
                                id="est-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={() => mutation.mutate()}
                            disabled={mutation.isPending || !clientName || !date}
                        >
                            {mutation.isPending ? "Creating..." : "Create & Add Items"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ─── Convert to Invoice Dialog ───────────────────────────────────────────────

function ConvertToInvoiceDialog({
    estimate,
    open,
    onOpenChange,
}: {
    estimate: EstimateWithMeta;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const { toast } = useToast();
    const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
    const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

    const [mode, setMode] = useState<"existing" | "new">("existing");
    const [ownerId, setOwnerId] = useState("");
    const [petId, setPetId] = useState("");
    const [newOwner, setNewOwner] = useState({ firstName: "", lastName: "", phone: "", email: "", address: "" });
    const [date, setDate] = useState(estimate.date);

    const ownerPets = useMemo(() => {
        if (!ownerId || !allPets) return [];
        return allPets.filter((p) => p.ownerId === parseInt(ownerId));
    }, [ownerId, allPets]);

    const reset = () => {
        setOwnerId(""); setPetId(""); setMode("existing");
        setNewOwner({ firstName: "", lastName: "", phone: "", email: "", address: "" });
        setDate(estimate.date);
    };

    const mutation = useMutation({
        mutationFn: async () => {
            const body: Record<string, any> = { date };
            if (mode === "existing") {
                body.ownerId = parseInt(ownerId);
                if (petId) body.petId = parseInt(petId);
            } else {
                body.ownerFirstName = newOwner.firstName;
                body.ownerLastName = newOwner.lastName;
                body.ownerPhone = newOwner.phone;
                body.ownerEmail = newOwner.email;
                body.ownerAddress = newOwner.address;
                if (petId) body.petId = parseInt(petId);
            }
            const res = await apiRequest("POST", `/api/estimates/${estimate.id}/convert`, body);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
            onOpenChange(false);
            reset();
            toast({
                title: "Converted to Invoice",
                description: `Invoice #${data.invoice.invoiceNumber} created from estimate ${estimate.estimateNumber}.`,
            });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const canConvert = mode === "existing"
        ? !!ownerId
        : !!(newOwner.firstName && newOwner.phone);

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Convert to Invoice</DialogTitle>
                    <DialogDescription>
                        Add owner details for estimate {estimate.estimateNumber} — {estimate.clientName}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-2">
                    {/* Owner mode toggle */}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={mode === "existing" ? "default" : "outline"}
                            onClick={() => { setMode("existing"); setOwnerId(""); }}
                        >
                            Select Existing Owner
                        </Button>
                        <Button
                            size="sm"
                            variant={mode === "new" ? "default" : "outline"}
                            onClick={() => { setMode("new"); setOwnerId(""); }}
                        >
                            Create New Owner
                        </Button>
                    </div>

                    {mode === "existing" && (
                        <div className="flex flex-col gap-1.5">
                            <Label>Owner *</Label>
                            <Select value={ownerId} onValueChange={(v) => { setOwnerId(v); setPetId(""); }}>
                                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                                <SelectContent>
                                    {owners?.map((o) => (
                                        <SelectItem key={o.id} value={String(o.id)}>
                                            {o.firstName} {o.lastName} — {o.phone}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {mode === "new" && (
                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <Label>First Name *</Label>
                                    <Input placeholder="First name" value={newOwner.firstName}
                                        onChange={(e) => setNewOwner({ ...newOwner, firstName: e.target.value })} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Last Name</Label>
                                    <Input placeholder="Last name (optional)" value={newOwner.lastName}
                                        onChange={(e) => setNewOwner({ ...newOwner, lastName: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Phone *</Label>
                                <Input placeholder="Phone number" value={newOwner.phone}
                                    onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Email (optional)</Label>
                                <Input type="email" placeholder="Email" value={newOwner.email}
                                    onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Address (optional)</Label>
                                <Input placeholder="Address" value={newOwner.address}
                                    onChange={(e) => setNewOwner({ ...newOwner, address: e.target.value })} />
                            </div>
                        </div>
                    )}

                    {/* Pet selection (only if owner is selected) */}
                    {(ownerId || mode === "new") && ownerPets.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <Label>Pet (optional)</Label>
                            <Select value={petId} onValueChange={setPetId} disabled={!ownerId && mode === "existing"}>
                                <SelectTrigger><SelectValue placeholder="Select pet (optional)" /></SelectTrigger>
                                <SelectContent>
                                    {ownerPets.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} ({p.species})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Invoice date */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Invoice Date</Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>

                    {/* Summary */}
                    <div className="p-3 bg-muted/40 rounded-md text-sm space-y-1">
                        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Estimate Summary</p>
                        <p><span className="text-muted-foreground">Client:</span> {estimate.clientName}</p>
                        {estimate.petName && <p><span className="text-muted-foreground">Pet:</span> {estimate.petName}</p>}
                        <p><span className="text-muted-foreground">Total:</span> <strong>{formatCurrency(estimate.total)}</strong></p>
                    </div>

                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || !canConvert}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        {mutation.isPending ? "Converting..." : "Convert to Invoice"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── View / Edit Estimate Dialog ─────────────────────────────────────────────

function ViewEstimateDialog({
    estimate,
    open,
    onOpenChange,
}: {
    estimate: EstimateWithMeta;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const { toast } = useToast();
    const { data: fees } = useQuery<FeeStructure[]>({ queryKey: ["/api/fee-structures"] });
    const { data: full, isLoading } = useQuery<EstimateWithMeta>({
        queryKey: ["/api/estimates", estimate.id],
        enabled: open,
    });

    const [isEditing, setIsEditing] = useState(false);
    const [convertOpen, setConvertOpen] = useState(false);
    const [items, setItems] = useState<LineItem[]>([]);
    const [taxPercent, setTaxPercent] = useState("0");
    const [discountAmount, setDiscountAmount] = useState("0");
    const [notes, setNotes] = useState("");
    const [clientName, setClientName] = useState(estimate.clientName);
    const [petName, setPetName] = useState(estimate.petName || "");

    useEffect(() => {
        if (full) {
            setItems(full.items?.map((i) => ({
                feeId: i.feeId,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
            })) || []);
            setDiscountAmount(full.discount || "0");
            setNotes(full.notes || "");
            setClientName(full.clientName);
            setPetName(full.petName || "");
            if (full.status === "draft") setIsEditing(true);
        }
    }, [full]);

    const subtotal = useMemo(() =>
        items.reduce((s, i) => s + i.quantity * parseFloat(i.unitPrice || "0"), 0), [items]);
    const taxAmount = useMemo(() => subtotal * (parseFloat(taxPercent || "0") / 100), [subtotal, taxPercent]);
    const discount = parseFloat(discountAmount || "0");
    const total = subtotal + taxAmount - discount;

    const addItem = () => setItems([...items, { feeId: null, description: "", quantity: 1, unitPrice: "0" }]);
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (i: number, u: Partial<LineItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...u } : it));
    const selectFee = (i: number, feeIdStr: string) => {
        if (feeIdStr === "manual") { updateItem(i, { feeId: null, description: "", unitPrice: "0" }); return; }
        const fee = fees?.find((f) => f.id === parseInt(feeIdStr));
        if (fee) updateItem(i, { feeId: fee.id, description: fee.name, unitPrice: fee.amount });
    };

    const saveMutation = useMutation({
        mutationFn: async (finalize: boolean) => {
            const body = {
                clientName,
                petName: petName || undefined,
                status: finalize ? "finalized" : "draft",
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
            const res = await apiRequest("PATCH", `/api/estimates/${estimate.id}`, body);
            return res.json();
        },
        onSuccess: (_, finalize) => {
            queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
            queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimate.id] });
            toast({ title: finalize ? "Estimate Finalized" : "Draft Saved" });
            if (finalize) setIsEditing(false);
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const canSave = items.length > 0 && items.some((i) => i.description && parseFloat(i.unitPrice || "0") > 0);
    const inv = full || estimate;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <DialogTitle className="flex items-center gap-2">
                                {inv.estimateNumber}
                                <Badge variant={statusBadge(inv.status)}>{statusLabel(inv.status)}</Badge>
                            </DialogTitle>
                            <div className="flex gap-2 flex-wrap">
                                {inv.status !== "converted" && !isEditing && (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                        Edit
                                    </Button>
                                )}
                                {isEditing && (
                                    <>
                                        <Button variant="outline" size="sm"
                                            onClick={() => saveMutation.mutate(false)}
                                            disabled={saveMutation.isPending}>
                                            Save Draft
                                        </Button>
                                        <Button size="sm"
                                            onClick={() => saveMutation.mutate(true)}
                                            disabled={saveMutation.isPending || !canSave}>
                                            {saveMutation.isPending ? "Saving..." : "Finalize Estimate"}
                                        </Button>
                                    </>
                                )}
                                {inv.status === "finalized" && !isEditing && (
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => setConvertOpen(true)}
                                    >
                                        <ArrowRight className="w-4 h-4 mr-1" />
                                        Convert to Invoice
                                    </Button>
                                )}
                                {!isEditing && (
                                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                                        <Printer className="w-4 h-4 mr-1" />
                                        Print
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-40 w-full" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5 mt-2">
                            {/* Client / Pet header */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">Client Name</Label>
                                    {isEditing ? (
                                        <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                                    ) : (
                                        <p className="text-sm font-medium">{inv.clientName}</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-muted-foreground">Pet Name</Label>
                                    {isEditing ? (
                                        <Input placeholder="Optional" value={petName} onChange={(e) => setPetName(e.target.value)} />
                                    ) : (
                                        <p className="text-sm">{inv.petName || "—"}</p>
                                    )}
                                </div>
                            </div>

                            {/* Items editor */}
                            {isEditing && (
                                <Card className="border-dashed border-2">
                                    <CardHeader className="py-2 px-4">
                                        <CardTitle className="text-sm">Line Items</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 space-y-3">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 p-2 border rounded-md bg-muted/30">
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <Select
                                                            value={item.feeId ? String(item.feeId) : "manual"}
                                                            onValueChange={(v) => selectFee(idx, v)}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Fee/Service" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="manual">Manual Entry</SelectItem>
                                                                {fees?.filter((f) => f.isActive === "true").map((f) => (
                                                                    <SelectItem key={f.id} value={String(f.id)}>
                                                                        {f.name} — {formatCurrency(f.amount)}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                                                        onClick={() => removeItem(idx)}>
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Input className="col-span-1 h-8 text-xs" placeholder="Description"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(idx, { description: e.target.value })} />
                                                    <Input className="h-8 text-xs" type="number" min={1} placeholder="Qty"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                                                    <Input className="h-8 text-xs" type="number" placeholder="Price"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} />
                                                </div>
                                            </div>
                                        ))}
                                        <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
                                            <Plus className="w-3 h-3 mr-1" /> Add Item
                                        </Button>
                                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                            <div>
                                                <Label className="text-xs">Tax %</Label>
                                                <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} className="h-8" />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Discount (₹)</Label>
                                                <Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="h-8" />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Notes</Label>
                                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                                className="h-16 text-xs" placeholder="Notes..." />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Items read-only view */}
                            {!isEditing && (
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right w-16">Qty</TableHead>
                                                    <TableHead className="text-right w-28">Unit Price</TableHead>
                                                    <TableHead className="text-right w-28">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(full?.items || []).map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.description}</TableCell>
                                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {(!full?.items || full.items.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                                                            No items added yet
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Totals */}
                            <div className="flex flex-col gap-1 items-end text-sm pr-1">
                                <div className="flex gap-6">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{isEditing ? formatCurrency(subtotal) : formatCurrency(inv.subtotal)}</span>
                                </div>
                                {(isEditing ? taxAmount > 0 : parseFloat(inv.tax) > 0) && (
                                    <div className="flex gap-6">
                                        <span className="text-muted-foreground">Tax</span>
                                        <span>{isEditing ? formatCurrency(taxAmount) : formatCurrency(inv.tax)}</span>
                                    </div>
                                )}
                                {(isEditing ? discount > 0 : parseFloat(inv.discount) > 0) && (
                                    <div className="flex gap-6">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span>- {isEditing ? formatCurrency(discount) : formatCurrency(inv.discount)}</span>
                                    </div>
                                )}
                                <div className="flex gap-6 font-semibold text-base border-t pt-1 mt-1">
                                    <span>Total</span>
                                    <span>{isEditing ? formatCurrency(total) : formatCurrency(inv.total)}</span>
                                </div>
                            </div>

                            {/* Notes read-only */}
                            {!isEditing && inv.notes && (
                                <div className="text-sm text-muted-foreground">
                                    <strong>Notes:</strong> {inv.notes}
                                </div>
                            )}

                            {/* Converted notice */}
                            {inv.status === "converted" && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-md text-sm">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    This estimate has been converted to an invoice.
                                    {inv.convertedInvoiceId && (
                                        <span className="ml-1">(Invoice ID: {inv.convertedInvoiceId})</span>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                Created by {inv.createdByName} · {inv.date}
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Convert dialog */}
            {convertOpen && (
                <ConvertToInvoiceDialog
                    estimate={full || estimate}
                    open={convertOpen}
                    onOpenChange={setConvertOpen}
                />
            )}
        </>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EstimatesPage() {
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewEst, setViewEst] = useState<EstimateWithMeta | null>(null);

    const canCreate = hasPermission("billing.create", "billing.manage");
    const canDelete = hasPermission("billing.delete", "billing.manage");

    const { data: estimatesData, isLoading } = useQuery<EstimateWithMeta[]>({
        queryKey: ["/api/estimates"],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/estimates/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
            toast({ title: "Estimate deleted" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const filtered = useMemo(() => {
        if (!estimatesData) return [];
        let list = estimatesData;
        if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((e) =>
                e.estimateNumber.toLowerCase().includes(q) ||
                e.clientName.toLowerCase().includes(q) ||
                (e.petName?.toLowerCase().includes(q))
            );
        }
        return list;
    }, [estimatesData, statusFilter, search]);

    const statusTabs = [
        { value: "all", label: "All" },
        { value: "draft", label: "Draft" },
        { value: "finalized", label: "Finalized" },
        { value: "converted", label: "Converted" },
    ];

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Estimates</h1>
                    <p className="text-muted-foreground mt-1">
                        Create estimates for clients — no owner account needed. Convert to invoice when ready.
                    </p>
                </div>
                {canCreate && (
                    <CreateEstimateDialog onCreated={(est) => setViewEst(est)} />
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by client, pet, or number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                    {statusTabs.map((tab) => (
                        <Button
                            key={tab.value}
                            variant={statusFilter === tab.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(tab.value)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <Card>
                    <CardContent className="p-0">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                                <div className="flex flex-col gap-2 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="p-10 text-center">
                        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                            {statusFilter === "all" ? "No estimates yet. Create your first estimate." : `No ${statusFilter} estimates found.`}
                        </p>
                        {canCreate && statusFilter === "all" && (
                            <CreateEstimateDialog onCreated={(est) => setViewEst(est)} />
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Desktop Table */}
                    <Card className="hidden sm:block">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ESTIMATE #</TableHead>
                                        <TableHead>DATE</TableHead>
                                        <TableHead>CLIENT</TableHead>
                                        <TableHead>PET</TableHead>
                                        <TableHead>TOTAL</TableHead>
                                        <TableHead>STATUS</TableHead>
                                        <TableHead>CREATED BY</TableHead>
                                        <TableHead className="text-right">ACTIONS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((est) => (
                                        <TableRow key={est.id} className="cursor-pointer hover:bg-muted/40"
                                            onClick={() => setViewEst(est)}>
                                            <TableCell>
                                                <span className="font-medium text-primary">{est.estimateNumber}</span>
                                            </TableCell>
                                            <TableCell>{est.date}</TableCell>
                                            <TableCell>
                                                <span className="font-medium">{est.clientName}</span>
                                            </TableCell>
                                            <TableCell>{est.petName || <span className="text-muted-foreground">—</span>}</TableCell>
                                            <TableCell>
                                                <span className="font-medium">{formatCurrency(est.total)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusBadge(est.status)}>{statusLabel(est.status)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{est.createdByName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="icon" variant="ghost"
                                                        onClick={() => setViewEst(est)} title="View Estimate">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {canDelete && est.status !== "converted" && (
                                                        <Button size="icon" variant="ghost"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => {
                                                                if (confirm("Delete this estimate?")) deleteMutation.mutate(est.id);
                                                            }}
                                                            title="Delete">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Mobile Cards */}
                    <div className="flex flex-col gap-3 sm:hidden">
                        {filtered.map((est) => (
                            <Card key={est.id} className="cursor-pointer" onClick={() => setViewEst(est)}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-primary text-sm">{est.estimateNumber}</p>
                                            <p className="text-sm font-medium">{est.clientName}</p>
                                            {est.petName && <p className="text-xs text-muted-foreground">{est.petName}</p>}
                                            <p className="text-xs text-muted-foreground">{est.date}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant={statusBadge(est.status)}>{statusLabel(est.status)}</Badge>
                                            <span className="font-semibold text-sm">{formatCurrency(est.total)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* View dialog */}
            {viewEst && (
                <ViewEstimateDialog
                    estimate={viewEst}
                    open={viewEst !== null}
                    onOpenChange={(v) => { if (!v) setViewEst(null); }}
                />
            )}
        </div>
    );
}

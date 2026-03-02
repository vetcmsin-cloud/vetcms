import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type PurchaseOrder, type Supplier, type InventoryItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, Trash2, PackageCheck, ShoppingCart, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PurchaseOrdersPage() {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewPO, setViewPO] = useState<any>(null);

    const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
        queryKey: ["/api/purchase-orders"],
    });
    const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
    const { data: inventoryItems } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });

    const supplierMap = useMemo(() => {
        const m: Record<number, string> = {};
        suppliers?.forEach((s) => { m[s.id] = s.name; });
        return m;
    }, [suppliers]);

    const filteredOrders = orders?.filter((o) =>
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplierMap[o.supplierId] || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const receiveMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("POST", `/api/purchase-orders/${id}/receive`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({ title: "Order received!", description: "Inventory quantities have been updated." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/purchase-orders/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
            toast({ title: "Deleted", description: "Purchase order deleted." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const statusBadge = (status: string) => {
        switch (status) {
            case "pending": return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge>;
            case "received": return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Received</Badge>;
            case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-border" /></div>;
    }

    const totalPending = orders?.filter(o => o.status === "pending").length || 0;
    const totalReceived = orders?.filter(o => o.status === "received").length || 0;
    const totalSpend = orders?.filter(o => o.status === "received").reduce((s, o) => s + parseFloat(String(o.totalAmount)), 0) || 0;

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage purchase orders and receive stock.
                    </p>
                </div>
                {hasPermission("inventory.manage") && (
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Order
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Pending Orders</span><span className="text-2xl font-bold text-amber-600">{totalPending}</span></div><ShoppingCart className="w-5 h-5 text-amber-500" /></div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Received Orders</span><span className="text-2xl font-bold text-green-600">{totalReceived}</span></div><PackageCheck className="w-5 h-5 text-green-500" /></div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Total Purchase Value</span><span className="text-2xl font-bold">₹{totalSpend.toFixed(2)}</span></div><ShoppingCart className="w-5 h-5 text-primary" /></div></CardContent></Card>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by order # or supplier..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Received Date</TableHead>
                            <TableHead className="w-[150px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders?.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No purchase orders found.</TableCell></TableRow>
                        ) : (
                            filteredOrders?.map((o) => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-mono text-xs font-medium">{o.orderNumber}</TableCell>
                                    <TableCell>{supplierMap[o.supplierId] || "-"}</TableCell>
                                    <TableCell>{o.date}</TableCell>
                                    <TableCell>{statusBadge(o.status)}</TableCell>
                                    <TableCell className="font-medium">₹{parseFloat(String(o.totalAmount)).toFixed(2)}</TableCell>
                                    <TableCell className="text-muted-foreground">{o.receivedDate || "-"}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                                                const res = await apiRequest("GET", `/api/purchase-orders/${o.id}`);
                                                const data = await res.json();
                                                setViewPO(data);
                                            }}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            {o.status === "pending" && hasPermission("inventory.manage") && (
                                                <Button size="sm" variant="default" className="h-8 gap-1" onClick={() => receiveMutation.mutate(o.id)}>
                                                    <PackageCheck className="w-3.5 h-3.5" /> Receive
                                                </Button>
                                            )}
                                            {o.status !== "received" && hasPermission("inventory.manage") && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => { if (confirm("Delete this order?")) deleteMutation.mutate(o.id); }}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create PO Dialog */}
            <CreatePODialog open={isCreateOpen} onOpenChange={setIsCreateOpen} suppliers={suppliers || []} inventoryItems={inventoryItems || []} />

            {/* View PO Dialog */}
            {viewPO && (
                <Dialog open={!!viewPO} onOpenChange={() => setViewPO(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader><DialogTitle>Purchase Order: {viewPO.orderNumber}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-muted-foreground">Supplier:</span> {supplierMap[viewPO.supplierId] || "-"}</div>
                                <div><span className="text-muted-foreground">Date:</span> {viewPO.date}</div>
                                <div><span className="text-muted-foreground">Status:</span> {viewPO.status}</div>
                                <div><span className="text-muted-foreground">Total:</span> ₹{parseFloat(String(viewPO.totalAmount)).toFixed(2)}</div>
                            </div>
                            {viewPO.notes && <p className="text-sm text-muted-foreground">{viewPO.notes}</p>}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Unit Price</TableHead>
                                        <TableHead>Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewPO.items?.map((item: any) => {
                                        const inv = inventoryItems?.find(i => i.id === item.inventoryItemId);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>{inv?.name || `Item #${item.inventoryItemId}`}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>₹{parseFloat(String(item.unitPrice)).toFixed(2)}</TableCell>
                                                <TableCell>₹{parseFloat(String(item.total)).toFixed(2)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

function CreatePODialog({
    open, onOpenChange, suppliers, inventoryItems,
}: {
    open: boolean; onOpenChange: (o: boolean) => void; suppliers: Supplier[]; inventoryItems: InventoryItem[];
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [supplierId, setSupplierId] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<{ inventoryItemId: number; quantity: number; unitPrice: number }[]>([]);

    useEffect(() => {
        if (open) {
            setSupplierId("");
            setNotes("");
            setItems([]);
        }
    }, [open]);

    const addItem = () => {
        setItems([...items, { inventoryItemId: 0, quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, field: string, value: any) => {
        const updated = [...items];
        (updated[idx] as any)[field] = value;
        setItems(updated);
    };

    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const createMutation = useMutation({
        mutationFn: async () => {
            const today = format(new Date(), "yyyy-MM-dd");
            const orderNumber = `PO-${today.replace(/-/g, "")}-${String(Date.now()).slice(-4)}`;
            await apiRequest("POST", "/api/purchase-orders", {
                orderNumber,
                supplierId: parseInt(supplierId),
                date: today,
                status: "pending",
                totalAmount: totalAmount.toFixed(2),
                notes,
                items: items.filter(i => i.inventoryItemId > 0).map(i => ({
                    inventoryItemId: i.inventoryItemId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice.toFixed(2),
                    total: (i.quantity * i.unitPrice).toFixed(2),
                })),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
            toast({ title: "Purchase order created", description: "New purchase order has been created." });
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Supplier *</label>
                            <Select value={supplierId} onValueChange={setSupplierId}>
                                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Notes</label>
                            <Input placeholder="Optional notes" value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Order Items</label>
                            <Button type="button" size="sm" variant="outline" onClick={addItem}>
                                <Plus className="w-3 h-3 mr-1" /> Add Item
                            </Button>
                        </div>
                        {items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5">
                                    <Select value={String(item.inventoryItemId)} onValueChange={v => {
                                        const id = parseInt(v);
                                        const invItem = inventoryItems.find(i => i.id === id);
                                        updateItem(idx, "inventoryItemId", id);
                                        if (invItem) {
                                            updateItem(idx, "unitPrice", parseFloat(String(invItem.purchasePrice)) || 0);
                                        }
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                                        <SelectContent>
                                            {inventoryItems.map(i => (
                                                <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.sku})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="col-span-3">
                                    <Input type="number" step="0.01" placeholder="Price" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="col-span-1 text-right text-sm font-medium pt-2">₹{(item.quantity * item.unitPrice).toFixed(0)}</div>
                                <div className="col-span-1">
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {items.length > 0 && (
                            <div className="text-right font-semibold text-lg border-t pt-2">
                                Total: ₹{totalAmount.toFixed(2)}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button disabled={!supplierId || items.length === 0 || createMutation.isPending} onClick={() => createMutation.mutate()}>
                            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Order
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type PurchaseOrder, type Supplier, type InventoryItem } from "@shared/schema";
import { openNewPurchaseOrderTerminal } from "@/components/NewPurchaseOrderTerminal";
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
import { Loader2, Plus, Search, Trash2, PackageCheck, ShoppingCart, Eye, ReceiptText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PurchaseOrdersPage() {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
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

    const convertMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("POST", `/api/purchase-orders/${id}/convert-to-purchase`);
            if (!res.ok) throw new Error("Failed to convert to purchase invoice");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            queryClient.invalidateQueries({ queryKey: ["/api/purchases/next-number"] });
            queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
            toast({ title: "Converted to Purchase Invoice!", description: "Stock has been updated and a purchase record created." });
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
            case "pending": return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold uppercase text-[9px]">Ordered</Badge>;
            case "received": return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 font-bold uppercase text-[9px]">Invoiced</Badge>;
            case "cancelled": return <Badge variant="destructive" className="font-bold uppercase text-[9px]">Cancelled</Badge>;
            default: return <Badge variant="secondary" className="font-bold uppercase text-[9px]">{status}</Badge>;
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
                    <Button onClick={() => openNewPurchaseOrderTerminal()}>
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
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                openNewPurchaseOrderTerminal(o.id);
                                            }}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            {o.status === "pending" && hasPermission("inventory.manage") && (
                                                <Button 
                                                    size="sm" 
                                                    variant="default" 
                                                    className="h-8 gap-1 bg-primary hover:bg-primary/90 rounded-lg text-[11px] font-bold" 
                                                    disabled={convertMutation.isPending}
                                                    onClick={() => convertMutation.mutate(o.id)}
                                                >
                                                    {convertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ReceiptText className="w-3.5 h-3.5" />}
                                                    Convert to Invoice
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

        </div>
    );
}

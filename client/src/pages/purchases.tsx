
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type Purchase, type Supplier, type InventoryItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, Trash2, Eye, FileText, ReceiptText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { openNewPurchaseTerminal } from "@/components/NewPurchaseTerminal";

export default function PurchasesPage() {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [viewPurchase, setViewPurchase] = useState<any>(null);

    const { data: purchases, isLoading } = useQuery<Purchase[]>({
        queryKey: ["/api/purchases"],
    });
    const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
    const { data: inventoryItems } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });

    const supplierMap = useMemo(() => {
        const m: Record<number, string> = {};
        suppliers?.forEach((s) => { m[s.id] = s.name; });
        return m;
    }, [suppliers]);

    const filteredPurchases = purchases?.filter((p) =>
        p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplierMap[p.supplierId] || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/purchases/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({ title: "Deleted", description: "Purchase record deleted. Inventory adjusted." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-border" /></div>;
    }

    const totalPurchases = purchases?.length || 0;
    const totalValue = purchases?.reduce((s, p) => s + parseFloat(String(p.totalAmount)), 0) || 0;

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">Purchases</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage purchase invoices (actual inventory received).
                    </p>
                </div>
                {hasPermission("inventory.manage") && (
                    <Button onClick={() => openNewPurchaseTerminal()}>
                        <ReceiptText className="w-4 h-4 mr-2" />
                        New Purchase Invoice
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-white to-slate-50/50 shadow-sm border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Purchase Records</span>
                                <span className="text-3xl font-black text-slate-900">{totalPurchases}</span>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-2xl">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 text-white shadow-2xl shadow-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Expenditure</span>
                                <span className="text-3xl font-black">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="bg-white/10 p-3 rounded-2xl">
                                <ReceiptText className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search by invoice # or supplier..." 
                        className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus:ring-primary/20" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden border-slate-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="py-4 font-bold text-slate-700">Invoice #</TableHead>
                            <TableHead className="py-4 font-bold text-slate-700">Supplier</TableHead>
                            <TableHead className="py-4 font-bold text-slate-700">Date</TableHead>
                            <TableHead className="py-4 font-bold text-slate-700">Status</TableHead>
                            <TableHead className="py-4 font-bold text-slate-700 text-right">Total Amount</TableHead>
                            <TableHead className="py-4 font-bold text-slate-700 w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPurchases?.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium">No purchase invoices found.</TableCell></TableRow>
                        ) : (
                            filteredPurchases?.map((p) => (
                                <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors h-14">
                                    <TableCell 
                                        className="font-mono text-xs font-bold text-primary cursor-pointer hover:underline"
                                        onClick={() => openNewPurchaseTerminal(p.id)}
                                    >
                                        {p.purchaseNumber}
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-700">{supplierMap[p.supplierId] || "-"}</TableCell>
                                    <TableCell className="text-slate-600">{p.date}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold uppercase text-[9px]">
                                            {p.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-slate-800">₹{parseFloat(String(p.totalAmount)).toFixed(2)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 justify-end">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => openNewPurchaseTerminal(p.id)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            {hasPermission("inventory.manage") && (
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    onClick={() => { if (confirm("Delete this purchase record? Inventory will be adjusted.")) deleteMutation.mutate(p.id); }}>
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

            {/* View Purchase Dialog */}
            {viewPurchase && (
                <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
                    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                        <DialogHeader className="p-6 bg-slate-900 text-white">
                            <div className="flex justify-between items-center">
                                <DialogTitle className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">Purchase Invoice</DialogTitle>
                                <span className="font-mono text-sm bg-white/20 px-2 py-1 rounded-lg">{viewPurchase.purchaseNumber}</span>
                            </div>
                        </DialogHeader>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-8 text-sm border-b pb-6 border-slate-100">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Supplier Details</span>
                                    <div className="font-bold text-slate-800 text-lg">{supplierMap[viewPurchase.supplierId] || "-"}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Date</span>
                                        <div className="font-bold text-slate-800">{viewPurchase.date}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Status</span>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-1">{viewPurchase.status}</Badge>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-600">Item Description</TableHead>
                                            <TableHead className="font-bold text-slate-600 text-center">Qty</TableHead>
                                            <TableHead className="font-bold text-slate-600 text-right">Unit Price</TableHead>
                                            <TableHead className="font-bold text-slate-600 text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewPurchase.items?.map((item: any) => {
                                            const inv = inventoryItems?.find(i => i.id === item.inventoryItemId);
                                            return (
                                                <TableRow key={item.id} className="border-b last:border-0 border-slate-50">
                                                    <TableCell className="py-4">
                                                        <div className="font-bold text-slate-800">{inv?.name || `Item #${item.inventoryItemId}`}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{inv?.sku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-slate-600">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-mono text-slate-600">₹{parseFloat(String(item.unitPrice)).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono font-black text-slate-800">₹{parseFloat(String(item.total)).toFixed(2)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Additional Notes</span>
                                    <p className="text-xs text-slate-500 max-w-xs">{viewPurchase.notes || "No additional notes."}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Grand Total</span>
                                    <div className="text-3xl font-black text-primary">₹{parseFloat(String(viewPurchase.totalAmount)).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}


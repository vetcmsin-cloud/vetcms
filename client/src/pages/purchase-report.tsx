import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { type PurchaseOrder, type Supplier } from "@shared/schema";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Printer, TrendingUp, ShoppingCart, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function PurchaseReportPage() {
    const { data: orders, isLoading: ordersLoading } = useQuery<PurchaseOrder[]>({ queryKey: ["/api/purchase-orders"] });
    const { data: purchases, isLoading: purchasesLoading } = useQuery<any[]>({ queryKey: ["/api/purchases"] });
    const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

    const isLoading = ordersLoading || purchasesLoading;

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const supplierMap = useMemo(() => {
        const m: Record<number, string> = {};
        suppliers?.forEach(s => { m[s.id] = s.name; });
        return m;
    }, [suppliers]);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        return orders.filter(o => {
            if (dateFrom && o.date < dateFrom) return false;
            if (dateTo && o.date > dateTo) return false;
            return true;
        });
    }, [orders, dateFrom, dateTo]);

    const filteredPurchases = useMemo(() => {
        if (!purchases) return [];
        return purchases.filter(p => {
            if (dateFrom && p.date < dateFrom) return false;
            if (dateTo && p.date > dateTo) return false;
            return true;
        });
    }, [purchases, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const totalSpend = filteredPurchases.reduce((s, p) => s + parseFloat(String(p.totalAmount)), 0);
        const bySupplier: Record<number, { name: string; count: number; total: number }> = {};
        
        filteredPurchases.forEach(p => {
            if (!bySupplier[p.supplierId]) {
                bySupplier[p.supplierId] = { name: supplierMap[p.supplierId] || `Supplier #${p.supplierId}`, count: 0, total: 0 };
            }
            bySupplier[p.supplierId].count++;
            bySupplier[p.supplierId].total += parseFloat(String(p.totalAmount));
        });

        return { 
            totalSpend, 
            totalOrders: filteredOrders.length, 
            purchaseCount: filteredPurchases.length, 
            bySupplier 
        };
    }, [filteredPurchases, filteredOrders, supplierMap]);

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-border" /></div>;
    }

    return (
        <div className="p-8 space-y-8 print:p-4">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Report</h1>
                    <p className="text-muted-foreground mt-2">Purchase history and supplier spending analysis.</p>
                </div>
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Print Report
                </Button>
            </div>

            {/* Date Filters */}
            <div className="flex gap-4 items-end print:hidden">
                <div>
                    <label className="text-sm font-medium">From Date</label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm font-medium">To Date</label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <Button variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
                                <span className="text-2xl font-bold">{stats.totalOrders}</span>
                            </div>
                            <ShoppingCart className="w-5 h-5 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Successful Purchases</span>
                                <span className="text-2xl font-bold text-green-600">{stats.purchaseCount}</span>
                            </div>
                            <Calendar className="w-5 h-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Total Spend</span>
                                <span className="text-2xl font-bold">₹{stats.totalSpend.toFixed(2)}</span>
                            </div>
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Supplier Breakdown */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Expenses by Supplier (Actual Purchases)</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">Purchases</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">% Share</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.values(stats.bySupplier)
                                .sort((a, b) => b.total - a.total)
                                .map((s, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell className="text-right">{s.count}</TableCell>
                                        <TableCell className="text-right font-medium text-green-700">₹{s.total.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground font-mono text-xs">
                                            {stats.totalSpend > 0 ? ((s.total / stats.totalSpend) * 100).toFixed(1) : 0}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {Object.keys(stats.bySupplier).length === 0 && (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-16">No purchase data for selected period.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Purchase History */}
                <Card>
                    <CardHeader className="bg-slate-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Actual Purchases (Invoices)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPurchases.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-16">No purchases found.</TableCell></TableRow>
                                ) : (
                                    filteredPurchases.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-mono text-[10px] font-bold text-primary">{p.purchaseNumber}</TableCell>
                                            <TableCell className="text-xs">{p.date}</TableCell>
                                            <TableCell className="text-right font-bold text-xs">₹{parseFloat(String(p.totalAmount)).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* PO History */}
                <Card>
                    <CardHeader className="bg-slate-50/50"><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Purchase Orders (PO Status)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-16">No orders found.</TableCell></TableRow>
                                ) : (
                                    filteredOrders.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(o => (
                                        <TableRow key={o.id}>
                                            <TableCell className="font-mono text-[10px] font-medium">{o.orderNumber}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("text-[8px] font-bold uppercase", o.status === 'received' ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
                                                    {o.status === 'received' ? 'Invoiced' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-xs">₹{parseFloat(String(o.totalAmount)).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

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

export default function PurchaseReportPage() {
    const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({ queryKey: ["/api/purchase-orders"] });
    const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

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

    const receivedOrders = filteredOrders.filter(o => o.status === "received");

    const stats = useMemo(() => {
        const totalSpend = receivedOrders.reduce((s, o) => s + parseFloat(String(o.totalAmount)), 0);
        const bySupplier: Record<number, { name: string; count: number; total: number }> = {};
        receivedOrders.forEach(o => {
            if (!bySupplier[o.supplierId]) {
                bySupplier[o.supplierId] = { name: supplierMap[o.supplierId] || `Supplier #${o.supplierId}`, count: 0, total: 0 };
            }
            bySupplier[o.supplierId].count++;
            bySupplier[o.supplierId].total += parseFloat(String(o.totalAmount));
        });
        return { totalSpend, totalOrders: filteredOrders.length, receivedCount: receivedOrders.length, bySupplier };
    }, [receivedOrders, filteredOrders, supplierMap]);

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
                                <span className="text-xs font-medium text-muted-foreground">Received Orders</span>
                                <span className="text-2xl font-bold text-green-600">{stats.receivedCount}</span>
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
                <CardHeader><CardTitle className="text-lg">Supplier-wise Purchase Summary</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
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
                                        <TableCell className="text-right font-medium">₹{s.total.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">
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

            {/* Order History Table */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Purchase Orders</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Received Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-16">No orders found.</TableCell></TableRow>
                            ) : (
                                filteredOrders.sort((a, b) => b.date.localeCompare(a.date)).map(o => (
                                    <TableRow key={o.id}>
                                        <TableCell className="font-mono text-xs font-medium">{o.orderNumber}</TableCell>
                                        <TableCell>{supplierMap[o.supplierId] || "-"}</TableCell>
                                        <TableCell>{o.date}</TableCell>
                                        <TableCell>
                                            {o.status === "received" ? <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Received</Badge> :
                                                o.status === "pending" ? <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Pending</Badge> :
                                                    <Badge variant="destructive">{o.status}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">₹{parseFloat(String(o.totalAmount)).toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">{o.receivedDate || "-"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

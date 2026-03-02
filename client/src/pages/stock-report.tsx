import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { type InventoryItem, type Supplier, INVENTORY_CATEGORIES } from "@shared/schema";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Package, AlertTriangle, Printer, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StockReportPage() {
    const { hasPermission } = useAuth();
    const { data: items, isLoading: itemsLoading } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
    const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

    const supplierMap = useMemo(() => {
        const m: Record<number, string> = {};
        suppliers?.forEach(s => { m[s.id] = s.name; });
        return m;
    }, [suppliers]);

    const stats = useMemo(() => {
        if (!items) return { total: 0, totalValue: 0, lowStock: 0, outOfStock: 0, byCategory: {} as Record<string, { count: number; value: number; qty: number }> };
        const byCategory: Record<string, { count: number; value: number; qty: number }> = {};
        let totalValue = 0;
        let lowStock = 0;
        let outOfStock = 0;
        items.forEach((item) => {
            const val = item.quantity * parseFloat(String(item.purchasePrice));
            totalValue += val;
            if (item.quantity <= 0) outOfStock++;
            else if (item.quantity <= item.minQuantity) lowStock++;
            const cat = item.category || "General";
            if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0, qty: 0 };
            byCategory[cat].count++;
            byCategory[cat].value += val;
            byCategory[cat].qty += item.quantity;
        });
        return { total: items.length, totalValue, lowStock, outOfStock, byCategory };
    }, [items]);

    if (itemsLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-border" /></div>;
    }

    const printReport = () => {
        window.print();
    };

    return (
        <div className="p-8 space-y-8 print:p-4">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Stock Report</h1>
                    <p className="text-muted-foreground mt-2">Current inventory status and stock valuation.</p>
                </div>
                <Button variant="outline" onClick={printReport}>
                    <Printer className="w-4 h-4 mr-2" /> Print Report
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Total Items</span>
                                <span className="text-2xl font-bold">{stats.total}</span>
                            </div>
                            <Package className="w-5 h-5 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Total Stock Value</span>
                                <span className="text-2xl font-bold">₹{stats.totalValue.toFixed(2)}</span>
                            </div>
                            <TrendingDown className="w-5 h-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Low Stock</span>
                                <span className="text-2xl font-bold text-amber-600">{stats.lowStock}</span>
                            </div>
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Out of Stock</span>
                                <span className="text-2xl font-bold text-red-600">{stats.outOfStock}</span>
                            </div>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Items</TableHead>
                                <TableHead className="text-right">Total Qty</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(stats.byCategory).map(([cat, data]) => (
                                <TableRow key={cat}>
                                    <TableCell className="font-medium">{cat}</TableCell>
                                    <TableCell className="text-right">{data.count}</TableCell>
                                    <TableCell className="text-right">{data.qty}</TableCell>
                                    <TableCell className="text-right">₹{data.value.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Full Inventory Table */}
            <Card>
                <CardHeader><CardTitle className="text-lg">Detailed Stock List</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Min Qty</TableHead>
                                <TableHead className="text-right">Purchase</TableHead>
                                <TableHead className="text-right">Sale</TableHead>
                                <TableHead>Batch/Exp</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items?.sort((a, b) => a.quantity - a.minQuantity - (b.quantity - b.minQuantity)).map((item) => {
                                const value = item.quantity * parseFloat(String(item.purchasePrice));
                                const isLow = item.quantity > 0 && item.quantity <= item.minQuantity;
                                const isOut = item.quantity <= 0;
                                return (
                                    <TableRow key={item.id} className={isOut ? "bg-red-500/5" : isLow ? "bg-amber-500/5" : ""}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                        <TableCell>{item.category || "General"}</TableCell>
                                        <TableCell>{item.supplierId ? supplierMap[item.supplierId] || "-" : item.supplier || "-"}</TableCell>
                                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{item.minQuantity}</TableCell>
                                        <TableCell className="text-right">₹{parseFloat(String(item.purchasePrice)).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">₹{parseFloat(String(item.salePrice)).toFixed(2)}</TableCell>
                                        <TableCell className="text-xs">
                                            {item.batchNumber ? <div>Bn: {item.batchNumber}</div> : null}
                                            {item.expiryDate ? <div className="text-muted-foreground">Exp: {item.expiryDate}</div> : null}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">₹{value.toFixed(2)}</TableCell>
                                        <TableCell>
                                            {isOut ? <Badge variant="destructive">Out of Stock</Badge> :
                                                isLow ? <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Low Stock</Badge> :
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">In Stock</Badge>}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    );
}

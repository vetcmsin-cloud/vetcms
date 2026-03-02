import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type InventoryItem, type InsertInventoryItem, type Supplier, insertInventoryItemSchema, INVENTORY_CATEGORIES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, AlertTriangle, Pencil, Trash2, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InventoryPage() {
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    const { data: inventoryItems, isLoading } = useQuery<InventoryItem[]>({
        queryKey: ["/api/inventory"],
    });
    const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

    const supplierMap = useMemo(() => {
        const m: Record<number, string> = {};
        suppliers?.forEach(s => { m[s.id] = s.name; });
        return m;
    }, [suppliers]);

    const filteredItems = inventoryItems?.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/inventory/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({
                title: "Item deleted",
                description: "Inventory item has been removed.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error deleting item",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-border" />
            </div>
        );
    }

    if (!hasPermission("inventory.view")) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                You do not have permission to view inventory.
            </div>
        );
    }

    const lowStockCount = inventoryItems?.filter(i => i.quantity > 0 && i.quantity <= i.minQuantity).length || 0;
    const totalValue = inventoryItems?.reduce((s, i) => s + i.quantity * parseFloat(String(i.purchasePrice)), 0) || 0;

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage stock levels, pricing, and suppliers.
                    </p>
                </div>
                {hasPermission("inventory.manage") && (
                    <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Total Items</span><span className="text-2xl font-bold">{inventoryItems?.length || 0}</span></div><Package className="w-5 h-5 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Low Stock</span><span className="text-2xl font-bold text-amber-600">{lowStockCount}</span></div><AlertTriangle className="w-5 h-5 text-amber-500" /></div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex flex-col gap-1"><span className="text-xs font-medium text-muted-foreground">Total Value</span><span className="text-2xl font-bold">₹{totalValue.toFixed(2)}</span></div><Package className="w-5 h-5 text-blue-500" /></div></CardContent></Card>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or SKU..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Min Qty</TableHead>
                            <TableHead>Purchase Price</TableHead>
                            <TableHead>Sale Price</TableHead>
                            <TableHead>Batch / Expiry</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Last Updated</TableHead>
                            {hasPermission("inventory.manage") && <TableHead className="w-[100px]">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No items found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems?.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {item.name}
                                            {item.quantity <= item.minQuantity && (
                                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                                    Low Stock
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{item.category || "General"}</Badge></TableCell>
                                    <TableCell>
                                        <div className={item.quantity <= item.minQuantity ? "text-destructive font-bold" : ""}>
                                            {item.quantity}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.minQuantity}</TableCell>
                                    <TableCell>₹{item.purchasePrice}</TableCell>
                                    <TableCell>₹{item.salePrice}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            {item.batchNumber && <span>Bn: {item.batchNumber}</span>}
                                            {item.expiryDate && <span className="text-muted-foreground">Exp: {item.expiryDate}</span>}
                                            {!item.batchNumber && !item.expiryDate && <span className="text-muted-foreground">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.supplierId ? supplierMap[item.supplierId] || "-" : item.supplier || "-"}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(item.lastUpdated).toLocaleDateString()}
                                    </TableCell>
                                    {hasPermission("inventory.manage") && (
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setIsDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm("Are you sure you want to delete this item?")) {
                                                            deleteMutation.mutate(item.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <InventoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                inventoryItem={editingItem}
                suppliers={suppliers || []}
            />
        </div>
    );
}

function InventoryDialog({
    open,
    onOpenChange,
    inventoryItem,
    suppliers,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inventoryItem: InventoryItem | null;
    suppliers: Supplier[];
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<InsertInventoryItem>({
        resolver: zodResolver(insertInventoryItemSchema),
        defaultValues: {
            name: "",
            sku: "",
            description: "",
            category: "General",
            quantity: 0,
            minQuantity: 5,
            salePrice: "0",
            purchasePrice: "0",
            batchNumber: "",
            expiryDate: "",
            supplier: "",
            supplierId: undefined,
            lastUpdated: new Date().toISOString(),
        },
    });

    useEffect(() => {
        if (open) {
            if (inventoryItem) {
                form.reset({
                    name: inventoryItem.name,
                    sku: inventoryItem.sku,
                    description: inventoryItem.description || "",
                    category: inventoryItem.category || "General",
                    quantity: inventoryItem.quantity,
                    minQuantity: inventoryItem.minQuantity,
                    salePrice: String(inventoryItem.salePrice),
                    purchasePrice: String(inventoryItem.purchasePrice),
                    batchNumber: inventoryItem.batchNumber || "",
                    expiryDate: inventoryItem.expiryDate || "",
                    supplier: inventoryItem.supplier || "",
                    supplierId: inventoryItem.supplierId || undefined,
                    lastUpdated: inventoryItem.lastUpdated,
                });
            } else {
                form.reset({
                    name: "", sku: "", description: "", category: "General",
                    quantity: 0, minQuantity: 5, salePrice: "0", purchasePrice: "0",
                    batchNumber: "", expiryDate: "",
                    supplier: "", supplierId: undefined,
                    lastUpdated: new Date().toISOString(),
                });
            }
        }
    }, [open, inventoryItem, form]);

    const mutation = useMutation({
        mutationFn: async (values: InsertInventoryItem) => {
            const data = { ...values, lastUpdated: new Date().toISOString() };
            if (inventoryItem) {
                await apiRequest("PATCH", `/api/inventory/${inventoryItem.id}`, data);
            } else {
                await apiRequest("POST", "/api/inventory", data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({
                title: inventoryItem ? "Item updated" : "Item created",
                description: inventoryItem ? "Inventory details updated." : "New item added to inventory.",
            });
            onOpenChange(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{inventoryItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <FormField control={form.control} name="name"
                            render={({ field }) => (
                                <FormItem><FormLabel>Name</FormLabel>
                                    <FormControl><Input placeholder="Item Name" {...field} /></FormControl>
                                    <FormMessage /></FormItem>
                            )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="sku"
                                render={({ field }) => (
                                    <FormItem><FormLabel>SKU</FormLabel>
                                        <FormControl><Input placeholder="SKU-123" {...field} /></FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                            <FormField control={form.control} name="category"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "General"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {INVENTORY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage /></FormItem>
                                )} />
                        </div>
                        <FormField control={form.control} name="supplierId"
                            render={({ field }) => (
                                <FormItem><FormLabel>Supplier</FormLabel>
                                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value ? String(field.value) : ""}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage /></FormItem>
                            )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="purchasePrice"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Purchase Price (₹)</FormLabel>
                                        <FormControl><Input {...field} type="number" step="0.01" /></FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                            <FormField control={form.control} name="salePrice"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Sale Price (₹)</FormLabel>
                                        <FormControl><Input {...field} type="number" step="0.01" /></FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="quantity"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                                        </FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                            <FormField control={form.control} name="minQuantity"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Min Qty</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                                        </FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="batchNumber"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Batch Number</FormLabel>
                                        <FormControl><Input {...field} placeholder="Optional" value={field.value || ""} /></FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                            <FormField control={form.control} name="expiryDate"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Expiry Date</FormLabel>
                                        <FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                        </div>
                        <FormField control={form.control} name="description"
                            render={({ field }) => (
                                <FormItem><FormLabel>Description</FormLabel>
                                    <FormControl><Input placeholder="Optional description" {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage /></FormItem>
                            )} />
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {inventoryItem ? "Update" : "Create"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Box, Layers, ListTree, Sparkles, Package, Settings2, Save, Receipt, Search, RefreshCw, X, Edit, Download, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import type { InventoryUnit, InventoryCategory, InventorySubCategory, InventoryProductType, TaxCategory } from "@shared/schema";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


export function InventorySettings() {
    const { toast } = useToast();
    const [newUnitName, setNewUnitName] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newSubCategory, setNewSubCategory] = useState({ name: "", category: "" });
    const [newProductType, setNewProductType] = useState("");
    // Queries
    const { data: units, isLoading: unitsLoading } = useQuery<InventoryUnit[]>({
        queryKey: ["/api/inventory-units"],
    });

    const { data: categories, isLoading: catsLoading } = useQuery<InventoryCategory[]>({
        queryKey: ["/api/inventory-categories"],
    });

    const { data: subCategories, isLoading: subsLoading } = useQuery<InventorySubCategory[]>({
        queryKey: ["/api/inventory-sub-categories"],
    });

    const { data: productTypes, isLoading: typesLoading } = useQuery<InventoryProductType[]>({
        queryKey: ["/api/inventory-product-types"],
    });
    const { data: taxCategories, isLoading: taxLoading } = useQuery<TaxCategory[]>({
        queryKey: ["/api/tax-categories"],
    });

    const { data: settings, isLoading: settingsLoading } = useQuery<Record<string, string>>({
        queryKey: ["/api/clinic-settings"],
    });

    const [negativeStockSetting, setNegativeStockSetting] = useState("warn");
    const [useMrpAsSalePrice, setUseMrpAsSalePrice] = useState(false);
    const [taxMode, setTaxMode] = useState("exclusive");
    const [searchQuery, setSearchQuery] = useState("");

    const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
    const [editingTax, setEditingTax] = useState<TaxCategory | null>(null);
    const [taxFormData, setTaxFormData] = useState({
        name: "",
        purchaseSgst: "0",
        salesSgst: "0",
        purchaseCgst: "0",
        salesCgst: "0",
        purchaseIgst: "0",
        salesIgst: "0",
    });

    useEffect(() => {
        if (settings?.inventory_negative_stock) {
            setNegativeStockSetting(settings.inventory_negative_stock);
        }
        if (settings?.inventory_use_mrp_as_sale_price) {
            setUseMrpAsSalePrice(settings.inventory_use_mrp_as_sale_price === "true");
        }
        if (settings?.inventory_tax_mode) {
            setTaxMode(settings.inventory_tax_mode);
        }
    }, [settings]);

    // Mutations - Units
    const createUnitMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await apiRequest("POST", "/api/inventory-units", { name });
            if (!res.ok) throw new Error("Failed to create unit");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-units"] });
            setNewUnitName("");
            toast({ title: "Unit Created" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteUnitMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/inventory-units/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-units"] });
            toast({ title: "Unit Deleted" });
        },
    });

    // Mutations - Categories
    const createCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await apiRequest("POST", "/api/inventory-categories", { name });
            if (!res.ok) throw new Error("Failed to create category");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
            setNewCategoryName("");
            toast({ title: "Category Created" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/inventory-categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
            toast({ title: "Category Deleted" });
        },
    });

    // Mutations - Sub-Categories
    const createSubCategoryMutation = useMutation({
        mutationFn: async (data: { name: string; category: string; categoryId?: number }) => {
            const res = await apiRequest("POST", "/api/inventory-sub-categories", data);
            if (!res.ok) throw new Error("Failed to create sub-category");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-sub-categories"] });
            setNewSubCategory({ name: "", category: "" });
            toast({ title: "Sub-category Created" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteSubCategoryMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/inventory-sub-categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-sub-categories"] });
            toast({ title: "Sub-category Deleted" });
        },
    });

    // Mutations - Product Types
    const createProductTypeMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await apiRequest("POST", "/api/inventory-product-types", { name });
            if (!res.ok) throw new Error("Failed to create product type");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-product-types"] });
            setNewProductType("");
            toast({ title: "Product Type Created" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteProductTypeMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/inventory-product-types/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-product-types"] });
            toast({ title: "Product Type Deleted" });
        },
    });

    const saveSettingsMutation = useMutation({
        mutationFn: async (data: Record<string, string>) => {
            const res = await apiRequest("PATCH", "/api/clinic-settings", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
            toast({ title: "Settings Saved", description: "Inventory preferences updated." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const syncMrpMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/inventory/sync-mrp-to-sale-price");
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to sync prices");
            }
            return res.json();
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({ title: "Prices Updated", description: data.message || "All sale prices set to MRP." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const syncUnitsMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/inventory/sync-units");
            if (!res.ok) throw new Error("Failed to sync units");
            return res.json();
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-units"] });
            toast({ title: "Units Synced", description: data.message });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const createTaxCategoryMutation = useMutation({
        mutationFn: async (data: Partial<TaxCategory>) => {
            const res = await apiRequest("POST", "/api/tax-categories", data);
            if (!res.ok) throw new Error("Failed to create tax category");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tax-categories"] });
            toast({ title: "Tax Category Created" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const updateTaxCategoryMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<TaxCategory> }) => {
            const res = await apiRequest("PATCH", `/api/tax-categories/${id}`, data);
            if (!res.ok) throw new Error("Failed to update tax category");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tax-categories"] });
            toast({ title: "Tax Category Updated" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    const deleteTaxCategoryMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/tax-categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tax-categories"] });
            toast({ title: "Tax Category Deleted" });
        },
    });

    if (unitsLoading || catsLoading || subsLoading || typesLoading || settingsLoading || taxLoading) return <div className="p-8 text-center italic text-muted-foreground">Loading inventory settings...</div>;

    return (
        <div className="flex flex-col gap-6">

        <Tabs defaultValue="units" className="flex flex-col md:flex-row gap-6">
            <div className="md:w-64 shrink-0">
                <TabsList className="flex flex-col h-auto bg-background border p-1 rounded-lg">
                    <TabsTrigger value="units" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Box className="w-4 h-4" />
                        Inventory Units
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Layers className="w-4 h-4" />
                        Categories
                    </TabsTrigger>
                    <TabsTrigger value="sub-categories" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <ListTree className="w-4 h-4" />
                        Sub-categories
                    </TabsTrigger>
                    <TabsTrigger value="product-types" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Package className="w-4 h-4" />
                        Product Types
                    </TabsTrigger>
                    <TabsTrigger value="tax-categories" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Receipt className="w-4 h-4" />
                        Tax Categories
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <Settings2 className="w-4 h-4" />
                        Preferences
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 w-full min-w-0">
                {/* Units Tab */}
                <TabsContent value="units" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Box className="w-5 h-5 text-primary" />
                                Inventory Units
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex gap-2 mb-6">
                                <Input
                                    placeholder="New Unit (e.g. Piece, Vial, Strip)"
                                    value={newUnitName}
                                    onChange={(e) => setNewUnitName(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button onClick={() => createUnitMutation.mutate(newUnitName)} disabled={!newUnitName.trim() || createUnitMutation.isPending}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Unit
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => syncUnitsMutation.mutate()} 
                                    disabled={syncUnitsMutation.isPending}
                                    className="ml-auto flex items-center gap-2"
                                    title="Load units already used in your products"
                                >
                                    <RefreshCw className={cn("w-4 h-4", syncUnitsMutation.isPending && "animate-spin")} />
                                    Sync from Products
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Unit Name</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {units?.map((unit) => (
                                        <TableRow key={unit.id}>
                                            <TableCell className="font-medium">{unit.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Delete unit "${unit.name}"?`)) deleteUnitMutation.mutate(unit.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {units?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground italic">
                                                No units configured.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Layers className="w-5 h-5 text-primary" />
                                Inventory Categories
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex gap-2 mb-6">
                                <Input
                                    placeholder="New Category (e.g. Medicine, Consumable)"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button onClick={() => createCategoryMutation.mutate(newCategoryName)} disabled={!newCategoryName.trim() || createCategoryMutation.isPending}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Category
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category Name</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories?.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium">{cat.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Delete category "${cat.name}"?`)) deleteCategoryMutation.mutate(cat.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {categories?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground italic">
                                                No categories configured.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Sub-categories Tab */}
                <TabsContent value="sub-categories" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ListTree className="w-5 h-5 text-primary" />
                                Inventory Sub-categories
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-muted/30 rounded-lg border">
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Sub-category Name</Label>
                                    <Input
                                        placeholder="e.g. Tablet, Injection"
                                        value={newSubCategory.name}
                                        onChange={(e) => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Parent Category</Label>
                                    <Select 
                                        value={newSubCategory.category} 
                                        onValueChange={(val) => setNewSubCategory({ ...newSubCategory, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories?.map(c => (
                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button 
                                        className="w-full"
                                        onClick={() => {
                                            const catId = categories?.find(c => c.name === newSubCategory.category)?.id;
                                            createSubCategoryMutation.mutate({ 
                                                name: newSubCategory.name, 
                                                category: newSubCategory.category,
                                                categoryId: catId
                                            });
                                        }} 
                                        disabled={!newSubCategory.name.trim() || !newSubCategory.category || createSubCategoryMutation.isPending}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Sub-category
                                    </Button>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sub-category</TableHead>
                                        <TableHead>Parent Category</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subCategories?.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium">{sub.name}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                                                    {sub.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Delete sub-category "${sub.name}"?`)) deleteSubCategoryMutation.mutate(sub.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {subCategories?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                                                No sub-categories configured.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                {/* Product Types Tab */}
                <TabsContent value="product-types" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Package className="w-5 h-5 text-primary" />
                                Product Types
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                <div className="flex-1">
                                    <Input
                                        placeholder="New Product Type (e.g. Medicine, Pet Food)"
                                        value={newProductType}
                                        onChange={(e) => setNewProductType(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && newProductType.trim()) {
                                                createProductTypeMutation.mutate(newProductType);
                                            }
                                        }}
                                    />
                                </div>
                                <Button
                                    onClick={() => createProductTypeMutation.mutate(newProductType)}
                                    disabled={!newProductType.trim() || createProductTypeMutation.isPending}
                                    className="shrink-0"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Type
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead>Type Name</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productTypes?.map((type) => (
                                        <TableRow key={type.id}>
                                            <TableCell className="font-medium">{type.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Delete product type "${type.name}"?`)) deleteProductTypeMutation.mutate(type.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {productTypes?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground italic">
                                                No product types configured.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tax Categories Tab */}
                <TabsContent value="tax-categories" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-4 border-b bg-muted/50">
                            <div className="flex items-center gap-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-primary" />
                                    Tax Categories
                                </CardTitle>
                                <div className="relative w-72">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tax category..."
                                        className="pl-9 h-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="gap-2" onClick={() => { 
                                            setEditingTax(null); 
                                            setTaxFormData({ 
                                                name: "", 
                                                purchaseSgst: "0", 
                                                salesSgst: "0", 
                                                purchaseCgst: "0", 
                                                salesCgst: "0", 
                                                purchaseIgst: "0", 
                                                salesIgst: "0" 
                                            }); 
                                        }}>
                                            <Plus className="w-4 h-4" /> Add New
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{editingTax ? "Edit" : "Add"} Tax Category</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-2 gap-4 py-4">
                                            <div className="col-span-2 space-y-2">
                                                <Label>GST Category Name</Label>
                                                <Input 
                                                    value={taxFormData.name} 
                                                    onChange={(e) => setTaxFormData({ ...taxFormData, name: e.target.value })} 
                                                    placeholder="e.g. GST 18%" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Purchase SGST %</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={taxFormData.purchaseSgst} 
                                                    onChange={(e) => setTaxFormData({ ...taxFormData, purchaseSgst: e.target.value })} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sales SGST %</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={taxFormData.salesSgst} 
                                                    onChange={(e) => setTaxFormData({ ...taxFormData, salesSgst: e.target.value })} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Purchase CGST %</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={taxFormData.purchaseCgst} 
                                                    onChange={(e) => setTaxFormData({ ...taxFormData, purchaseCgst: e.target.value })} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sales CGST %</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={taxFormData.salesCgst} 
                                                    onChange={(e) => setTaxFormData({ ...taxFormData, salesCgst: e.target.value })} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Purchase IGST %</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={taxFormData.purchaseIgst} 
                                                    onChange={(e) => setTaxFormData({ ...taxFormData, purchaseIgst: e.target.value })} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sales IGST %</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={taxFormData.salesIgst} 
                                                    onChange={(e) => setTaxFormData({ ...taxFormData, salesIgst: e.target.value })} 
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsTaxDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={() => {
                                                if (editingTax) {
                                                    updateTaxCategoryMutation.mutate({ id: editingTax.id, data: taxFormData }, { onSuccess: () => setIsTaxDialogOpen(false) });
                                                } else {
                                                    createTaxCategoryMutation.mutate(taxFormData, { onSuccess: () => setIsTaxDialogOpen(false) });
                                                }
                                            }}>Save Category</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="outline" size="sm" title="Refresh" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/tax-categories"] })}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-hidden">
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 border-y hover:bg-muted/50 whitespace-nowrap">
                                            <TableHead className="w-[60px] font-bold text-black border-r">SLNo</TableHead>
                                            <TableHead className="font-bold text-black border-r">GST Category Name</TableHead>
                                            <TableHead className="text-center font-bold text-black border-r">Purchase_SGST Perc</TableHead>
                                            <TableHead className="text-center font-bold text-black border-r">Sales_SGST Perc</TableHead>
                                            <TableHead className="text-center font-bold text-black border-r">Purchase_CGST Perc</TableHead>
                                            <TableHead className="text-center font-bold text-black border-r">Sales_CGST Perc</TableHead>
                                            <TableHead className="text-center font-bold text-black border-r">Purchase_IGST Perc</TableHead>
                                            <TableHead className="text-center font-bold text-black border-r">Sales_IGST Perc</TableHead>
                                            <TableHead className="text-center font-bold text-black border-r">GST Category ID</TableHead>
                                            <TableHead className="text-right font-bold text-black">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {taxCategories?.filter(tc => tc.name.toLowerCase().includes(searchQuery.toLowerCase())).map((tc, index) => (
                                            <TableRow key={tc.id} className="hover:bg-muted/30 whitespace-nowrap">
                                                <TableCell className="border-r font-medium">{index + 1}</TableCell>
                                                <TableCell className="border-r font-semibold text-primary">{tc.name}</TableCell>
                                                <TableCell className="text-center border-r">{tc.purchaseSgst}%</TableCell>
                                                <TableCell className="text-center border-r">{tc.salesSgst}%</TableCell>
                                                <TableCell className="text-center border-r">{tc.purchaseCgst}%</TableCell>
                                                <TableCell className="text-center border-r">{tc.salesCgst}%</TableCell>
                                                <TableCell className="text-center border-r">{tc.purchaseIgst}%</TableCell>
                                                <TableCell className="text-center border-r">{tc.salesIgst}%</TableCell>
                                                <TableCell className="text-center border-r text-muted-foreground font-mono">{tc.id}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                                                            onClick={() => { 
                                                                setEditingTax(tc); 
                                                                setTaxFormData({ 
                                                                    name: tc.name, 
                                                                    purchaseSgst: String(tc.purchaseSgst), 
                                                                    salesSgst: String(tc.salesSgst), 
                                                                    purchaseCgst: String(tc.purchaseCgst), 
                                                                    salesCgst: String(tc.salesCgst), 
                                                                    purchaseIgst: String(tc.purchaseIgst), 
                                                                    salesIgst: String(tc.salesIgst) 
                                                                }); 
                                                                setIsTaxDialogOpen(true); 
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" 
                                                            onClick={() => { 
                                                                if (confirm(`Delete tax category "${tc.name}"?`)) deleteTaxCategoryMutation.mutate(tc.id); 
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!taxCategories || taxCategories.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground italic">
                                                    No tax categories found. Click "Add New" to get started.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Settings2 className="w-5 h-5 text-primary" />
                                Inventory Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex flex-col gap-6 max-w-xl">
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1.5">
                                        <Label className="text-base font-semibold">Negative Stock Control</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Control how the system behaves when billing an item would cause its stock to go negative.
                                        </p>
                                    </div>
                                    <Select value={negativeStockSetting} onValueChange={setNegativeStockSetting}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select behavior" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="warn">Warn (Show a confirmation dialog)</SelectItem>
                                            <SelectItem value="block">Block (Prevent creating the invoice)</SelectItem>
                                            <SelectItem value="ignore">Ignore (Allow stock to go negative silently)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex flex-col gap-1.5">
                                        <Label className="text-base font-semibold">Sales Price Setting</Label>
                                        <p className="text-sm text-muted-foreground">
                                            When enabled, all product sales prices will be updated to their MRP value.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                                        <Checkbox
                                            id="useMrpAsSalePrice"
                                            checked={useMrpAsSalePrice}
                                            onCheckedChange={(checked) => setUseMrpAsSalePrice(checked === true)}
                                        />
                                        <div className="flex flex-col gap-1">
                                            <Label htmlFor="useMrpAsSalePrice" className="font-medium cursor-pointer">
                                                Use MRP as Sales Price
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Checking this and saving will set the sale price of every inventory product to its MRP.
                                            </p>
                                        </div>
                                    </div>
                                    {useMrpAsSalePrice && (
                                        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>Saving with this option enabled will overwrite all product sale prices with their MRP values.</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex flex-col gap-1.5">
                                        <Label className="text-base font-semibold">Tax Calculation Mode</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Choose how tax is handled when entering product prices in inventory.
                                        </p>
                                    </div>
                                    <RadioGroup value={taxMode} onValueChange={setTaxMode} className="grid grid-cols-2 gap-4">
                                        <Label
                                            htmlFor="tax-exclusive"
                                            className={cn(
                                                "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                                                taxMode === "exclusive" && "border-primary bg-primary/5"
                                            )}
                                        >
                                            <RadioGroupItem value="exclusive" id="tax-exclusive" className="sr-only" />
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="font-bold">Exclusive</span>
                                                <p className="text-[10px] text-center text-muted-foreground">Tax is calculated separately on top of the entered price.</p>
                                            </div>
                                        </Label>
                                        <Label
                                            htmlFor="tax-inclusive"
                                            className={cn(
                                                "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                                                taxMode === "inclusive" && "border-primary bg-primary/5"
                                            )}
                                        >
                                            <RadioGroupItem value="inclusive" id="tax-inclusive" className="sr-only" />
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="font-bold">Inclusive</span>
                                                <p className="text-[10px] text-center text-muted-foreground">The entered price already includes tax.</p>
                                            </div>
                                        </Label>
                                    </RadioGroup>
                                </div>

                                <div className="pt-4 border-t">
                                    <Button 
                                        onClick={() => {
                                            const settingsToSave: Record<string, string> = {
                                                inventory_negative_stock: negativeStockSetting,
                                                inventory_use_mrp_as_sale_price: String(useMrpAsSalePrice),
                                                inventory_tax_mode: taxMode,
                                            };

                                            saveSettingsMutation.mutate(settingsToSave, {
                                                onSuccess: () => {
                                                    if (useMrpAsSalePrice) {
                                                        syncMrpMutation.mutate();
                                                    }
                                                }
                                            });
                                        }}
                                        disabled={saveSettingsMutation.isPending || syncMrpMutation.isPending}
                                        className="w-full sm:w-auto"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {syncMrpMutation.isPending ? "Updating Prices..." : "Save Preferences"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </div>
        </Tabs>
        </div>
    );
}


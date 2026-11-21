import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type InventoryItem, type InsertInventoryItem, type Supplier, type InventorySubCategory, type InventoryUnit, type InventoryCategory, type InventoryProductType, type TaxCategory, insertInventoryItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, AlertTriangle, Pencil, Trash2, Package, Settings2, EyeOff, X, RotateCcw, Banknote, Clock, ClipboardList, Info, Filter, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import InventoryImport from "@/components/inventory-import";
import { Download, Upload } from "lucide-react";

type ColKey = "sku" | "productId" | "name" | "type" | "category" | "subCategory" | "baseUnit" | "quantity" | "minQuantity" | "purchasePrice" | "salePrice" | "mrp" | "batch" | "supplier" | "lastUpdated" | "actions";
type SortDir = "asc" | "desc" | null;

interface ColDef {
    key: ColKey;
    label: string;
    defaultWidth: number;
    minWidth: number;
    sortable: boolean;
    hideable: boolean;
}

const ALL_COLUMNS: ColDef[] = [
    { key: "sku", label: "Item Code", defaultWidth: 120, minWidth: 80, sortable: true, hideable: false },
    { key: "productId", label: "Product ID", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
    { key: "name", label: "Name", defaultWidth: 250, minWidth: 150, sortable: true, hideable: false },
    { key: "type", label: "Type", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
    { key: "category", label: "Category", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
    { key: "subCategory", label: "Sub Category", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
    { key: "baseUnit", label: "Base Unit", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
    { key: "quantity", label: "Quantity", defaultWidth: 80, minWidth: 60, sortable: true, hideable: true },
    { key: "minQuantity", label: "Min Qty", defaultWidth: 80, minWidth: 60, sortable: true, hideable: true },
    { key: "purchasePrice", label: "Purchase Price", defaultWidth: 120, minWidth: 90, sortable: true, hideable: true },
    { key: "salePrice", label: "Sale Price", defaultWidth: 120, minWidth: 90, sortable: true, hideable: true },
    { key: "mrp", label: "MRP", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
    { key: "batch", label: "Batch / Expiry", defaultWidth: 150, minWidth: 100, sortable: false, hideable: true },
    { key: "supplier", label: "Supplier", defaultWidth: 150, minWidth: 100, sortable: true, hideable: true },
    { key: "lastUpdated", label: "Last Updated", defaultWidth: 120, minWidth: 90, sortable: true, hideable: true },
    { key: "actions", label: "Actions", defaultWidth: 100, minWidth: 80, sortable: false, hideable: false },
];

const SETTINGS_STORAGE_KEY = "inventory_grid_settings_v3";

interface GridSettings {
    columnWidths: Record<ColKey, number>;
    hiddenCols: ColKey[];
    sortCol: ColKey | null;
    sortDir: SortDir;
    rowHeight: "compact" | "default" | "relaxed";
    fontSize: "sm" | "base" | "lg";
    filters: Record<string, string[]>;
}

function loadGridSettings(): GridSettings {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                ...parsed,
                filters: parsed.filters || {}
            } as GridSettings;
        }
    } catch { }
    return {
        columnWidths: Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<ColKey, number>,
        hiddenCols: [],
        sortCol: null,
        sortDir: null,
        rowHeight: "default",
        fontSize: "sm",
        filters: {}
    };
}

function saveGridSettings(s: GridSettings) {
    try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s)); } catch { }
}

function GridSettingsPanel({
    settings,
    onSettingsChange,
    onClose,
}: {
    settings: GridSettings;
    onSettingsChange: (s: GridSettings) => void;
    onClose: () => void;
}) {
    const toggleCol = (key: ColKey) => {
        const hidden = settings.hiddenCols.includes(key)
            ? settings.hiddenCols.filter(k => k !== key)
            : [...settings.hiddenCols, key];
        onSettingsChange({ ...settings, hiddenCols: hidden });
    };

    const resetAll = () => {
        const fresh: GridSettings = {
            columnWidths: Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<ColKey, number>,
            hiddenCols: [],
            sortCol: null,
            sortDir: null,
            rowHeight: "default",
            fontSize: "sm",
            filters: {}
        };
        onSettingsChange(fresh);
    };

    return (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border bg-popover shadow-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1.5"><Settings2 className="w-4 h-4 text-primary" /> Grid Settings</span>
                <div className="flex gap-1">
                    <button onClick={resetAll} title="Reset to defaults" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">Show / Hide Columns</p>
                {ALL_COLUMNS.filter(c => c.hideable).map(col => {
                    const isVisible = !settings.hiddenCols.includes(col.key);
                    return (
                        <label key={col.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors">
                            <div
                                onClick={() => toggleCol(col.key)}
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${isVisible
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/40"
                                    }`}
                            >
                                {isVisible && <span className="text-[10px] font-bold">✓</span>}
                            </div>
                            <span className="text-sm">{col.label}</span>
                            {!isVisible && <EyeOff className="w-3 h-3 text-muted-foreground ml-auto" />}
                        </label>
                    );
                })}
            </div>

            <div className="h-px bg-border" />
            
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Row Height</span>
                    <Select value={settings.rowHeight} onValueChange={(val: any) => onSettingsChange({ ...settings, rowHeight: val })}>
                        <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="relaxed">Relaxed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Font Size</span>
                    <Select value={settings.fontSize} onValueChange={(val: any) => onSettingsChange({ ...settings, fontSize: val })}>
                        <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sm">Small</SelectItem>
                            <SelectItem value="base">Medium</SelectItem>
                            <SelectItem value="lg">Large</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="h-px bg-border" />
            <p className="text-xs text-muted-foreground text-center">
                Drag column borders to resize • Click headers to sort
            </p>
        </div>
    );
}


export default function InventoryPage() {
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    const [zoomLevel, setZoomLevel] = useState(100);

    const [gridSettings, setGridSettings] = useState<GridSettings>(loadGridSettings);

    const updateGridSettings = useCallback((s: GridSettings) => {
        setGridSettings(s);
        saveGridSettings(s);
    }, []);

    const resizingRef = useRef<{ col: ColKey; startX: number; startWidth: number } | null>(null);

    const startResize = useCallback((e: React.MouseEvent, col: ColKey) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { col, startX: e.clientX, startWidth: gridSettings.columnWidths[col] };
        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const delta = ev.clientX - resizingRef.current.startX;
            const resizeCol = resizingRef.current.col;
            const colDef = ALL_COLUMNS.find(c => c.key === resizeCol)!;
            const newWidth = Math.max(colDef.minWidth, resizingRef.current.startWidth + delta);
            setGridSettings(prev => {
                const next = { ...prev, columnWidths: { ...prev.columnWidths, [resizeCol]: newWidth } };
                saveGridSettings(next);
                return next;
            });
        };
        const onMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [gridSettings.columnWidths]);

    const handleSort = useCallback((col: ColKey) => {
        // Disabled per user request: "dont sort anything when click heading"
        return;
    }, []);


    const { data: inventoryItems, isLoading } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
    const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
    const { data: subCategories } = useQuery<InventorySubCategory[]>({ queryKey: ["/api/inventory-sub-categories"] });
    const { data: dynamicCategories } = useQuery<InventoryCategory[]>({ queryKey: ["/api/inventory-categories"] });
    const { data: dynamicUnits } = useQuery<InventoryUnit[]>({ queryKey: ["/api/inventory-units"] });
    const { data: dynamicProductTypes } = useQuery<InventoryProductType[]>({ queryKey: ["/api/inventory-product-types"] });
    const { data: taxCategories } = useQuery<TaxCategory[]>({ queryKey: ["/api/tax-categories"] });
    const { data: clinicSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/clinic-settings"] });


    const supplierMap = useMemo(() => {
        const m: Record<number, string> = {};
        suppliers?.forEach(s => { m[s.id] = s.name; });
        return m;
    }, [suppliers]);

    // Column Filtering Logic
    const uniqueValues = useMemo(() => {
        if (!inventoryItems) return { type: [], category: [], subCategory: [], baseUnit: [] };
        return {
            type: Array.from(new Set(inventoryItems.map(i => (i as any).productType || ""))),
            category: Array.from(new Set(inventoryItems.map(i => i.category || ""))),
            subCategory: Array.from(new Set(inventoryItems.map(i => i.subCategory || ""))),
            baseUnit: Array.from(new Set(inventoryItems.map(i => i.baseUnit || "")))
        };
    }, [inventoryItems]);

    const ColumnFilter = ({ columnKey, options }: { columnKey: string, options: string[] }) => {
        const currentFilters = gridSettings.filters[columnKey] || [];
        const toggleFilter = (val: string) => {
            const newFilters = currentFilters.includes(val)
                ? currentFilters.filter(v => v !== val)
                : [...currentFilters, val];

            const next = {
                ...gridSettings,
                filters: {
                    ...gridSettings.filters,
                    [columnKey]: newFilters
                }
            };
            setGridSettings(next);
            saveGridSettings(next);
        };

        const clear = () => {
            const newFilters = { ...gridSettings.filters };
            delete newFilters[columnKey];
            const next = { ...gridSettings, filters: newFilters };
            setGridSettings(next);
            saveGridSettings(next);
        };

        const selectAll = () => {
            const next = {
                ...gridSettings,
                filters: {
                    ...gridSettings.filters,
                    [columnKey]: options
                }
            };
            setGridSettings(next);
            saveGridSettings(next);
        };

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        onClick={(e) => e.stopPropagation()}
                        className={`p-1 rounded hover:bg-muted/80 transition-colors ${currentFilters.length > 0 ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                    >
                        <Filter className={`w-3 h-3 ${currentFilters.length > 0 ? "fill-primary" : ""}`} />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 z-50 bg-popover border shadow-lg" align="start">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b">
                        <span className="text-xs font-semibold">Filter {columnKey}</span>
                        <div className="flex gap-2">
                            <button onClick={selectAll} className="text-[10px] text-primary hover:underline">All</button>
                            <button onClick={clear} className="text-[10px] text-muted-foreground hover:underline">Clear</button>
                        </div>
                    </div>
                    <ScrollArea className="h-48">
                        <div className="space-y-1">
                            {options.sort().map(opt => (
                                <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors">
                                    <Checkbox
                                        checked={currentFilters.includes(opt)}
                                        onCheckedChange={() => toggleFilter(opt)}
                                    />
                                    <span className="text-xs truncate">{opt || "(Empty)"}</span>
                                </label>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        );
    };

    const filteredItems = useMemo(() => {
        if (!inventoryItems) return [];
        let list = inventoryItems;

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter((item) =>
                item.name.toLowerCase().includes(q) ||
                item.sku.toLowerCase().includes(q)
            );
        }

        // Apply Column Filters
        const activeFilters = gridSettings?.filters || {};
        Object.keys(activeFilters).forEach(key => {
            const selectedValues = activeFilters[key];
            if (selectedValues && selectedValues.length > 0) {
                list = list.filter(item => {
                    let val = "";
                    if (key === "type") val = (item as any).productType || "";
                    else if (key === "category") val = item.category || "";
                    else if (key === "subCategory") val = item.subCategory || "";
                    else if (key === "baseUnit") val = item.baseUnit || "";
                    return selectedValues.includes(val);
                });
            }
        });

        if (gridSettings.sortCol && gridSettings.sortDir) {
            const col = gridSettings.sortCol;
            const dir = gridSettings.sortDir;
            list = [...list].sort((a, b) => {
                let aVal: any = "";
                let bVal: any = "";

                switch (col) {
                    case "sku": aVal = a.sku; bVal = b.sku; break;
                    case "productId": aVal = a.productId || ""; bVal = b.productId || ""; break;
                    case "name": aVal = a.name; bVal = b.name; break;
                    case "type": aVal = (a as any).productType || ""; bVal = (b as any).productType || ""; break;
                    case "category": aVal = a.category || ""; bVal = b.category || ""; break;
                    case "subCategory": aVal = a.subCategory || ""; bVal = b.subCategory || ""; break;
                    case "baseUnit": aVal = a.baseUnit || ""; bVal = b.baseUnit || ""; break;
                    case "quantity": aVal = a.quantity; bVal = b.quantity; break;
                    case "minQuantity": aVal = a.minQuantity; bVal = b.minQuantity; break;
                    case "purchasePrice": aVal = parseFloat(String(a.purchasePrice)); bVal = parseFloat(String(b.purchasePrice)); break;
                    case "salePrice": aVal = parseFloat(String(a.salePrice)); bVal = parseFloat(String(b.salePrice)); break;
                    case "mrp": aVal = parseFloat(String(a.mrp || 0)); bVal = parseFloat(String(b.mrp || 0)); break;
                    case "supplier": aVal = a.supplierId ? supplierMap[a.supplierId] || "" : a.supplier || ""; bVal = b.supplierId ? supplierMap[b.supplierId] || "" : b.supplier || ""; break;
                    case "lastUpdated": aVal = new Date(a.lastUpdated).getTime(); bVal = new Date(b.lastUpdated).getTime(); break;
                }

                if (typeof aVal === "number" && typeof bVal === "number") {
                    return dir === "asc" ? aVal - bVal : bVal - aVal;
                }
                return dir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
            });
        }
        return list;
    }, [inventoryItems, searchTerm, gridSettings.filters, gridSettings.sortCol, gridSettings.sortDir, supplierMap]);

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



    const getPaddingClass = () => {
        switch (gridSettings.rowHeight) {
            case "compact": return "px-3 py-1";
            case "relaxed": return "px-3 py-4";
            default: return "px-3 py-2.5";
        }
    };
    
    const getFontSizeClass = () => {
        switch (gridSettings.fontSize) {
            case "base": return "text-base";
            case "lg": return "text-lg";
            default: return "text-sm";
        }
    };

    const cellClasses = `${getPaddingClass()} ${getFontSizeClass()}`;

    return (
        <div className="flex flex-col h-full gap-6 p-6 max-w-[1600px] mx-auto w-full">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage stock levels, pricing, and suppliers.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(v => !v)}>
                            <Settings2 className="w-4 h-4" />
                        </Button>
                        {isSettingsOpen && (
                            <GridSettingsPanel
                                settings={gridSettings}
                                onSettingsChange={updateGridSettings}
                                onClose={() => setIsSettingsOpen(false)}
                            />
                        )}
                    </div>
                    {hasPermission("inventory.view") && (
                        <Button variant="outline" onClick={() => window.location.href = `/api/inventory/export?t=${Date.now()}`}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    )}
                    {hasPermission("inventory.manage") && (
                        <>
                            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                            </Button>
                            <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or Item Code..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Zoom: {zoomLevel}%</span>
                    <input 
                        type="range" 
                        min="50" 
                        max="150" 
                        step="5"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(Number(e.target.value))}
                        className="w-32 cursor-pointer accent-primary"
                        title="Adjust Grid Zoom"
                    />
                </div>
            </div>

            <div className="flex-1 min-h-[200px] bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
                    <table 
                        style={{ 
                            zoom: zoomLevel / 100,
                            tableLayout: "fixed", 
                            minWidth: ALL_COLUMNS
                                .filter(c => !gridSettings.hiddenCols.includes(c.key))
                                .reduce((sum, c) => sum + gridSettings.columnWidths[c.key], 0) 
                        }}
                        className="w-full text-sm"
                    >
                    <thead className="sticky top-0 z-10 bg-muted">
                        <tr className="border-b">
                            {ALL_COLUMNS.filter(c => !gridSettings.hiddenCols.includes(c.key)).map(col => {
                                const isSorted = gridSettings.sortCol === col.key;
                                const sortDir = isSorted ? gridSettings.sortDir : null;
                                return (
                                    <th
                                        key={col.key}
                                        style={{ width: gridSettings.columnWidths[col.key], minWidth: col.minWidth, position: "relative", userSelect: "none" }}
                                        className={`${getPaddingClass()} text-left text-xs font-semibold text-muted-foreground tracking-wide ${col.sortable ? "cursor-pointer hover:text-foreground hover:bg-muted/60 transition-colors" : ""} ${isSorted ? "text-primary bg-primary/5" : ""}`}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                    >
                                        <div className="flex items-center gap-1 pr-2">
                                            <span className="truncate">{col.label.toUpperCase()}</span>
                                            {col.key === "type" && <ColumnFilter columnKey="type" options={uniqueValues.type} />}
                                            {col.key === "category" && <ColumnFilter columnKey="category" options={uniqueValues.category} />}
                                            {col.key === "subCategory" && <ColumnFilter columnKey="subCategory" options={uniqueValues.subCategory} />}
                                            {col.key === "baseUnit" && <ColumnFilter columnKey="baseUnit" options={uniqueValues.baseUnit} />}
                                        </div>
                                        {/* Resize handle */}
                                        <div
                                            onMouseDown={e => startResize(e, col.key)}
                                            onClick={e => e.stopPropagation()}
                                            className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center group"
                                            title="Drag to resize"
                                        >
                                            <div className="w-0.5 h-4 bg-border rounded group-hover:bg-primary/60 transition-colors" />
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems?.length === 0 ? (
                            <tr>
                                <td colSpan={ALL_COLUMNS.length} className="h-24 text-center text-muted-foreground">
                                    No items found.
                                </td>
                            </tr>
                        ) : (
                            filteredItems?.map((item) => {
                                const isHidden = (k: ColKey) => gridSettings.hiddenCols.includes(k);
                                return (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    {!isHidden("sku") && <td style={{ width: gridSettings.columnWidths["sku"] }} className={`${cellClasses} font-mono text-xs`}><span className="cursor-pointer hover:underline text-primary/80 transition-colors" onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDialogOpen(true); }}>{item.sku}</span></td>}
                                    {!isHidden("productId") && <td style={{ width: gridSettings.columnWidths["productId"] }} className={`${cellClasses} font-mono text-xs text-muted-foreground`}>{item.productId || "-"}</td>}
                                    {!isHidden("name") && (
                                        <td style={{ width: gridSettings.columnWidths["name"] }} className={`${cellClasses} font-medium`}>
                                            <div className="flex items-center gap-2 overflow-hidden text-ellipsis mr-2">
                                                <span className="cursor-pointer hover:underline transition-colors" onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDialogOpen(true); }}>
                                                    {item.name}
                                                </span>
                                                {item.quantity <= item.minQuantity && (
                                                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] shrink-0">
                                                        Low Stock
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {!isHidden("type") && <td style={{ width: gridSettings.columnWidths["type"] }} className={cellClasses}><Badge variant="secondary" className="text-[10px]">{ (item as any).productType || "None" }</Badge></td>}
                                    {!isHidden("category") && <td style={{ width: gridSettings.columnWidths["category"] }} className={cellClasses}><Badge variant="outline" className="text-xs">{item.category || "Uncategorized"}</Badge></td>}
                                    {!isHidden("subCategory") && <td style={{ width: gridSettings.columnWidths["subCategory"] }} className={cellClasses}><span className="text-xs text-muted-foreground">{item.subCategory || "-"}</span></td>}
                                    {!isHidden("baseUnit") && <td style={{ width: gridSettings.columnWidths["baseUnit"] }} className={cellClasses}><span className="text-xs">{item.baseUnit || "-"}</span></td>}
                                    {!isHidden("quantity") && (
                                        <td style={{ width: gridSettings.columnWidths["quantity"] }} className={cellClasses}>
                                            <div className={item.quantity <= item.minQuantity ? "text-destructive font-bold" : ""}>
                                                {item.quantity}
                                            </div>
                                        </td>
                                    )}
                                    {!isHidden("minQuantity") && <td style={{ width: gridSettings.columnWidths["minQuantity"] }} className={`${cellClasses} text-muted-foreground`}>{item.minQuantity}</td>}
                                    {!isHidden("purchasePrice") && <td style={{ width: gridSettings.columnWidths["purchasePrice"] }} className={cellClasses}>₹{item.purchasePrice}</td>}
                                    {!isHidden("salePrice") && <td style={{ width: gridSettings.columnWidths["salePrice"] }} className={cellClasses}>₹{item.salePrice}</td>}
                                    {!isHidden("mrp") && <td style={{ width: gridSettings.columnWidths["mrp"] }} className={cellClasses}>₹{item.mrp || "0.00"}</td>}
                                    {!isHidden("batch") && (
                                        <td style={{ width: gridSettings.columnWidths["batch"] }} className={cellClasses}>
                                            <div className="flex flex-col text-xs space-y-0.5">
                                                {item.batchNumber && <span>Bn: {item.batchNumber}</span>}
                                                {item.expiryDate && <span className="text-muted-foreground opacity-80">Exp: {item.expiryDate}</span>}
                                                {!item.batchNumber && !item.expiryDate && <span className="text-muted-foreground">-</span>}
                                            </div>
                                        </td>
                                    )}
                                    {!isHidden("supplier") && <td style={{ width: gridSettings.columnWidths["supplier"] }} className={cellClasses}>{item.supplierId ? supplierMap[item.supplierId] || "-" : item.supplier || "-"}</td>}
                                    {!isHidden("lastUpdated") && (
                                        <td style={{ width: gridSettings.columnWidths["lastUpdated"] }} className={`${cellClasses} text-xs text-muted-foreground`}>
                                            {new Date(item.lastUpdated).toLocaleDateString()}
                                        </td>
                                    )}
                                    {!isHidden("actions") && hasPermission("inventory.manage") && (
                                        <td style={{ width: gridSettings.columnWidths["actions"] }} className={cellClasses}>
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
                                        </td>
                                    )}
                                </tr>
                            );})
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            <InventoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                inventoryItem={editingItem}
                suppliers={suppliers || []}
                subCategories={subCategories || []}
                categories={dynamicCategories || []}
                units={dynamicUnits || []}
                productTypes={dynamicProductTypes || []}
                taxCategories={taxCategories || []}
                taxMode={clinicSettings?.inventory_tax_mode || "exclusive"}
                key={editingItem ? `edit-${editingItem.id}` : 'new'}  
            />


            <InventoryImport
                isOpen={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
            />

        </div>
    );
}

function InventoryDialog({
    open,
    onOpenChange,
    inventoryItem,
    suppliers,
    subCategories,
    categories,
    units,
    productTypes,
    taxCategories,
    taxMode,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inventoryItem: InventoryItem | null;
    suppliers: Supplier[];
    subCategories: InventorySubCategory[];
    categories: InventoryCategory[];
    units: InventoryUnit[];
    productTypes: InventoryProductType[];
    taxCategories: TaxCategory[];
    taxMode: string;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isCreatingSubCat, setIsCreatingSubCat] = useState(false);
    const [newSubCatName, setNewSubCatName] = useState("");
    const [isCreatingUnit, setIsCreatingUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState("");

    const createUnitMutation = useMutation({
        mutationFn: async (name: string) => {
            return await apiRequest("POST", "/api/inventory-units", { name });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-units"] });
            form.setValue("baseUnit", data.name);
            setIsCreatingUnit(false);
            setNewUnitName("");
            toast({ title: "Unit created" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const createSubCatMutation = useMutation({
        mutationFn: async (name: string) => {
            return await apiRequest("POST", "/api/inventory-sub-categories", { name });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory-sub-categories"] });
            form.setValue("subCategory", data.name);
            setIsCreatingSubCat(false);
            setNewSubCatName("");
            toast({ title: "Sub Category created" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const form = useForm<InsertInventoryItem>({
        resolver: zodResolver(insertInventoryItemSchema),
        defaultValues: {
            name: "",
            sku: "",
            description: "",
            category: "",
            subCategory: "",
            baseUnit: "",
            multiUnit: [],
            quantity: 0,
            minQuantity: 5,
            mrp: "0",
            salePrice: "0",
            purchasePrice: "0",
            batchNumber: "",
            expiryDate: "",
            supplier: "",
            supplierId: undefined,
            productType: "",
            minSellingPrice: "0",
            taxCategoryId: undefined,
            batchCriteria: "",
            mfgDate: "",
            shelfDetails: "",
            purchaseSgstAmount: "0",
            purchaseCgstAmount: "0",
            saleSgstAmount: "0",
            saleCgstAmount: "0",
            lastUpdated: new Date().toISOString(),
        },
    });

    useEffect(() => {
        if (open) {
            form.reset(inventoryItem ? {
                name: inventoryItem.name,
                sku: inventoryItem.sku,
                description: inventoryItem.description || "",
                category: inventoryItem.category || "",
                subCategory: inventoryItem.subCategory || "",
                baseUnit: inventoryItem.baseUnit || "",
                multiUnit: (inventoryItem.multiUnit as any) || [],
                quantity: inventoryItem.quantity,
                minQuantity: inventoryItem.minQuantity,
                mrp: String(inventoryItem.mrp || "0"),
                salePrice: String(inventoryItem.salePrice),
                purchasePrice: String(inventoryItem.purchasePrice),
                batchNumber: inventoryItem.batchNumber || "",
                expiryDate: inventoryItem.expiryDate || "",
                supplier: inventoryItem.supplier || "",
                supplierId: inventoryItem.supplierId || undefined,
                productType: (inventoryItem as any).productType || "",
                minSellingPrice: String(inventoryItem.minSellingPrice || "0"),
                taxCategoryId: inventoryItem.taxCategoryId || undefined,
                purchaseSgstAmount: String(inventoryItem.purchaseSgstAmount || "0"),
                purchaseCgstAmount: String(inventoryItem.purchaseCgstAmount || "0"),
                saleSgstAmount: String(inventoryItem.saleSgstAmount || "0"),
                saleCgstAmount: String(inventoryItem.saleCgstAmount || "0"),
                batchCriteria: inventoryItem.batchCriteria || "",
                mfgDate: inventoryItem.mfgDate || "",
                shelfDetails: inventoryItem.shelfDetails || "",
                lastUpdated: new Date().toISOString(),
            } : {
                name: "",
                sku: "",
                description: "",
                category: "",
                subCategory: "",
                baseUnit: "",
                multiUnit: [],
                quantity: 0,
                minQuantity: 5,
                mrp: "0",
                salePrice: "0",
                purchasePrice: "0",
                batchNumber: "",
                expiryDate: "",
                supplier: "",
                supplierId: undefined,
                productType: "",
                minSellingPrice: "0",
                taxCategoryId: undefined,
                purchaseSgstAmount: "0",
                purchaseCgstAmount: "0",
                saleSgstAmount: "0",
                saleCgstAmount: "0",
                batchCriteria: "",
                mfgDate: "",
                shelfDetails: "",
                lastUpdated: new Date().toISOString(),
            });
        }
    }, [open, inventoryItem, form]);

    const { fields: multiUnitFields, append: appendMultiUnit, remove: removeMultiUnit } = useFieldArray({
        control: form.control,
        name: "multiUnit"
    });

    // Tax calculation effects
    const purchasePrice = form.watch("purchasePrice");
    const salePrice = form.watch("salePrice");
    const taxCategoryId = form.watch("taxCategoryId");

    useEffect(() => {
        const calculateTax = () => {
            if (!taxCategoryId) {
                form.setValue("purchaseSgstAmount", "0");
                form.setValue("purchaseCgstAmount", "0");
                form.setValue("saleSgstAmount", "0");
                form.setValue("saleCgstAmount", "0");
                return;
            }

            const taxCat = taxCategories.find(tc => tc.id === taxCategoryId);
            if (!taxCat) return;

            const pPrice = parseFloat(purchasePrice || "0");
            const sPrice = parseFloat(salePrice || "0");

            const pSgstRate = parseFloat(String(taxCat.purchaseSgst)) / 100;
            const pCgstRate = parseFloat(String(taxCat.purchaseCgst)) / 100;
            const sSgstRate = parseFloat(String(taxCat.salesSgst)) / 100;
            const sCgstRate = parseFloat(String(taxCat.salesCgst)) / 100;

            if (taxMode === "inclusive") {
                const pTotalRate = pSgstRate + pCgstRate;
                const pBase = pPrice / (1 + pTotalRate);
                form.setValue("purchaseSgstAmount", (pBase * pSgstRate).toFixed(2));
                form.setValue("purchaseCgstAmount", (pBase * pCgstRate).toFixed(2));

                const sTotalRate = sSgstRate + sCgstRate;
                const sBase = sPrice / (1 + sTotalRate);
                form.setValue("saleSgstAmount", (sBase * sSgstRate).toFixed(2));
                form.setValue("saleCgstAmount", (sBase * sCgstRate).toFixed(2));
            } else {
                form.setValue("purchaseSgstAmount", (pPrice * pSgstRate).toFixed(2));
                form.setValue("purchaseCgstAmount", (pPrice * pCgstRate).toFixed(2));
                form.setValue("saleSgstAmount", (sPrice * sSgstRate).toFixed(2));
                form.setValue("saleCgstAmount", (sPrice * sCgstRate).toFixed(2));
            }
        };

        calculateTax();
    }, [purchasePrice, salePrice, taxCategoryId, taxCategories, taxMode, form]);



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
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        {inventoryItem ? "Edit Inventory Item" : "Add New Inventory Item"}
                    </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="flex-1 overflow-hidden flex flex-col">
                        <Tabs defaultValue="general" className="flex flex-1 overflow-hidden">
                            <TabsList className="flex flex-col h-full bg-muted/30 border-r w-48 rounded-none p-2 gap-1 shrink-0">
                                <TabsTrigger value="general" className="justify-start w-full gap-2 px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Info className="w-4 h-4" />
                                    General Info
                                </TabsTrigger>
                                <TabsTrigger value="pricing" className="justify-start w-full gap-2 px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Banknote className="w-4 h-4" />
                                    Pricing & GST
                                </TabsTrigger>

                                <TabsTrigger value="batch" className="justify-start w-full gap-2 px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <ClipboardList className="w-4 h-4" />
                                    Batch & Details
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto p-6">
                                <TabsContent value="general" className="mt-0 space-y-4 outline-none">
                                    <FormField control={form.control} name="name"
                                        render={({ field }) => (
                                            <FormItem><FormLabel>Product Name</FormLabel>
                                                <FormControl><Input placeholder="Internal Name" {...field} /></FormControl>
                                                <FormMessage /></FormItem>
                                        )} />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="sku"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Item Code</FormLabel>
                                                    <FormControl><Input placeholder="Auto-generated" disabled={!!inventoryItem} {...field} /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="productType"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Product Type</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {field.value && !productTypes.some(pt => pt.name === field.value) && (
                                                                <SelectItem value={field.value}>{field.value}</SelectItem>
                                                            )}
                                                            {productTypes.map(pt => (
                                                                <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage /></FormItem>
                                            )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="category"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Category</FormLabel>
                                                    <Select onValueChange={(val) => {
                                                        field.onChange(val);
                                                        form.setValue("subCategory", "");
                                                        if (!inventoryItem) {
                                                            fetch(`/api/inventory/next-code/${encodeURIComponent(val)}`)
                                                                .then(res => res.json())
                                                                .then(data => data.nextCode && form.setValue("sku", data.nextCode));
                                                        }
                                                    }} value={field.value || ""}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        {!isCreatingSubCat ? (
                                            <FormField control={form.control} name="subCategory"
                                                render={({ field }) => {
                                                    const selectedCategory = form.watch("category");
                                                    const filteredSubs = selectedCategory ? subCategories.filter(c => c.category === selectedCategory) : subCategories;
                                                    return (
                                                        <FormItem><FormLabel>Sub Category</FormLabel>
                                                            <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="none">None</SelectItem>
                                                                    {filteredSubs.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <div className="-mt-1">
                                                                <button type="button" onClick={() => setIsCreatingSubCat(true)} className="text-[10px] text-primary hover:underline">+ New sub category</button>
                                                            </div>
                                                            <FormMessage /></FormItem>
                                                    );
                                                }} />
                                        ) : (
                                            <FormItem>
                                                <FormLabel>New Sub Category</FormLabel>
                                                <div className="flex gap-2">
                                                    <Input size={1} value={newSubCatName} onChange={(e) => setNewSubCatName(e.target.value)} placeholder="Name..." className="flex-1 h-8 text-xs" />
                                                    <Button type="button" size="sm" className="h-8" onClick={() => createSubCatMutation.mutate(newSubCatName)} disabled={!newSubCatName.trim() || createSubCatMutation.isPending}>Add</Button>
                                                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setIsCreatingSubCat(false)}>Cancel</Button>
                                                </div>
                                            </FormItem>
                                        )}
                                    </div>

                                    <FormField control={form.control} name="description"
                                        render={({ field }) => (
                                            <FormItem><FormLabel>Description</FormLabel>
                                                <FormControl><Input placeholder="Notes/Description" {...field} value={field.value || ""} /></FormControl>
                                                <FormMessage /></FormItem>
                                        )} />
                                </TabsContent>

                                <TabsContent value="pricing" className="mt-0 space-y-3 outline-none">
                                    <div className="grid grid-cols-4 gap-3">
                                        <FormField control={form.control} name="purchasePrice"
                                            render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Purchase Price (₹)</FormLabel>
                                                    <FormControl><Input className="h-8 text-xs" {...field} value={field.value ?? ""} type="number" step="0.01" /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="minSellingPrice"
                                            render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Min. Selling Price (₹)</FormLabel>
                                                    <FormControl><Input className="h-8 text-xs" {...field} value={field.value ?? ""} type="number" step="0.01" /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="salePrice"
                                            render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Sale Price (₹)</FormLabel>
                                                    <FormControl><Input className="h-8 text-xs" {...field} value={field.value ?? ""} type="number" step="0.01" /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="mrp"
                                            render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">MRP (₹)</FormLabel>
                                                    <FormControl><Input className="h-8 text-xs" {...field} value={field.value ?? ""} type="number" step="0.01" /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                    </div>

                                    <div className="grid grid-cols-4 gap-3 items-end">
                                        <FormField control={form.control} name="taxCategoryId"
                                            render={({ field }) => (
                                                <FormItem className="col-span-1"><FormLabel className="text-xs">GST Tax Rate</FormLabel>
                                                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value ? String(field.value) : ""}>
                                                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tax %" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {taxCategories.map(tc => <SelectItem key={tc.id} value={String(tc.id)} className="text-xs">{tc.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="quantity"
                                            render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Opening Stock</FormLabel>
                                                    <FormControl><Input className="h-8 text-xs" type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="minQuantity"
                                            render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Min. Alert Qty</FormLabel>
                                                    <FormControl><Input className="h-8 text-xs" type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        {!isCreatingUnit ? (
                                            <FormField control={form.control} name="baseUnit"
                                                render={({ field }) => (
                                                    <FormItem><FormLabel className="text-xs">Base Unit</FormLabel>
                                                        <div className="flex flex-col">
                                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                                <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {units.map(u => <SelectItem key={u.id} value={u.name} className="text-xs">{u.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <button type="button" onClick={() => setIsCreatingUnit(true)} className="text-[9px] text-primary hover:underline mt-0.5 self-end">+ New Unit</button>
                                                        </div>
                                                        <FormMessage /></FormItem>
                                                )} />
                                        ) : (
                                            <FormItem>
                                                <FormLabel className="text-xs">New Unit</FormLabel>
                                                <div className="flex gap-1">
                                                    <Input size={1} value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="Name" className="flex-1 h-8 text-xs px-2" />
                                                    <Button type="button" size="sm" className="h-8 px-2 text-[10px]" onClick={() => createUnitMutation.mutate(newUnitName)} disabled={!newUnitName.trim() || createUnitMutation.isPending}>Add</Button>
                                                    <Button type="button" variant="ghost" size="sm" className="h-8 px-1" onClick={() => setIsCreatingUnit(false)}><X className="w-3 h-3" /></Button>
                                                </div>
                                            </FormItem>
                                        )}
                                    </div>

                                    <div className="h-px bg-border my-1" />
                                    
                                    <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-xs font-semibold">Multi-Unit Conversions</span>
                                                <span className="text-[10px] text-muted-foreground">(Define larger units like Strips or Boxes)</span>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendMultiUnit({ name: "", conversion: 1, purchasePrice: "", salePrice: "", mrp: "" })} className="h-7 text-xs px-2">
                                                <Plus className="w-3 h-3 mr-1" /> Add Unit
                                            </Button>
                                        </div>
                                        {multiUnitFields.length > 0 ? (
                                            <div className="space-y-2">
                                                {multiUnitFields.map((field, index) => (
                                                    <div key={field.id} className="flex gap-2 items-end bg-background/50 p-2 rounded-md border border-dashed">
                                                        <FormField control={form.control} name={`multiUnit.${index}.name`} render={({ field }) => (
                                                            <FormItem className="flex-1 space-y-1"><FormLabel className="text-[10px]">Unit Name</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-7 text-xs">
                                                                            <SelectValue placeholder="Select" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {units.map(u => (
                                                                            <SelectItem key={u.id} value={u.name} className="text-xs">{u.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name={`multiUnit.${index}.conversion`} render={({ field }) => (
                                                            <FormItem className="w-20 space-y-1"><FormLabel className="text-[10px]">Qty (#)</FormLabel>
                                                                <FormControl><Input type="number" className="h-7 text-xs px-2" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name={`multiUnit.${index}.purchasePrice`} render={({ field }) => (
                                                            <FormItem className="flex-1 space-y-1"><FormLabel className="text-[10px]">Pur. Price</FormLabel>
                                                                <FormControl><Input type="number" step="0.01" className="h-7 text-xs px-2" placeholder="Auto" {...field} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name={`multiUnit.${index}.salePrice`} render={({ field }) => (
                                                            <FormItem className="flex-1 space-y-1"><FormLabel className="text-[10px]">Sale Price</FormLabel>
                                                                <FormControl><Input type="number" step="0.01" className="h-7 text-xs px-2" placeholder="Auto" {...field} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name={`multiUnit.${index}.mrp`} render={({ field }) => (
                                                            <FormItem className="flex-1 space-y-1"><FormLabel className="text-[10px]">MRP</FormLabel>
                                                                <FormControl><Input type="number" step="0.01" className="h-7 text-xs px-2" placeholder="Auto" {...field} /></FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeMultiUnit(index)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-center italic text-muted-foreground py-1 border border-dashed rounded bg-background/30">No sub-units defined</p>
                                        )}
                                    </div>
                                </TabsContent>



                                <TabsContent value="batch" className="mt-0 space-y-4 outline-none">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="batchNumber"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Default Batch Number</FormLabel>
                                                    <FormControl><Input {...field} placeholder="Optional" value={field.value || ""} /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="batchCriteria"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Batch Creation Trigger</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Criteria" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="On MRP Change">On MRP Change</SelectItem>
                                                            <SelectItem value="Sales Price/MRP Change">Sales Price/MRP Change</SelectItem>
                                                            <SelectItem value="On Purchase Price Change">On Purchase Price Change</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage /></FormItem>
                                            )} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="mfgDate"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>MFG. Date</FormLabel>
                                                    <FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="expiryDate"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>EXP. Date</FormLabel>
                                                    <FormControl><Input {...field} type="date" value={field.value || ""} /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="shelfDetails"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Shelf / Location</FormLabel>
                                                    <FormControl><Input {...field} placeholder="Room 1, Rack A" value={field.value || ""} /></FormControl>
                                                    <FormMessage /></FormItem>
                                            )} />
                                        <FormField control={form.control} name="supplierId"
                                            render={({ field }) => (
                                                <FormItem><FormLabel>Primary Supplier</FormLabel>
                                                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} value={field.value ? String(field.value) : ""}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage /></FormItem>
                                            )} />
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        <div className="p-6 border-t bg-muted/10 flex justify-end gap-3 shrink-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={mutation.isPending} className="min-w-[100px]">
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {inventoryItem ? "Update Item" : "Create Item"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

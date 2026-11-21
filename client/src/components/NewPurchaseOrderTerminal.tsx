import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  X, Plus, Save, ChevronDown, Search, Loader2, Trash2, 
  Package, ShoppingCart, Truck, CheckCircle2, Minus, Maximize2, ChevronUp,
  ArrowLeft, Printer, FileText
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Supplier, InventoryItem, PurchaseOrder } from "@shared/schema";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PurchaseOrderRow {
  id: string;
  inventoryItemId: number | null;
  sku: string;
  name: string;
  qty: number | string;
  unit: string;
  purchasePrice: string;
  mrp: string;
  stock: number;
  taxCategoryId: number | null;
  sgstAmount: string; // Per unit
  cgstAmount: string; // Per unit
  total: number; // (qty * rate) + (qty * sgstAmount) + (qty * cgstAmount)
  unitOptions?: { name: string; conversion: number; purchasePrice?: string; mrp?: string }[];
}

interface NewPurchaseOrderTerminalProps {
  onSaved?: () => void;
}

export const openNewPurchaseOrderTerminal = (purchaseOrderId?: number) => {
  if (purchaseOrderId) {
    window.dispatchEvent(new CustomEvent("open-purchase-order-terminal", { detail: { purchaseOrderId } }));
  } else {
    window.dispatchEvent(new Event("open-purchase-order-terminal"));
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function EditCell({
  value,
  onChange,
  type = "text",
  className = "",
  readOnly = false,
  align = "left",
  placeholder = "",
  id,
  onKeyDown,
  onFocus,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  readOnly?: boolean;
  align?: "left" | "right" | "center";
  placeholder?: string;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      readOnly={readOnly}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent border-none outline-none focus:ring-0 p-1 text-sm h-7 transition-all focus:bg-primary/5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        readOnly && "text-muted-foreground cursor-not-allowed",
        className
      )}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewPurchaseOrderTerminal({ onSaved }: NewPurchaseOrderTerminalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Queries — only load when terminal is open to avoid startup overhead
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"], enabled: isOpen });
  const { data: inventory } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"], enabled: isOpen });
  const { data: taxCategories } = useQuery<any[]>({ queryKey: ["/api/tax-categories"], enabled: isOpen });

  // Purchase Order State
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  
  const [rows, setRows] = useState<PurchaseOrderRow[]>([
    { id: genId(), inventoryItemId: null, sku: "", name: "", qty: 1, unit: "", purchasePrice: "0", mrp: "0", stock: 0, taxCategoryId: null, sgstAmount: "0", cgstAmount: "0", total: 0 }
  ]);
  
  const [notes, setNotes] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  // Focus management
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const supplierInputRef = useRef<HTMLInputElement>(null);

  const [enableNavQuery, setEnableNavQuery] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

  // Existing Purchase Orders (for navigation)
  const { data: allOrders = [] } = useQuery<PurchaseOrder[]>({ 
    queryKey: ["/api/purchase-orders"], 
    enabled: isOpen && (enableNavQuery || !!viewingOrderId) 
  });

  // Fetch full order details
  const { data: fullViewingOrder, isFetching: isFetchingFullOrder } = useQuery<any>({
    queryKey: ["/api/purchase-orders", viewingOrderId],
    queryFn: async () => {
      if (!viewingOrderId) return null;
      const res = await apiRequest("GET", `/api/purchase-orders/${viewingOrderId}`);
      if (!res.ok) throw new Error("Failed to load purchase order");
      return res.json();
    },
    enabled: !!viewingOrderId,
  });

  useEffect(() => {
    const handleOpen = (e: any) => {
      const pid = e.detail?.purchaseOrderId;
      if (pid) {
        setViewingOrderId(pid);
        setMinimized(false);
        setIsOpen(true);
      } else {
        setViewingOrderId(null);
        resetTerminal();
        setMinimized(false);
        setIsOpen(true);
      }
    };
    window.addEventListener("open-purchase-order-terminal", handleOpen);
    return () => window.removeEventListener("open-purchase-order-terminal", handleOpen);
  }, []);

  useEffect(() => {
    if (fullViewingOrder && inventory && suppliers) {
        setSupplierId(fullViewingOrder.supplierId);
        const s = suppliers.find(sup => sup.id === fullViewingOrder.supplierId);
        if (s) setSupplierSearch(s.name);
        setNotes(fullViewingOrder.notes || "");
        setOrderNumber(fullViewingOrder.orderNumber || "");
        const newRows = fullViewingOrder.items.map((item: any) => {
            const inv = inventory.find(i => i.id === item.inventoryItemId);
            return {
                id: genId(),
                inventoryItemId: item.inventoryItemId,
                sku: inv?.sku || "",
                name: inv?.name || `Item #${item.inventoryItemId}`,
                qty: item.quantity,
                unit: inv?.baseUnit || "Unit",
                purchasePrice: String(item.unitPrice),
                mrp: String(item.mrp || 0),
                stock: inv?.quantity || 0,
                taxCategoryId: inv?.taxCategoryId || null,
                sgstAmount: String(item.sgstAmount || 0),
                cgstAmount: String(item.cgstAmount || 0),
                total: parseFloat(String(item.total))
            };
        });
        setRows(newRows);
        setOrderDate(fullViewingOrder.date?.split("T")[0] || format(new Date(), "yyyy-MM-dd"));
    }
  }, [fullViewingOrder, inventory, suppliers]);

  const { data: nextNumData, refetch: refetchNextNum } = useQuery<{ orderNumber: string }>({
    queryKey: ["/api/purchase-orders/next-number"],
    staleTime: 0,
  });

  const [orderDate, setOrderDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const orderLabel = nextNumData?.orderNumber ?? "NEW ORDER";
  const displayedLabel = viewingOrderId && fullViewingOrder ? fullViewingOrder.orderNumber : orderLabel;

  const handlePrevOrder = () => {
    setEnableNavQuery(true);
    const sorted = [...allOrders].sort((a,b) => b.id - a.id);
    if (!sorted.length) return;
    if (viewingOrderId === null) {
      setViewingOrderId(sorted[0].id);
    } else {
      const idx = sorted.findIndex(i => i.id === viewingOrderId);
      if (idx >= 0 && idx < sorted.length - 1) setViewingOrderId(sorted[idx + 1].id);
    }
  };

  const handleNextOrder = () => {
    setEnableNavQuery(true);
    const sorted = [...allOrders].sort((a,b) => b.id - a.id);
    if (viewingOrderId !== null) {
      const idx = sorted.findIndex(i => i.id === viewingOrderId);
      if (idx > 0) {
        setViewingOrderId(sorted[idx - 1].id);
      } else {
        setViewingOrderId(null);
        resetTerminal();
        refetchNextNum();
      }
    }
  };

  const handleNewOrder = () => {
    setViewingOrderId(null);
    resetTerminal();
    refetchNextNum();
  };

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return [];
    return suppliers?.filter(s => 
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.phone.includes(supplierSearch)
    ).slice(0, 5) || [];
  }, [suppliers, supplierSearch]);

  const filteredInventory = useCallback((q: string) => {
    if (!inventory) return [];
    const query = (q || "").toLowerCase().trim();
    if (!query) return []; 
    
    return inventory.filter(i => 
      (i.name || "").toLowerCase().includes(query) ||
      (i.sku || "").toLowerCase().includes(query) ||
      (i.productId || "").toLowerCase().includes(query) ||
      (i.category || "").toLowerCase().includes(query) ||
      (i.supplier || "").toLowerCase().includes(query)
    ).slice(0, 50);
  }, [inventory]);

  const addRow = () => {
    const newId = genId();
    setRows(prev => [...prev, { id: newId, inventoryItemId: null, sku: "", name: "", qty: 1, unit: "", purchasePrice: "0", mrp: "0", stock: 0, taxCategoryId: null, sgstAmount: "0", cgstAmount: "0", total: 0, unitOptions: [] }]);
    return newId;
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([{ id: genId(), inventoryItemId: null, sku: "", name: "", qty: 1, unit: "", purchasePrice: "0", mrp: "0", stock: 0, taxCategoryId: null, sgstAmount: "0", cgstAmount: "0", total: 0, unitOptions: [] }]);
    } else {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, updates: Partial<PurchaseOrderRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
      const q = parseFloat(String(next.qty)) || 0;
      const rate = parseFloat(next.purchasePrice) || 0;
      const taxableAmount = q * rate;
      
      const sAmt = parseFloat(next.sgstAmount) || 0;
      const cAmt = parseFloat(next.cgstAmount) || 0;
      
      next.total = taxableAmount + (q * sAmt) + (q * cAmt);
      return next;
    }));
  };

  const subtotal = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/purchase-orders", data);
      if (!res.ok) throw new Error("Failed to save purchase order");
      const result = await res.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders/next-number"] });
      toast({ title: "Purchase Order Saved", description: "The order has been created successfully." });
      setIsOpen(false);
      resetTerminal();
      onSaved?.();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const resetTerminal = () => {
    setSupplierId(null);
    setSupplierSearch("");
    setRows([{ id: genId(), inventoryItemId: null, sku: "", name: "", qty: 1, unit: "", purchasePrice: "0", mrp: "0", stock: 0, taxCategoryId: null, sgstAmount: "0", cgstAmount: "0", total: 0, unitOptions: [] }]);
    setNotes("");
    setOrderNumber("");
    setViewingOrderId(null);
    setOrderDate(format(new Date(), "yyyy-MM-dd"));
    setEnableNavQuery(false);
  };

  const handleSave = () => {
    if (!supplierId) return toast({ title: "Supplier required", variant: "destructive" });
    const validRows = rows.filter(r => r.inventoryItemId !== null);
    if (validRows.length === 0) return toast({ title: "Add at least one item", variant: "destructive" });

    const payload: any = {
      supplierId,
      date: orderDate,
      totalAmount: subtotal.toFixed(2),
      notes,
      items: validRows.map(r => ({
        inventoryItemId: r.inventoryItemId,
        quantity: parseInt(String(r.qty)) || 0,
        unitPrice: parseFloat(r.purchasePrice).toFixed(2),
        sgstRate: "0",
        cgstRate: "0",
        sgstAmount: parseFloat(r.sgstAmount).toFixed(2),
        cgstAmount: parseFloat(r.cgstAmount).toFixed(2),
        total: r.total.toFixed(2),
        unit: r.unit
      }))
    };

    saveMutation.mutate(payload);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, rowId: string) => {
    const target = e.target as HTMLElement;
    if (!target.id) return;
    
    const [col, rowId_] = target.id.split("-");
    
    if (e.key === "Enter") {
      e.preventDefault();
      
      let nextCol = "";
      if (col === "sku") {
        const skuValue = rows.find(r => r.id === rowId)?.sku?.trim();
        if (skuValue) {
          const match = inventory?.find(i => i.sku.toLowerCase() === skuValue.toLowerCase());
          if (match) {
            updateRow(rowId, {
              inventoryItemId: match.id,
              sku: match.sku,
              name: match.name,
              purchasePrice: String(match.purchasePrice),
              mrp: String(match.mrp),
              stock: match.quantity,
              unit: match.baseUnit || "Unit",
              unitOptions: [
                { name: match.baseUnit || "Unit", conversion: 1, purchasePrice: String(match.purchasePrice), mrp: String(match.mrp) },
                ...((match.multiUnit as any[]) || []).map(mu => ({
                  name: mu.name,
                  conversion: mu.conversion,
                  purchasePrice: String(mu.purchasePrice || (parseFloat(String(match.purchasePrice)) * mu.conversion).toFixed(2)),
                  mrp: String(mu.mrp || (parseFloat(String(match.mrp || 0)) * mu.conversion).toFixed(2))
                }))
              ],
              taxCategoryId: match.taxCategoryId || null,
              sgstAmount: String((match as any).purchaseSgstAmount || 0),
              cgstAmount: String((match as any).purchaseCgstAmount || 0)
            });
            nextCol = "qty";
          } else {
             nextCol = "name";
          }
        } else {
          nextCol = "name";
        }
      }
      else if (col === "name") nextCol = "qty";
      else if (col === "qty") nextCol = "purchasePrice";
      else if (col === "purchasePrice") nextCol = "sgstAmount";
      else if (col === "sgstAmount") nextCol = "cgstAmount";
      else if (col === "cgstAmount") {
        const idx = rows.findIndex(r => r.id === rowId);
        if (idx === rows.length - 1) {
          const newId = addRow();
          setTimeout(() => document.getElementById(`name-${newId}`)?.focus(), 50);
        } else {
          const nextRowId = rows[idx + 1].id;
          setTimeout(() => document.getElementById(`name-${nextRowId}`)?.focus(), 10);
        }
        return;
      }
      
      if (nextCol) {
        setTimeout(() => document.getElementById(`${nextCol}-${rowId}`)?.focus(), 10);
      }
    }
  };

  if (!isOpen) return null;

  if (minimized) {
    return (
      <div
        className="fixed bottom-4 left-1/3 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-2xl shadow-2xl cursor-pointer select-none"
        style={{
          background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
          minWidth: 420,
          boxShadow: "0 8px 32px rgba(67,56,202,0.45), 0 2px 8px rgba(0,0,0,0.18)",
        }}
        onClick={() => setMinimized(false)}
        title="Click to restore purchase order terminal"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
        </span>

        <span className="text-white font-black text-sm tracking-wide">• {displayedLabel}
          {supplierSearch && (
            <span className="font-normal text-white/70 ml-2">
              — {supplierSearch}
            </span>
          )}
        </span>

        <div className="h-4 w-px bg-white/30 mx-1" />
        <span className="font-mono font-black text-white text-sm">₹{fmtNum(subtotal)}</span>

        <div className="ml-auto flex items-center gap-2">
           <Maximize2 className="w-4 h-4 text-white" />
           <X className="w-4 h-4 text-white/50 hover:text-white" onClick={e => { e.stopPropagation(); setIsOpen(false); }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-0 z-[101] bg-black/60 flex items-center justify-center p-4 transition-all animate-in fade-in zoom-in duration-200",
      isMaximized && "p-0"
    )}>
      <div className={cn(
        "bg-background w-full rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all duration-300",
        isMaximized ? "h-full rounded-none" : "max-w-[1280px] h-[90vh]"
      )}>
        {/* Header */}
        <div className="bg-[#4338ca] px-4 py-2.5 flex items-center justify-between text-white border-b border-primary-foreground/10 shrink-0 select-none shadow-lg">
          <div className="flex items-center gap-4">
            <button className="hover:bg-white/10 p-1.5 rounded-lg transition-colors" onClick={() => setIsOpen(false)}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="font-black text-sm tracking-tighter uppercase whitespace-nowrap">{displayedLabel}</span>
                <div 
                  onMouseEnter={() => setEnableNavQuery(true)}
                  className="flex flex-col -space-y-1"
                >
                  <button 
                    className="hover:bg-white/20 rounded-md p-0.5 transition-all active:scale-90"
                    onClick={handleNextOrder}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button 
                    className="hover:bg-white/20 rounded-md p-0.5 transition-all active:scale-90"
                    onClick={handlePrevOrder}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {viewingOrderId && (
                <button 
                  className={cn(
                    "bg-white/10 hover:bg-amber-400 hover:text-amber-950 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px] font-black transition-all border border-white/5 group active:scale-95 uppercase tracking-wider",
                    !viewingOrderId && "bg-amber-400 text-amber-950"
                  )}
                  onClick={handleNewOrder}
                >
                  <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> New
                </button>
              )}

              <button 
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px] font-black transition-all border border-white/5 active:scale-95 uppercase tracking-wider"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-lg border border-white/10 hidden sm:flex h-9">
              <ShoppingCart className="w-4 h-4 opacity-70" />
              <span className="text-[10px] font-black tracking-widest uppercase">PURCHASE ORDER</span>
            </div>
            <div className="flex items-center border-l border-white/10 pl-4 ml-2 gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10 rounded-lg text-white" onClick={() => setMinimized(true)}>
                <Minus className="w-4.5 h-4.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10 rounded-lg text-white" onClick={() => setIsMaximized(!isMaximized)}>
                <Maximize2 className="w-4.5 h-4.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-red-500 hover:text-white rounded-lg text-white group" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 overflow-hidden relative">
          {isFetchingFullOrder && (
            <div className="absolute inset-0 z-50 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <span className="text-sm font-bold text-slate-600 animate-pulse">Loading Order Details...</span>
              </div>
            </div>
          )}
          {/* Section 1: Supplier Info */}
          <div className="bg-white border-b px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0 relative z-50 shadow-sm">
            <div className="col-span-2 relative">
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1 tracking-wider">
                  <Truck className="w-3 h-3" /> Supplier Details
                </label>
                <div className="relative group">
                  <Input 
                    ref={supplierInputRef}
                    placeholder="Search by name or phone..."
                    className={cn(
                      "h-11 pl-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all rounded-xl",
                      supplierId && "border-indigo-200 bg-indigo-50/30 font-semibold"
                    )}
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setShowSupplierResults(true);
                      if (supplierId) setSupplierId(null);
                    }}
                    onFocus={() => setShowSupplierResults(true)}
                  />
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  {supplierId && <CheckCircle2 className="absolute right-4 top-3.5 w-4 h-4 text-indigo-600" />}

                  {/* Supplier Dropdown */}
                  {showSupplierResults && filteredSuppliers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {filteredSuppliers.map(s => (
                        <div 
                           key={s.id} 
                           className="px-4 py-3 hover:bg-primary/5 cursor-pointer border-b last:border-0 flex items-center justify-between group transition-colors"
                           onClick={() => {
                             setSupplierId(s.id);
                             setSupplierSearch(s.name);
                             setShowSupplierResults(false);
                           }}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800 group-hover:text-primary transition-colors">{s.name}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              {s.phone} • {s.address || "No address"}
                            </span>
                          </div>
                          <div className="bg-primary/5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                             <Plus className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex items-center gap-1 tracking-wider">
                Order Date
              </label>
              <Input 
                type="date" 
                className="h-11 bg-slate-50 border-slate-200 rounded-xl" 
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
              />
            </div>
          </div>

          {/* Table Area */}
          <div ref={gridContainerRef} className="flex-1 overflow-visible p-6 sm:overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
             <div className="bg-white rounded-2xl border shadow-sm overflow-visible">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b text-[11px] font-black uppercase text-slate-500 tracking-widest text-left">
                      <th className="px-4 py-4 w-12 text-center">#</th>
                      <th className="px-4 py-4 w-40">ITEM CODE</th>
                      <th className="px-4 py-4">ITEM DESCRIPTION</th>
                      <th className="px-4 py-4 w-24 text-center">QTY</th>
                      <th className="px-4 py-4 w-24 text-center">UNIT</th>
                      <th className="px-4 py-4 w-28 text-right">UNIT PRICE</th>
                      <th className="px-4 py-4 w-20 text-center text-teal-600">SGST (₹)</th>
                      <th className="px-4 py-4 w-20 text-center text-teal-600">CGST (₹)</th>
                      <th className="px-4 py-4 w-32 text-right">TOTAL</th>
                      <th className="px-4 py-4 w-20 text-center">STOCK</th>
                      <th className="px-4 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <Row 
                        key={row.id} 
                        row={row} 
                        index={idx}
                        onUpdate={(u) => updateRow(row.id, u)}
                        onRemove={() => removeRow(row.id)}
                        onAddNext={addRow}
                        searchInventory={filteredInventory}
                        onKeyDown={(e) => handleRowKeyDown(e, row.id)}
                        taxCategories={taxCategories || []}
                      />
                    ))}
                  </tbody>
                </table>
                <div className="p-4 bg-slate-50/30 border-t flex items-center gap-4">
                   <button onClick={addRow} className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all flex items-center gap-2">
                     <Plus className="w-4 h-4" /> Add Row (F2)
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 shrink-0 border-t p-6 pb-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 block tracking-widest">Additional Notes</label>
              <textarea 
                placeholder="Enter any internal remarks or special instructions for the supplier..."
                className="w-full h-[88px] rounded-2xl border bg-white p-4 text-sm resize-none focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-400"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col justify-end space-y-4">
                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 shadow-sm opacity-50 cursor-not-allowed">
                   <FileText className="w-5 h-5 text-indigo-600" />
                   <div className="flex flex-col">
                      <span className="text-sm font-bold text-indigo-800 uppercase text-[10px] tracking-widest">Order Summary</span>
                      <span className="text-[10px] text-indigo-600 font-medium tracking-tight">
                        Total Items: {rows.filter(r => r.inventoryItemId).length} | 
                        SGST: ₹{fmtNum(rows.reduce((s, r) => s + (parseFloat(r.sgstAmount) * (parseFloat(String(r.qty)) || 0)), 0))} | 
                        CGST: ₹{fmtNum(rows.reduce((s, r) => s + (parseFloat(r.cgstAmount) * (parseFloat(String(r.qty)) || 0)), 0))}
                      </span>
                   </div>
                </div>
            </div>

            <div className="flex flex-col justify-end gap-3 min-w-[240px]">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl shadow-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estimated Total</span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono">INR</span>
                    </div>
                    <div className="text-4xl font-black tracking-tighter">
                      ₹ {fmtNum(subtotal)}
                    </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl text-base font-bold shadow-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Discard
                  </Button>
                  <Button 
                    disabled={saveMutation.isPending || !supplierId}
                    className="flex-[2] h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 group bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleSave}
                  >
                    {saveMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                         <Save className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" /> 
                         SAVE ORDER
                      </>
                    )}
                  </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function Row({ row, index, onUpdate, onRemove, onAddNext, searchInventory, onKeyDown, taxCategories }: {
  row: PurchaseOrderRow;
  index: number;
  onUpdate: (u: Partial<PurchaseOrderRow>) => void;
  onRemove: () => void;
  onAddNext: () => void;
  searchInventory: (q: string) => any[];
  onKeyDown: (e: React.KeyboardEvent) => void;
  taxCategories: any[];
}) {
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const results = searchInventory(search);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (item: InventoryItem) => {
    onUpdate({
      inventoryItemId: item.id,
      sku: item.sku,
      name: item.name,
      purchasePrice: String(item.purchasePrice),
      mrp: String(item.mrp),
      stock: item.quantity,
      unit: item.baseUnit || "Unit",
      unitOptions: [
        { name: item.baseUnit || "Unit", conversion: 1, purchasePrice: String(item.purchasePrice), mrp: String(item.mrp) },
        ...((item.multiUnit as any[]) || []).map(mu => ({
          name: mu.name,
          conversion: mu.conversion,
          purchasePrice: String(mu.purchasePrice || (parseFloat(String(item.purchasePrice)) * mu.conversion).toFixed(2)),
          mrp: String(mu.mrp || (parseFloat(String(item.mrp || 0)) * mu.conversion).toFixed(2))
        }))
      ],
      taxCategoryId: item.taxCategoryId || null,
      sgstAmount: String((item as any).purchaseSgstAmount || 0),
      cgstAmount: String((item as any).purchaseCgstAmount || 0)
    });
    setSearch("");
    setShowResults(false);
    setTimeout(() => document.getElementById(`qty-${row.id}`)?.focus(), 50);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    if (showResults) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showResults]);

  return (
    <tr className="border-b last:border-0 h-14 group hover:bg-slate-50/50 transition-colors">
      <td className="px-4 text-center text-xs font-bold text-slate-400">{index + 1}</td>
      <td className="px-4">
        <EditCell 
          id={`sku-${row.id}`}
          value={row.sku} 
          onChange={v => onUpdate({ sku: v })} 
          onKeyDown={onKeyDown}
          onFocus={e => (e.target as HTMLInputElement).select()}
          placeholder="VT-100" 
          className="font-mono text-xs uppercase font-bold"
        />
      </td>
      <td className="px-4 relative">
        <Popover open={showResults && results.length > 0} onOpenChange={setShowResults}>
          <PopoverTrigger asChild>
            <div className="relative">
              <EditCell 
                id={`name-${row.id}`}
                value={search || row.name} 
                onChange={v => {
                  setSearch(v);
                  setShowResults(true);
                  if (row.inventoryItemId) onUpdate({ inventoryItemId: null });
                }}
                onKeyDown={e => {
                  if (showResults && results.length > 0) {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSelect(results[0]);
                      return;
                    }
                  }
                  onKeyDown(e);
                }}
                onFocus={(e) => {
                  setShowResults(true);
                  (e.target as HTMLInputElement).select();
                }}
                placeholder="Type item name to search..."
                className={cn(row.inventoryItemId && "font-semibold text-slate-800")}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[400px] p-0 border-indigo-200 shadow-2xl z-[1000] overflow-hidden" 
            align="start" 
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
               <div className="px-3 py-2 bg-indigo-50/50 border-b border-indigo-100 backdrop-blur-sm shadow-sm">
                 <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Inventory</span>
               </div>
               <div className="max-h-80 overflow-y-auto">
                 {results.map((i: any) => (
                   <div 
                     key={i.id} 
                     className="flex items-center justify-between px-3 py-1.5 cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-indigo-50 transition-colors group/item"
                     onMouseDown={(e) => {
                       e.preventDefault();
                       handleSelect(i);
                     }}
                   >
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="font-medium text-zinc-800 group-hover/item:text-indigo-950 truncate">{i.name}</span>
                        <span className="text-zinc-400 text-[10px]">{i.sku}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-indigo-700 font-bold">
                          ₹{parseFloat(String(i.purchasePrice)).toLocaleString("en-IN")}
                        </span>
                        <span className={cn(
                          "text-[10px] font-semibold",
                          i.quantity === 0 ? "text-red-500" :
                          i.quantity <= 5 ? "text-amber-500" : "text-emerald-600"
                        )}>
                          Qty: {i.quantity}
                        </span>
                      </div>
                   </div>
                 ))}
               </div>
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-4">
        <EditCell 
          id={`qty-${row.id}`}
          type="number"
          value={row.qty} 
          onChange={v => onUpdate({ qty: v })} 
          onKeyDown={onKeyDown}
          onFocus={e => (e.target as HTMLInputElement).select()}
          align="center"
          className="font-bold"
        />
      </td>
      <td className="px-4">
        {row.unitOptions && row.unitOptions.length > 0 ? (
          <Select 
            value={row.unit} 
            onValueChange={(val) => {
              const opt = row.unitOptions?.find(o => o.name === val);
              if (opt) {
                onUpdate({ 
                  unit: val, 
                  purchasePrice: opt.purchasePrice || row.purchasePrice,
                  mrp: opt.mrp || row.mrp
                });
              }
            }}
          >
            <SelectTrigger className="h-7 text-[10px] font-bold uppercase bg-transparent border-none focus:ring-0 px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {row.unitOptions.filter(opt => !!opt.name).map(opt => (
                <SelectItem key={opt.name} value={opt.name} className="text-[10px] uppercase font-bold">
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-center text-muted-foreground uppercase text-[10px] font-bold py-1">
            {row.unit || "Unit"}
          </div>
        )}
      </td>
      <td className="px-4">
        <EditCell 
          id={`purchasePrice-${row.id}`}
          type="number"
          value={row.purchasePrice} 
          onChange={v => onUpdate({ purchasePrice: v })} 
          onKeyDown={onKeyDown}
          onFocus={e => (e.target as HTMLInputElement).select()}
          align="right"
          className="font-mono text-xs font-bold"
        />
      </td>
      <td className="px-4">
        <EditCell 
          id={`sgstAmount-${row.id}`}
          type="number"
          value={row.sgstAmount} 
          onChange={v => onUpdate({ sgstAmount: v })} 
          onKeyDown={onKeyDown}
          onFocus={e => (e.target as HTMLInputElement).select()}
          align="center"
          className="font-mono text-xs text-teal-600"
        />
      </td>
      <td className="px-4">
        <EditCell 
          id={`cgstAmount-${row.id}`}
          type="number"
          value={row.cgstAmount} 
          onChange={v => onUpdate({ cgstAmount: v })} 
          onKeyDown={onKeyDown}
          onFocus={e => (e.target as HTMLInputElement).select()}
          align="center"
          className="font-mono text-xs text-teal-600"
        />
      </td>
      <td className="px-4">
        <div className="text-right font-mono text-sm font-black text-slate-700">
          {fmtNum(row.total)}
        </div>
      </td>
      <td className="px-4">
        <div className={cn(
          "text-center text-[10px] font-black tracking-tighter",
          row.stock <= 5 ? "text-red-500" : "text-slate-400"
        )}>
          {row.stock}
        </div>
      </td>
      <td className="px-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50" onClick={onRemove}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
}

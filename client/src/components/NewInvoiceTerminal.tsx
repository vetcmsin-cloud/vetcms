import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  X, Plus, Save, ChevronDown, Search, User, Phone, MapPin,
  Stethoscope, Building2, Loader2, Trash2, AlertTriangle,
  CreditCard, Banknote, Smartphone, FileCheck, ArrowLeft,
  Dog, CheckCircle2, Minus, Maximize2, ChevronUp, Printer, ChevronDownSquare,
  MessageCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { Owner, Pet, FeeStructure } from "@shared/schema";
import type { InvoiceWithMeta } from "./invoice-dialogs";
import { ViewInvoiceDialog, MarkAsPaidDialog, InvoiceWhatsAppSender } from "./invoice-dialogs";

// Minimal shape from /api/inventory
interface InventoryItem {
  id: number;
  productId: string | null;
  sku: string;
  name: string;
  quantity: number;
  salePrice: number | string;
  mrp: number | string;
  purchasePrice: number | string;
  baseUnit: string | null;
  multiUnit?: { name: string; conversion: number; salePrice?: string | number; mrp?: string | number }[];
}



// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface BillingRow {
  id: string;
  feeId: number | null;
  productCode: string;
  description: string;
  qty: number | string;
  unit: string;
  rate: string;
  salesPrice: string;
  mrp: string;
  total: number;
  stock: number | string;
  availableUnits?: { name: string; conversion: number; salePrice?: string | number; mrp?: string | number }[];

  baseRate?: string;
  baseSalesPrice?: string;
  baseMrp?: string;
}


interface NewInvoiceTerminalProps {
  onSaved?: (inv: InvoiceWithMeta) => void;
}

export const openNewInvoiceTerminal = (invoiceId?: number | Event | React.SyntheticEvent) => {
  if (typeof invoiceId === "number") {
    window.dispatchEvent(new CustomEvent("open-invoice-terminal", { detail: { invoiceId } }));
  } else {
    window.dispatchEvent(new Event("open-invoice-terminal"));
  }
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// â”€â”€â”€ Editable Cell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseOpOwner(raw: string | null | undefined) {
  if (!raw) return { name: "Walk-in", phone: "", address: "" };
  const parts = raw.split("|").map(s => s.trim());
  const name = parts[0] || "Walk-in";
  const phonePart = parts.find(p => p.startsWith("Ph:"));
  const addrPart  = parts.find(p => p.startsWith("Addr:"));
  return {
    name,
    phone: phonePart ? phonePart.replace("Ph:", "").trim() : "",
    address: addrPart ? addrPart.replace("Addr:", "").trim() : "",
  };
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
  onChange?: (v: string) => void;
  type?: string;
  className?: string;
  readOnly?: boolean;
  align?: "left" | "right" | "center";
  placeholder?: string;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className={cn(
        "w-full h-full px-1.5 py-1 text-xs border-0 outline-none bg-transparent focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded-sm",
        align === "right" && "text-right",
        align === "center" && "text-center",
        readOnly && "bg-zinc-50 text-zinc-500 cursor-default",
        type === "number" && "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
    />
  );
}

// â”€â”€â”€ Unified Search Popup (Services + Inventory) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useSearchAutoScroll(activeIndex: number) {
  useEffect(() => {
    if (activeIndex >= 0) {
      const el = document.getElementById(`search-item-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeIndex]);
}

function FeeSearchPopup({
  fees,
  inventory,
  activeIndex,
  onSelectFee,
  onSelectInventory,
}: {
  fees: FeeStructure[];
  inventory: InventoryItem[];
  activeIndex: number;
  onSelectFee: (f: FeeStructure) => void;
  onSelectInventory: (item: InventoryItem) => void;
}) {
  useSearchAutoScroll(activeIndex);
  const hasResults = fees.length > 0 || inventory.length > 0;
  let renderIdx = 0;

  return (
    <div className="absolute top-full left-0 z-50 w-96 max-h-72 overflow-y-auto bg-white border border-sky-300 rounded-md shadow-xl text-xs">
      {!hasResults ? (
        <div className="px-3 py-4 text-zinc-400 text-center">No matching services or items</div>
      ) : (
        <>
          {/* â”€â”€ Services section â”€â”€ */}
          {fees.length > 0 && (
            <>
              <div className="px-3 py-1 bg-teal-50 border-b border-teal-100 sticky top-0">
                <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider">Services</span>
              </div>
              {fees.map((f, i) => {
                const isHighlighted = renderIdx === activeIndex;
                const currentIdx = renderIdx;
                renderIdx++;
                return (
                  <div
                    key={`fee-${f.id}`}
                    id={`search-item-${currentIdx}`}
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 cursor-pointer border-b border-zinc-100 last:border-0",
                      isHighlighted ? "bg-sky-100 ring-1 ring-inset ring-sky-300" : "hover:bg-sky-50"
                    )}
                    onMouseDown={() => onSelectFee(f)}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-zinc-800 truncate">{f.name}</span>
                      {f.productCode && <span className="text-zinc-400 text-[10px]">{f.productCode}</span>}
                    </div>
                    <span className="ml-2 text-teal-700 font-bold shrink-0">
                      ₹{parseFloat(String(f.amount)).toLocaleString("en-IN")}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* â”€â”€ Inventory items section â”€â”€ */}
          {inventory.length > 0 && (
            <>
              <div className="px-3 py-1 bg-orange-50 border-b border-orange-100 sticky top-0">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">Inventory</span>
              </div>
              {inventory.map((item, i) => {
                const isHighlighted = renderIdx === activeIndex;
                const currentIdx = renderIdx;
                renderIdx++;
                return (
                  <div
                    key={`inv-${item.id}`}
                    id={`search-item-${currentIdx}`}
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 cursor-pointer border-b border-zinc-100 last:border-0",
                      isHighlighted ? "bg-orange-100 ring-1 ring-inset ring-orange-300" : "hover:bg-orange-50"
                    )}
                    onMouseDown={() => onSelectInventory(item)}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-zinc-800 truncate">{item.name}</span>
                      <span className="text-zinc-400 text-[10px]">{item.sku}</span>
                    </div>
                    <div className="ml-2 flex flex-col items-end shrink-0">
                      <span className="text-orange-700 font-bold">
                        ₹{parseFloat(String(item.salePrice)).toLocaleString("en-IN")}
                      </span>
                      <span className={cn(
                        "text-[10px] font-semibold",
                        item.quantity === 0 ? "text-red-500" :
                        item.quantity <= 5 ? "text-amber-500" : "text-emerald-600"
                      )}>
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}

// —————————————————————————————————————————————————————————————————————————————————————————————————

export default function NewInvoiceTerminal({ onSaved }: NewInvoiceTerminalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  // ——— Global Mount State ———
  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // ——— Header state ———
  const [date, setDate] = useState(todayStr());
  const [refNo, setRefNo] = useState("");
  // ——— Manual Walk-in State ———
  const [isManualOp, setIsManualOp] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualPet, setManualPet] = useState("");

  // ——— Owner / Patient search ———
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [showPetDropdown, setShowPetDropdown] = useState(false);
  const mobileRef = useRef<HTMLInputElement>(null);

  // ——— Line items ———
  const [rows, setRows] = useState<BillingRow[]>([
    { id: genId(), feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" },
  ]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [feeSearch, setFeeSearch] = useState("");
  const [popupIndex, setPopupIndex] = useState(0);

  // â”€â”€ Totals â”€â”€
  const [discount, setDiscount] = useState("");
  const [cashRcvd, setCashRcvd] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [remarks, setRemarks] = useState("");
  const [payMode, setPayMode] = useState<"cash" | "card" | "upi" | "credit" | "split">("cash");
  const [showPaymentTerminal, setShowPaymentTerminal] = useState(false);
  // â”€â”€ Print Preview state â”€â”€
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printDesignOverride, setPrintDesignOverride] = useState<"print1" | "print2" | "print3" | undefined>(undefined);
  const [markPaidFromPreview, setMarkPaidFromPreview] = useState<InvoiceWithMeta | null>(null);
  const [autoShareOnPreview, setAutoShareOnPreview] = useState(false);
  const [whatsappSendInvoice, setWhatsappSendInvoice] = useState<InvoiceWithMeta | null>(null);
  const loadedInvoiceIdRef = useRef<number | null>(null);

  const { data: fees = [] } = useQuery<FeeStructure[]>({ queryKey: ["/api/fee-structures"], enabled: isOpen });

  // ── Inventory stock lookup ──
  const { data: inventory = [] } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"], enabled: isOpen });
  // Always fetch owners & pets with staleTime:0 so post-restore data is immediately fresh
  const { data: owners = [] } = useQuery<Owner[]>({ queryKey: ["/api/owners"], staleTime: 0 });
  const { data: allPets = [] } = useQuery<Pet[]>({ queryKey: ["/api/pets"], staleTime: 0 });

  // Search logic lifted
  const q = feeSearch.toLowerCase();
  const searchFees = useMemo(() => {
    return fees
      .filter(f => (f.isActive === "true" || (f.isActive as any) === true))
      .filter(f => !feeSearch || f.name.toLowerCase().includes(q) || (f.category || "").toLowerCase().includes(q) || (f.productCode || "").toLowerCase().includes(q))
      .slice(0, 15);
  }, [fees, feeSearch, q]);

  const searchInventory = useMemo(() => {
    return inventory
      .filter(item => !feeSearch || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || (item.productId || "").toLowerCase().includes(q))
      .slice(0, 15);
  }, [inventory, feeSearch, q]);

  useEffect(() => {
    setPopupIndex(0);
  }, [feeSearch]);

  // Build a map: productId/sku -> quantity for O(1) lookup
  const stockMap = useMemo(() => {
    const m = new Map<string, number>();
    inventory.forEach(item => {
      if (item.productId) m.set(item.productId.toLowerCase(), item.quantity);
      if (item.sku) m.set(item.sku.toLowerCase(), item.quantity);
    });
    return m;
  }, [inventory]);

  const getStock = (productCode: string): number | null => {
    if (!productCode) return null;
    const key = productCode.toLowerCase();
    return stockMap.has(key) ? stockMap.get(key)! : null;
  };

  const [enableNavQuery, setEnableNavQuery] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null);

  // ── Existing Invoices (for navigation) ──
  const { data: allInvoices = [] } = useQuery<InvoiceWithMeta[]>({ 
    queryKey: ["/api/invoices"], 
    enabled: isOpen && (enableNavQuery || !!viewingInvoiceId) 
  });

  const resetForm = () => {
    setDate(todayStr());
    setRefNo("");
    setIsManualOp(false);
    setManualPhone("");
    setManualName("");
    setManualAddress("");
    setManualPet("");
    setMobileSearch("");
    setSelectedOwner(null);
    setSelectedPet(null);
    setShowOwnerDropdown(false);
    setShowPetDropdown(false);
    setRows([{ id: genId(), feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" }]);
    setActiveRowId(null);
    setFeeSearch("");
    setPopupIndex(0);
    setDiscount("");
    setCashRcvd("");
    setSplitUpi("");
    setSplitCard("");
    setRemarks("");
    setPayMode("cash");
    setShowPaymentTerminal(false);
    setViewingInvoiceId(null);
    setEnableNavQuery(false);
  };

  // ── Global open event listener ──
  useEffect(() => {
    const fn = (e: Event) => {
      const invoiceId = ("detail" in e) ? (e as CustomEvent<{ invoiceId?: number }>).detail?.invoiceId : undefined;
      if (invoiceId) {
        setViewingInvoiceId(invoiceId);
      } else {
        // Opening for a brand-new invoice — wipe all stale data first
        resetForm();
      }
      setIsOpen(true);
      setMinimized(false);
    };
    window.addEventListener("open-invoice-terminal", fn as EventListener);
    return () => window.removeEventListener("open-invoice-terminal", fn as EventListener);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClose = () => {
    setIsOpen(false);
    resetForm();
  };

  // Fetch full invoice details (including items) when an ID is selected
  const { data: fullViewingInvoice, isFetching: isFetchingFullInvoice } = useQuery<InvoiceWithMeta>({
    queryKey: ["/api/invoices", viewingInvoiceId],
    queryFn: async () => {
      if (!viewingInvoiceId) return null;
      const res = await apiRequest("GET", `/api/invoices/${viewingInvoiceId}`);
      if (!res.ok) throw new Error("Failed to load invoice");
      return res.json();
    },
    enabled: !!viewingInvoiceId,
  });

  const viewingInvoice = fullViewingInvoice;
  const isInvoiceReadOnly = viewingInvoice && (viewingInvoice.status === "paid" || viewingInvoice.status === "cancelled");

  useEffect(() => {
    if (viewingInvoice) {
      if (loadedInvoiceIdRef.current === viewingInvoice.id) return;
      loadedInvoiceIdRef.current = viewingInvoice.id;

      setDate(viewingInvoice.date ? viewingInvoice.date.split("T")[0] : todayStr());
      setRefNo("");
      
      const owner = owners.find(o => o.id === viewingInvoice.ownerId);
      if (owner) {
         setSelectedOwner(owner);
         setMobileSearch(owner.phone || "");
         setIsManualOp(false);
      } else if (viewingInvoice.ownerId === 0) {
         setIsManualOp(true);
         const parsed = parseOpOwner(viewingInvoice.opOwnerName);
         setMobileSearch(parsed.name || "Walk-in");
         setManualName(parsed.name || "");
         setManualPhone(parsed.phone || "");
         setManualAddress(parsed.address || "");
         setManualPet(viewingInvoice.opPetName || "");
      }
      
      const pet = allPets.find(p => p.id === viewingInvoice.petId);
      setSelectedPet(pet || null);

      if (viewingInvoice.items && viewingInvoice.items.length > 0) {
        setRows(viewingInvoice.items.map(it => ({
          id: genId(),
          feeId: it.feeId,
          productCode: it.productCode || "",
          description: it.description,
          qty: it.quantity,
          unit: "Nos",
          rate: String(it.unitPrice || "0"),
          salesPrice: String(it.unitPrice || "0"),
          mrp: String(it.unitPrice || "0"),
          total: Number(it.total) || (it.quantity * parseFloat(String(it.unitPrice || "0"))),
          stock: getStock(it.productCode || "") ?? "",
        })));
      } else {
        setRows([{ id: genId(), feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" }]);
      }
      setDiscount(viewingInvoice.discount || "");
      setRemarks(viewingInvoice.notes || "");
      
      if (viewingInvoice.paymentMethod && viewingInvoice.paymentMethod.startsWith("Cash:")) {
        setPayMode("split");
        const parts = viewingInvoice.paymentMethod.split(", ");
        setCashRcvd(parts[0]?.split(":")[1] || "");
        setSplitUpi(parts[1]?.split(":")[1] || "");
        setSplitCard(parts[2]?.split(":")[1] || "");
      } else {
        setPayMode((viewingInvoice.paymentMethod as any) || "cash");
        setCashRcvd(viewingInvoice.total || "");
      }
    } else if (viewingInvoiceId === null) {
      if (loadedInvoiceIdRef.current !== null) {
        loadedInvoiceIdRef.current = null;
        // Clear fields to new invoice
        setDate(todayStr());
        setRefNo("");
        setSelectedOwner(null);
        setSelectedPet(null);
        setMobileSearch("");
        setIsManualOp(false);
        setRows([{ id: genId(), feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" }]);
        setDiscount("");
        setRemarks("");
        setPayMode("cash");
        setCashRcvd("");
      }
    }
  }, [viewingInvoice, viewingInvoiceId, owners, allPets]);

  // ── Next invoice number ──
  const { data: nextNumData, refetch: refetchNextNum } = useQuery<{ invoiceNumber: string }>({
    queryKey: ["/api/invoices/next-number"],
    staleTime: 0,
    refetchOnMount: "always",
  });
  
  // ── Owner search — server-side (SQL JOIN on pets) so pet-name search always works ──
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(mobileSearch), 200);
    return () => clearTimeout(t);
  }, [mobileSearch]);

  const { data: matchingOwners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners/search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 1) return [];
      const res = await fetch(`/api/owners/search?q=${encodeURIComponent(debouncedSearch)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debouncedSearch.length >= 1,
    staleTime: 0,
  });

  const invoiceLabel = nextNumData?.invoiceNumber ?? "NEW INVOICE";
  const displayedLabel = viewingInvoice ? viewingInvoice.invoiceNumber : invoiceLabel;

  const handlePrevInvoice = () => {
    setEnableNavQuery(true);
    const sorted = [...allInvoices].sort((a,b) => b.id - a.id);
    if (!sorted.length) return;
    if (viewingInvoiceId === null) {
      setViewingInvoiceId(sorted[0].id);
    } else {
      const idx = sorted.findIndex(i => i.id === viewingInvoiceId);
      if (idx >= 0 && idx < sorted.length - 1) setViewingInvoiceId(sorted[idx + 1].id);
    }
  };

  const handleNextInvoice = () => {
    setEnableNavQuery(true);
    const sorted = [...allInvoices].sort((a,b) => b.id - a.id);
    if (viewingInvoiceId !== null) {
      const idx = sorted.findIndex(i => i.id === viewingInvoiceId);
      if (idx > 0) {
        setViewingInvoiceId(sorted[idx - 1].id);
      } else {
        // Returning to new-invoice mode — refresh the invoice number
        setViewingInvoiceId(null);
        queryClient.invalidateQueries({ queryKey: ["/api/invoices/next-number"] });
        refetchNextNum();
      }
    }
  };

  const handleNewInvoice = () => {
    if (viewingInvoiceId === null) return; // already in new-invoice mode
    setViewingInvoiceId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/invoices/next-number"] });
    refetchNextNum();
  };


  const ownerPets = useMemo(() => {
    if (!selectedOwner) return [];
    return allPets.filter(p => p.ownerId === selectedOwner.id);
  }, [selectedOwner, allPets]);

  // Auto-select pet if only one; never auto-clear a manually selected pet
  useEffect(() => {
    if (viewingInvoice) return; // Don't auto-change while viewing existing invoice

    if (ownerPets.length === 1) {
      setSelectedPet(ownerPets[0]);
    } else if (ownerPets.length === 0) {
      // Owner has no pets — clear selection
      setSelectedPet(null);
    }
    // If multiple pets exist, leave the current selection as-is so the user
    // can pick one without it being instantly cleared.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerPets, viewingInvoice]);

  const handleSelectOwner = (o: Owner) => {
    setSelectedOwner(o);
    setSelectedPet(null);   // Clear previous owner's pet — let the auto-select effect pick the right one
    setMobileSearch(o.phone || "");
    setShowOwnerDropdown(false);
  };

  // â”€â”€ Row management â”€â”€
  const addRow = () => {
    const newId = genId();
    setRows(r => [...r, { id: newId, feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" }]);
    setActiveRowId(newId);
    return newId;
  };

  const removeRow = (id: string) => {
    setRows(r => {
      const filtered = r.filter(row => row.id !== id);
      if (filtered.length === 0) {
        return [{ id: genId(), feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" }];
      }
      return filtered;
    });
    if (activeRowId === id) setActiveRowId(null);
  };

  const updateRow = (id: string, patch: Partial<BillingRow>) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, ...patch };
      
      // Sync rate and salesPrice if one is provided
      if (patch.rate !== undefined && patch.salesPrice === undefined) updated.salesPrice = patch.rate;
      if (patch.salesPrice !== undefined && patch.rate === undefined) updated.rate = patch.salesPrice;

      const qtyNum = Number(updated.qty) || 0;
      const rateNum = parseFloat(updated.rate || "0") || 0;
      updated.total = qtyNum * rateNum;
      
      // Update stock if productCode changed
      if (patch.productCode) {
        updated.stock = getStock(patch.productCode) ?? "";
      }

      // Handle unit change and re-calculate rates
      if (patch.unit && updated.availableUnits && updated.availableUnits.length > 0) {
        const selectedUnit = updated.availableUnits.find(u => u.name === patch.unit);
        if (selectedUnit) {
          const factor = selectedUnit.conversion;
          const baseR = parseFloat(updated.baseRate || "0");
          const baseS = parseFloat(updated.baseSalesPrice || "0");
          const baseM = parseFloat(updated.baseMrp || "0");
          
          // Use explicit multi-unit prices if defined, otherwise calculate from base
          const explicitS = selectedUnit.salePrice ? parseFloat(String(selectedUnit.salePrice)) : null;
          const explicitM = selectedUnit.mrp ? parseFloat(String(selectedUnit.mrp)) : null;

          updated.salesPrice = (explicitS !== null && !isNaN(explicitS)) ? explicitS.toFixed(2) : (baseS * factor).toFixed(2);
          updated.mrp = (explicitM !== null && !isNaN(explicitM)) ? explicitM.toFixed(2) : (baseM * factor).toFixed(2);
          
          // Rate is usually same as sales price for inventory items
          updated.rate = updated.salesPrice;
          
          // Re-calculate total with new rate

          const qtyNum = Number(updated.qty) || 0;
          updated.total = qtyNum * parseFloat(updated.rate);
        }
      }

      return updated;
    }));
  };


  const applyFee = (rowId: string, fee: FeeStructure) => {
    setRows(prev => {
      const isLastRow = prev[prev.length - 1].id === rowId;
      const modifiedRows = prev.map(row => {
        if (row.id !== rowId) return row;
        const rate = parseFloat(String(fee.amount)) || 0;
        const qty = Number(row.qty) || 1;
        return { ...row, feeId: fee.id, productCode: fee.productCode || "", description: fee.name, qty, rate: String(rate), salesPrice: String(rate), mrp: String(rate), unit: "Nos", total: qty * rate, stock: "" };
      });
      if (isLastRow) {
        modifiedRows.push({ id: genId(), feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" });
      }
      return modifiedRows;
    });
    setActiveRowId(null);
    setFeeSearch("");
    setTimeout(() => document.getElementById(`qty-${rowId}`)?.focus(), 50);
  };

  const applyInventoryItem = (rowId: string, item: InventoryItem) => {
    setRows(prev => {
      const isLastRow = prev[prev.length - 1].id === rowId;
      const modifiedRows = prev.map(row => {
        if (row.id !== rowId) return row;
        const rate = parseFloat(String(item.salePrice)) || 0;
        const mrp = parseFloat(String(item.mrp)) || 0;
        const qty = Number(row.qty) || 1;
        return {
          ...row,
          feeId: null,
          productCode: item.sku || item.productId || "",
          description: item.name,
          qty,
          rate: String(rate),
          salesPrice: String(rate),
          mrp: String(mrp),
          unit: item.baseUnit || "Nos",
          total: qty * rate,
          stock: item.quantity,
          availableUnits: [
            { name: item.baseUnit || "Nos", conversion: 1 },
            ...(Array.isArray(item.multiUnit) ? item.multiUnit : [])
          ],
          baseRate: String(rate),
          baseSalesPrice: String(rate),
          baseMrp: String(mrp),
        };

      });
      if (isLastRow) {
        modifiedRows.push({ id: genId(), feeId: null, productCode: "", description: "", qty: "", unit: "Nos", rate: "", salesPrice: "", mrp: "", total: 0, stock: "" });
      }
      return modifiedRows;
    });
    setActiveRowId(null);
    setFeeSearch("");
    setTimeout(() => document.getElementById(`qty-${rowId}`)?.focus(), 50);
  };

  // â”€â”€ Calculations â”€â”€
  const subtotal = rows.reduce((s, r) => s + r.total, 0);
  const discountAmt = parseFloat(discount || "0") || 0;
  const grandTotal = Math.max(0, subtotal - discountAmt);
  
  let totalReceived = 0;
  if (payMode === "split") {
    totalReceived = (parseFloat(cashRcvd || "0") + parseFloat(splitUpi || "0") + parseFloat(splitCard || "0"));
  } else if (payMode === "credit") {
    totalReceived = 0;
  } else {
    totalReceived = parseFloat(cashRcvd || "0");
  }
  
  const balance = grandTotal - totalReceived;

  // â”€â”€ Save â”€â”€
  const saveMutation = useMutation({
    mutationFn: async (asDraft: boolean) => {
      if (!isManualOp && !selectedOwner) throw new Error("Please select an owner/patient first.");
      if (isManualOp && !manualName) throw new Error("Please enter manual patient name.");
      if (rows.every(r => !r.description)) throw new Error("Please add at least one item.");

      const isOp = isManualOp;
      const body = {
        ownerId: isOp ? 0 : selectedOwner!.id,
        petId: isOp ? null : (selectedPet?.id || null),
        invoiceType: isOp ? "op" : "ip",
        opOwnerName: isOp ? `${manualName} ${manualPhone ? `| Ph: ${manualPhone}` : ""} ${manualAddress ? `| Addr: ${manualAddress}` : ""}`.trim() : null,
        opPetName: isOp ? manualPet : null,
        date,
        status: asDraft ? "pending" : (grandTotal > 0 && totalReceived >= grandTotal ? "paid" : "pending"),
        paymentMethod: (asDraft || (grandTotal > 0 && totalReceived < grandTotal)) 
          ? null 
          : (payMode === "split" ? `Cash:${cashRcvd||0}, UPI:${splitUpi||0}, Card:${splitCard||0}` : payMode),
        subtotal: subtotal.toFixed(2),
        tax: "0",
        discount: discountAmt.toFixed(2),
        total: grandTotal.toFixed(2),
        notes: remarks || null,
        items: rows
          .filter(r => r.description)
          .map(r => ({
            feeId: r.feeId,
            productCode: r.productCode,
            description: r.description,
            quantity: Number(r.qty) || 1,
            unitPrice: parseFloat(String(r.rate || "0")).toFixed(2),
            total: r.total.toFixed(2),
          })),
      };

      const method = viewingInvoiceId ? "PATCH" : "POST";
      const url = viewingInvoiceId ? `/api/invoices/${viewingInvoiceId}` : "/api/invoices";
      const res = await apiRequest(method, url, body);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create/update invoice");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.resetQueries({ queryKey: ["/api/invoices/next-number"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
      if (viewingInvoiceId) {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices", viewingInvoiceId] });
        // Updating existing invoice — close as normal
        toast({
          title: "Invoice Updated",
          description: `${data.invoiceNumber} updated successfully.`,
        });
        onSaved?.(data);
        onClose();
      } else {
        // New invoice saved — stay open and load it so WhatsApp button appears
        toast({
          title: "Invoice Saved ✓",
          description: `${data.invoiceNumber} saved. You can now share it via WhatsApp.`,
        });
        onSaved?.(data);
        setViewingInvoiceId(data.id);
      }
    },
    onError: (err: Error) => toast({ title: "Save Failed", description: err.message, variant: "destructive" }),
  });

  const handleRowKeyDown = (e: React.KeyboardEvent, rowId: string) => {
    const target = e.target as HTMLElement;
    if (!target.id) return;
    
    const [col, rowId_] = target.id.split("-");
    const isDesc = col === "desc";
    const totalResults = searchFees.length + searchInventory.length;
    const showPopup = isDesc && feeSearch.length > 1 && totalResults > 0;

    // Up/Down Arrows: If search popup is visible, navigate results. Otherwise, move between rows.
    if (e.key === "ArrowDown") {
      if (showPopup) {
        e.preventDefault();
        setPopupIndex(prev => Math.min(prev + 1, totalResults - 1));
      } else {
        // Move to NEXT row
        const idx = rows.findIndex(r => r.id === rowId);
        if (idx < rows.length - 1) {
          e.preventDefault();
          const nextRowId = rows[idx + 1].id;
          setTimeout(() => document.getElementById(`${col}-${nextRowId}`)?.focus(), 10);
        }
      }
      return;
    }
    if (e.key === "ArrowUp") {
      if (showPopup) {
        e.preventDefault();
        setPopupIndex(prev => Math.max(prev - 1, 0));
      } else {
        // Move to PREV row
        const idx = rows.findIndex(r => r.id === rowId);
        if (idx > 0) {
          e.preventDefault();
          const prevRowId = rows[idx - 1].id;
          setTimeout(() => document.getElementById(`${col}-${prevRowId}`)?.focus(), 10);
        }
      }
      return;
    }

    // Left/Right Arrows: Move between columns
    const columns = ["code", "desc", "qty", "rate"];
    if (e.key === "ArrowRight") {
      const colIdx = columns.indexOf(col);
      if (colIdx >= 0 && colIdx < columns.length - 1) {
        e.preventDefault();
        setTimeout(() => document.getElementById(`${columns[colIdx + 1]}-${rowId}`)?.focus(), 10);
      }
    }
    if (e.key === "ArrowLeft") {
      const colIdx = columns.indexOf(col);
      if (colIdx > 0) {
        e.preventDefault();
        setTimeout(() => document.getElementById(`${columns[colIdx - 1]}-${rowId}`)?.focus(), 10);
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (isDesc && activeRowId === rowId && feeSearch.length > 0 && totalResults > 0) {
        if (popupIndex < searchFees.length) {
          applyFee(rowId, searchFees[popupIndex]);
        } else {
          applyInventoryItem(rowId, searchInventory[popupIndex - searchFees.length]);
        }
        return;
      }

      let nextCol = "";
      
      if (col === "code") {
        const codeValue = rows.find(r => r.id === rowId)?.productCode?.trim();
        if (codeValue) {
          const invMatch = inventory.find(i => (i.sku.toLowerCase() === codeValue.toLowerCase() || (i.productId || "").toLowerCase() === codeValue.toLowerCase()));
          if (invMatch) {
            applyInventoryItem(rowId, invMatch);
            return;
          }
          const feeMatch = fees.find(f => f.productCode?.toLowerCase() === codeValue.toLowerCase());
          if (feeMatch) {
            applyFee(rowId, feeMatch);
            return;
          }
          
          toast({
            title: "Invalid Item Code",
            description: `No inventory item or service matched the code "${codeValue}".`,
            variant: "destructive"
          });
          return;
        }
        nextCol = "desc";
      }
      else if (col === "desc") nextCol = "qty";
      else if (col === "qty") nextCol = "rate";
      else if (col === "rate") nextCol = "desc";

      if (nextCol) {
        if (nextCol === "desc" && col === "rate") {
          const idx = rows.findIndex(r => r.id === rowId);
          if (idx === rows.length - 1) {
            const newId = addRow();
            setTimeout(() => document.getElementById(`desc-${newId}`)?.focus(), 50);
          } else {
            const nextRowId = rows[idx + 1].id;
            setTimeout(() => document.getElementById(`desc-${nextRowId}`)?.focus(), 50);
          }
        } else {
          setTimeout(() => document.getElementById(`${nextCol}-${rowId}`)?.focus(), 10);
        }
      }
    }
  };

  const activeRow = rows.find(r => r.id === activeRowId);


  if (!isOpen) return null;

  if (minimized) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-2xl shadow-2xl cursor-pointer select-none"
        style={{
          background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
          minWidth: 420,
          boxShadow: "0 8px 32px rgba(15,118,110,0.45), 0 2px 8px rgba(0,0,0,0.18)",
        }}
        onClick={() => setMinimized(false)}
        title="Click to restore invoice terminal"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
        </span>

        <span className="text-white font-black text-sm tracking-wide">• {displayedLabel}
          {selectedOwner && (
            <span className="font-normal text-white/70 ml-2">
              — {selectedOwner.firstName} {selectedOwner.lastName}
              {selectedPet && <span className="text-white/50"> / {selectedPet.name}</span>}
            </span>
          )}
          {isManualOp && manualName && (
            <span className="font-normal text-orange-200 ml-2">
              — {manualName}
              {manualPet && <span className="text-orange-200/60"> / {manualPet}</span>}
            </span>
          )}
        </span>

        <div className="h-4 w-px bg-white/30 mx-1" />
        <span className="text-white/70 text-xs">
          {rows.filter(r => r.description).length} items
        </span>
        <div className="h-4 w-px bg-white/30 mx-1" />
        <span className="font-mono font-black text-white text-sm">₹{fmtNum(grandTotal)}</span>

        <div className="ml-auto flex items-center gap-2">
           <Maximize2 className="w-4 h-4 text-white" />
           <X className="w-4 h-4 text-white/50 hover:text-white" onClick={e => { e.stopPropagation(); onClose(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-sm" style={{ fontFamily: "'Segoe UI', sans-serif" }}>

      {/* ——— TOP BAR ——— */}
      <div className="flex items-center border-b border-zinc-300 bg-gradient-to-r from-teal-700 to-teal-600 px-3 py-2 gap-4 shrink-0">
        <button onClick={onClose} className="text-white/80 hover:text-white mr-1 outline-none">
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <span className="text-white font-black text-base tracking-wide font-mono flex items-center gap-2 min-w-[120px]">
          {displayedLabel}
          {isFetchingFullInvoice && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
        </span>

        <div 
          onMouseEnter={() => setEnableNavQuery(true)}
          className="flex flex-col -gap-1 bg-white/20 rounded ml-1 px-1 py-0.5"
        >
          <button onClick={handleNextInvoice} disabled={isFetchingFullInvoice} title="Newer Invoice" className="text-white/70 hover:text-white disabled:opacity-20 transition-colors">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePrevInvoice} disabled={isFetchingFullInvoice} title="Older Invoice" className="text-white/70 hover:text-white disabled:opacity-20 transition-colors">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New Invoice button â€” visible only when browsing old invoices */}
        {viewingInvoiceId !== null && (
          <button
            onClick={handleNewInvoice}
            disabled={isFetchingFullInvoice}
            title="Create New Invoice"
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-400 hover:bg-amber-300 text-zinc-900 text-xs font-bold transition-colors shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        )}

        {/* Print Preview buttons — visible only when browsing old invoices */}
        {viewingInvoiceId !== null && viewingInvoice && (
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={() => { setPrintDesignOverride("print1"); setShowPrintPreview(true); }}
              disabled={isFetchingFullInvoice}
              title="Print using Design 1"
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/30 text-white text-xs font-bold transition-colors border border-white/30"
            >
              <Printer className="w-3.5 h-3.5" />
              Print 1
            </button>
            <button
              onClick={() => { setPrintDesignOverride("print2"); setShowPrintPreview(true); }}
              disabled={isFetchingFullInvoice}
              title="Print using Design 2"
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/30 text-white text-xs font-bold transition-colors border border-white/30"
            >
              <Printer className="w-3.5 h-3.5" />
              Print 2
            </button>
            <button
              onClick={() => { setPrintDesignOverride("print3"); setShowPrintPreview(true); }}
              disabled={isFetchingFullInvoice}
              title="Print using Design 3"
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/30 text-white text-xs font-bold transition-colors border border-white/30"
            >
              <Printer className="w-3.5 h-3.5" />
              Print 3
            </button>
          </div>
        )}

        <div className="h-5 w-px bg-white/30 ml-2" />

        {/* Patient Dropdown UI */}
        <div className="flex items-center gap-2 relative w-64 lg:w-72">
          <div className="flex bg-white/10 border border-white/30 rounded-md items-center px-2 py-1 flex-1 relative shadow-sm">
            <Search className="w-4 h-4 text-white/70 mr-1.5 shrink-0" />
            <input
              ref={mobileRef}
              value={mobileSearch}
              onChange={e => {
                setMobileSearch(e.target.value);
                setShowOwnerDropdown(true);
                if (!e.target.value) { setSelectedOwner(null); setSelectedPet(null); setIsManualOp(false); }
              }}
              onFocus={() => setShowOwnerDropdown(true)}
              onBlur={() => setTimeout(() => setShowOwnerDropdown(false), 200)}
              placeholder="Search Phone, Name, Pet..."
              className="w-full text-xs font-semibold bg-transparent border-0 outline-none focus:ring-0 text-white placeholder:text-white/60"
            />
            {/* suggestions dropdown */}
            {showOwnerDropdown && mobileSearch.length >= 1 && (
              <div className="absolute top-full left-0 z-50 w-[320px] bg-white border border-sky-200 rounded-md shadow-xl mt-1 max-h-[300px] overflow-y-auto">
                <div className="p-2 text-[10px] uppercase tracking-wider font-bold text-zinc-500 border-b bg-zinc-50">Registered Clients</div>
                {matchingOwners.length === 0 ? (
                  <div className="p-3 text-xs text-zinc-500 text-center">No match found.</div>
                ) : (
                  matchingOwners.map(o => {
                    const matchedPets = allPets.filter(p => p.ownerId === o.id).map(p => p.name).join(", ");
                    return (
                      <div
                        key={o.id}
                        className="flex flex-col gap-0.5 px-3 py-2 hover:bg-sky-50 cursor-pointer border-b border-zinc-100 last:border-0"
                        onMouseDown={() => {
                          handleSelectOwner(o);
                          setIsManualOp(false);
                        }}
                      >
                        <div className="font-semibold text-sm text-zinc-800 flex justify-between">
                          <span>{o.firstName} {o.lastName}</span>
                          <span className="text-zinc-500 text-xs font-mono">{o.phone}</span>
                        </div>
                        {matchedPets && <div className="text-xs text-zinc-500">Pets: {matchedPets}</div>}
                      </div>
                    );
                  })
                )}
                <div className="p-2 bg-zinc-50 border-t border-zinc-200">
                  <button
                    className="w-full py-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-100/50 hover:bg-teal-200/50 rounded transition-all"
                    onMouseDown={(e) => {
                       e.preventDefault();
                       setIsManualOp(true);
                       setSelectedOwner(null);
                       setSelectedPet(null);
                       setManualPhone(mobileSearch.replace(/[^0-9]/g, ''));
                       setManualName(mobileSearch.replace(/[0-9]/g, '').trim());
                       setShowOwnerDropdown(false);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add to Out-Patient (Walk-in)
                  </button>
                </div>
              </div>
            )}
          </div>
          {selectedOwner && !isManualOp && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
        </div>

        <div className="h-5 w-px bg-white/30" />

        {/* Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-white/70 text-xs font-semibold">Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-white/30 bg-white/10 text-white focus:outline-none focus:bg-white/20"
          />
        </div>

        {/* Ref No */}
        <div className="flex items-center gap-1.5">
          <span className="text-white/70 text-xs font-semibold">Ref No.</span>
          <input
            value={refNo}
            onChange={e => setRefNo(e.target.value)}
            placeholder="Optional"
            className="h-7 px-2 text-xs rounded border border-white/30 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 w-24"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all"
            title="Minimize"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-red-400 hover:bg-white/10 rounded transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* â• â• â•  CONTENT â• â• â•  */}
      <div className="flex flex-1 overflow-hidden relative">
        {isFetchingFullInvoice && (
          <div className="absolute inset-0 z-50 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-sm font-bold text-slate-600 animate-pulse text-center">Loading Invoice Details...</span>
            </div>
          </div>
        )}
        {/* Left: Metadata/Pet Info */}
        <div className="w-64 border-r border-zinc-200 bg-zinc-50/50 flex flex-col p-4 gap-6 shrink-0 overflow-y-auto">
          {/* O/P Patient Details / Pet Selector */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
              {isManualOp ? "O/P Patient Details" : "Pet Selection"}
            </label>
            {!selectedOwner && !isManualOp ? (
              <div className="flex flex-col gap-2">
                <div className="p-3 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 opacity-60">
                   <Search className="w-5 h-5 text-zinc-300" />
                   <p className="text-[10px] text-zinc-400 leading-snug">Search &amp; select a registered client above, or use Walk-in</p>
                </div>
                {/* Direct Walk-in entry button */}
                <button
                  onClick={() => { setIsManualOp(true); setSelectedOwner(null); setSelectedPet(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-all"
                >
                  <User className="w-4 h-4" />
                  Walk-in / O/P Patient
                </button>
              </div>
            ) : isManualOp ? (
              <div className="space-y-2 bg-white p-3 rounded-xl border border-orange-200 shadow-sm">
                 <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-2 text-orange-600 font-bold">
                     <User className="w-4 h-4" />
                     <span className="text-xs uppercase">Walk-in / O/P</span>
                   </div>
                   <button
                     onClick={() => { setIsManualOp(false); setManualName(""); setManualPhone(""); setManualAddress(""); setManualPet(""); }}
                     className="text-zinc-400 hover:text-red-500 transition-colors"
                     title="Cancel walk-in"
                   >
                     <X className="w-3.5 h-3.5" />
                   </button>
                 </div>
                 <div className="space-y-2">
                   <div>
                     <label className="text-[9px] font-bold text-zinc-400 uppercase mb-0.5 block">Owner / Patient Name <span className="text-red-400">*</span></label>
                     <Input readOnly={!!isInvoiceReadOnly} value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Full name" className="h-8 text-xs font-semibold focus-visible:ring-orange-400" />
                   </div>
                   <div>
                     <label className="text-[9px] font-bold text-zinc-400 uppercase mb-0.5 block">Phone Number</label>
                     <Input readOnly={!!isInvoiceReadOnly} value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="e.g. 9876543210" type="tel" className="h-8 text-xs focus-visible:ring-orange-400" />
                   </div>
                   <div>
                     <label className="text-[9px] font-bold text-zinc-400 uppercase mb-0.5 block">Address</label>
                     <textarea readOnly={!!isInvoiceReadOnly} value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="Street, City..." className="w-full text-xs p-2 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-400 min-h-[52px] resize-none" />
                   </div>
                   <div>
                     <label className="text-[9px] font-bold text-zinc-400 uppercase mb-0.5 block">Animal / Pet Name</label>
                     <Input readOnly={!!isInvoiceReadOnly} value={manualPet} onChange={e => setManualPet(e.target.value)} placeholder="e.g. Tommy (Dog)" className="h-8 text-xs focus-visible:ring-orange-400" />
                   </div>
                 </div>
              </div>
            ) : (
              <div className="space-y-3">
                 <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
                    <div className="flex items-center gap-2 text-teal-700 font-black text-xs mb-1 truncate">
                       <User className="w-3.5 h-3.5" /> {selectedOwner?.firstName} {selectedOwner?.lastName}
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                       <Phone className="w-3 h-3" /> {selectedOwner?.phone}
                    </div>
                 </div>

                 <div className="space-y-2 relative">
                    <button
                      onClick={() => setShowPetDropdown(!showPetDropdown)}
                      className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-xl flex items-center justify-between hover:border-teal-400 hover:shadow-md transition-all active:scale-98"
                    >
                      <div className="flex items-center gap-2">
                         <Dog className="w-4 h-4 text-teal-600" />
                         <span className={cn("text-xs font-bold", !selectedPet ? "text-zinc-400" : "text-zinc-800")}>
                           {selectedPet?.name || "Select Pet"}
                         </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-zinc-300" />
                    </button>

                    {showPetDropdown && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border border-zinc-200 rounded-xl shadow-2xl mt-1 py-1 max-h-48 overflow-y-auto overflow-x-hidden">
                        {ownerPets.map(p => (
                          <button
                            key={p.id}
                            className={cn(
                              "w-full px-4 py-2 text-left text-xs hover:bg-teal-50 flex items-center justify-between transition-colors",
                              selectedPet?.id === p.id && "bg-teal-50 text-teal-700 font-bold"
                            )}
                            onMouseDown={() => { setSelectedPet(p); setShowPetDropdown(false); }}
                          >
                             <span>{p.name} <span className="text-[10px] text-zinc-400 ml-1">({p.species})</span></span>
                             {selectedPet?.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-200">
             <div className="space-y-3">
                 <div>
                 <label className="text-[9px] font-bold text-zinc-400 uppercase mb-1.5 block">Remarks / Notes</label>
                 <textarea
                   readOnly={!!isInvoiceReadOnly}
                   value={remarks}
                   onChange={e => setRemarks(e.target.value)}
                   className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px] resize-none placeholder:text-zinc-300 disabled:opacity-50 disabled:bg-zinc-50"
                   placeholder="Internal notes..."
                   disabled={!!isInvoiceReadOnly}
                 />
               </div>
             </div>
          </div>
        </div>

        {/* Right: Line Items Grid */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Grid Headings */}
            <div className="flex border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-tighter shrink-0 items-center">
              <div className="w-10 shrink-0">Sl.</div>
              <div className="w-24 shrink-0 pl-1 border-l border-zinc-200">Code</div>
              <div className="flex-1 pl-2 border-l border-zinc-200">Description / Item Name</div>
              <div className="w-16 shrink-0 text-center border-l border-zinc-200">Qty</div>
              <div className="w-20 shrink-0 text-center border-l border-zinc-200">Unit</div>
              <div className="w-24 shrink-0 text-right pr-2 border-l border-zinc-200">Rate</div>
              <div className="w-24 shrink-0 text-right pr-2 border-l border-zinc-200">Sales Price</div>
              <div className="w-24 shrink-0 text-right pr-2 border-l border-zinc-200">MRP</div>
              <div className="w-28 shrink-0 text-right pr-2 border-l border-zinc-200 font-bold text-teal-800">Total</div>
              <div className="w-20 shrink-0 text-right pr-2 border-l border-zinc-200">Stock</div>
              <div className="w-10 shrink-0"></div>
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto bg-zinc-50/20" onKeyDown={e => {
              if (e.key === "F2") { e.preventDefault(); addRow(); }
              if (e.key === "F5" && grandTotal > 0) { e.preventDefault(); setShowPaymentTerminal(true); }
            }}>
               {rows.map((row, idx) => (
                 <div
                   key={row.id}
                   className={cn(
                     "flex items-center border-b border-zinc-100 hover:bg-sky-50/30 transition-colors h-10 group",
                     activeRowId === row.id && "bg-sky-50 shadow-sm"
                   )}
                 >
                   <div className="w-10 shrink-0 text-[10px] font-bold text-zinc-400 pl-3">{idx + 1}</div>
                   
                   <div className="w-24 shrink-0 relative border-l border-zinc-100 h-full flex items-center">
                     <EditCell
                       id={`code-${row.id}`}
                       value={row.productCode}
                       onChange={v => updateRow(row.id, { productCode: v })}
                       placeholder="Code"
                       className="font-mono text-zinc-600"
                       readOnly={!!isInvoiceReadOnly}
                       onFocus={() => { if (!isInvoiceReadOnly) { setActiveRowId(row.id); setFeeSearch(""); } }}
                       onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}
                     />
                   </div>

                   <div className="flex-1 relative border-l border-zinc-100 h-full flex items-center">
                     <EditCell
                       id={`desc-${row.id}`}
                       value={row.description}
                       onChange={v => {
                         if (isInvoiceReadOnly) return;
                         updateRow(row.id, { description: v });
                         setFeeSearch(v);
                         if (activeRowId !== row.id) setActiveRowId(row.id);
                       }}
                       placeholder="Description / Item Name"
                       readOnly={!!isInvoiceReadOnly}
                       onFocus={() => { if (!isInvoiceReadOnly) { setActiveRowId(row.id); setFeeSearch(row.description); } }}
                       onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}
                       className="font-bold text-zinc-800"
                     />
                     
                     {!isInvoiceReadOnly && activeRowId === row.id && feeSearch.length > 1 && (
                       <FeeSearchPopup
                         fees={searchFees}
                         inventory={searchInventory}
                         activeIndex={popupIndex}
                         onSelectFee={f => applyFee(row.id, f)}
                         onSelectInventory={it => applyInventoryItem(row.id, it)}
                       />
                     )}
                   </div>

                   <div className="w-16 shrink-0 border-l border-zinc-100 h-full flex items-center">
                     <EditCell
                       id={`qty-${row.id}`}
                       value={row.qty}
                       onChange={v => { if (!isInvoiceReadOnly) updateRow(row.id, { qty: v }); }}
                       align="right"
                       type="number"
                       readOnly={!!isInvoiceReadOnly}
                       className="font-black text-rose-600 pr-2"
                       onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}
                       onFocus={e => e.target.select()}
                     />
                   </div>

                   <div className="w-20 shrink-0 border-l border-zinc-100 h-full flex items-center">
                     {row.availableUnits && row.availableUnits.length > 1 ? (
                       <Select
                         value={row.unit}
                         onValueChange={v => updateRow(row.id, { unit: v })}
                       >
                         <SelectTrigger className="h-7 text-[10px] font-bold border-0 bg-transparent focus:ring-0 px-1">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {row.availableUnits.map(u => (
                             <SelectItem key={u.name} value={u.name} className="text-[10px]">
                               {u.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     ) : (
                       <EditCell
                         id={`unit-${row.id}`}
                         value={row.unit}
                         readOnly={true}
                         align="center"
                         className="text-[10px] font-bold text-zinc-400"
                         onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}
                       />
                     )}
                   </div>

                   <div className="w-24 shrink-0 border-l border-zinc-100 h-full flex items-center">
                     <EditCell
                       id={`rate-${row.id}`}
                       value={row.rate}
                       onChange={v => { if (!isInvoiceReadOnly) updateRow(row.id, { rate: v }); }}
                       align="right"
                       type="number"
                       readOnly={!!isInvoiceReadOnly}
                       className="font-bold text-zinc-700 pr-2"
                       onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}
                       onFocus={e => e.target.select()}
                     />
                   </div>

                   <div className="w-24 shrink-0 border-l border-zinc-100 h-full flex items-center">
                     <EditCell
                       id={`salesPrice-${row.id}`}
                       value={row.salesPrice}
                       readOnly={true}
                       align="right"
                       type="number"
                       className="font-medium text-zinc-600 pr-2"
                       onKeyDown={e => handleRowKeyDown(e, row.id)}
                     />
                   </div>

                   <div className="w-24 shrink-0 border-l border-zinc-100 h-full flex items-center">
                     <EditCell
                       id={`mrp-${row.id}`}
                       value={row.mrp}
                       readOnly={true}
                       align="right"
                       type="number"
                       className="font-medium text-zinc-600 pr-2"
                       onKeyDown={e => handleRowKeyDown(e, row.id)}
                     />
                   </div>

                   <div className="w-28 shrink-0 border-l border-zinc-100 h-full flex items-center justify-end pr-2 font-black text-teal-800 text-xs bg-teal-50/20">
                     {fmtNum(row.total)}
                   </div>

                   <div className="w-20 shrink-0 border-l border-zinc-100 h-full flex items-center justify-end pr-2 text-[10px] font-bold text-zinc-400">
                     {(row.stock || row.stock === 0) ? row.stock : "-"}
                   </div>

                   <div className="w-10 shrink-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     {!isInvoiceReadOnly && (
                       <button onClick={() => removeRow(row.id)} className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     )}
                   </div>
                 </div>
               ))}
               
               {!isInvoiceReadOnly && (
                 <div className="p-4 flex gap-4">
                   <button onClick={addRow} className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-all flex items-center gap-2">
                     <Plus className="w-4 h-4" /> Add Row (F2)
                   </button>
                 </div>
               )}
            </div>

            {/* Footer: Multi-tab status and totals */}
            <div className="h-40 border-t border-zinc-200 bg-zinc-50 flex overflow-hidden shrink-0">
              {/* Left: Summary */}
              <div className="w-72 p-4 border-r border-zinc-200 flex flex-col gap-4">
                 <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                          <FileCheck className="w-4 h-4 text-teal-600" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-zinc-400">Total Items</span>
                          <span className="text-sm font-black text-zinc-800">{rows.filter(r => r.description).length}</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-black uppercase text-zinc-400">Subtotal</span>
                       <div className="text-sm font-black text-zinc-800">₹{fmtNum(subtotal)}</div>
                    </div>
                 </div>

                 <div className="flex items-center gap-2 px-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-zinc-500 leading-tight">Verify items and quantities before final billing.</p>
                 </div>
              </div>

              {/* Right: Payment modes and Grand Total */}
              <div className="flex-1 flex p-5 gap-8">
                 <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-1.5 transition-all">
                       <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black text-teal-700 uppercase tracking-wider">Adjustment / Discount</label>
                          <span className="text-[10px] text-zinc-400 font-bold">₹</span>
                       </div>
                       <Input
                         value={discount}
                         onChange={e => { if (!isInvoiceReadOnly) setDiscount(e.target.value); }}
                         readOnly={!!isInvoiceReadOnly}
                         placeholder="0.00"
                         className="h-10 text-lg font-black text-emerald-600 border-zinc-200 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm disabled:opacity-50"
                         type="number"
                       />
                    </div>

                     <div className="flex flex-col justify-end text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Final Payable</span>
                        <div className="text-4xl font-black text-zinc-900 tracking-tighter">
                           <span className="text-xl mr-1 text-zinc-400 tracking-normal">&#8377;</span>{fmtNum(grandTotal)}
                        </div>
                      </div>









                 </div>

                 <div className="w-px bg-zinc-200"></div>

                  <div className="w-56 space-y-3">
                     {/* WhatsApp PDF — direct send, no dialog (same as billing page row button) */}
                     {viewingInvoiceId !== null && viewingInvoice && (
                       <button
                         onClick={() => {
                           // Build enriched invoice (same OP enrichment as ViewInvoiceDialog path)
                           const isOp = viewingInvoice.invoiceType === "op" || viewingInvoice.ownerId === 0;
                           if (isOp && viewingInvoice.opOwnerName) {
                             const parts = (viewingInvoice.opOwnerName as string).split("|").map((s: string) => s.trim());
                             const ownerName = parts[0] || "Walk-in";
                             const phonePart = parts.find((p: string) => p.startsWith("Ph:"));
                             const addrPart  = parts.find((p: string) => p.startsWith("Addr:"));
                             setWhatsappSendInvoice({
                               ...viewingInvoice,
                               ownerName,
                               ownerPhone: phonePart ? phonePart.replace("Ph:", "").trim() : (viewingInvoice.ownerPhone || ""),
                               ownerAddress: addrPart ? addrPart.replace("Addr:", "").trim() : (viewingInvoice.ownerAddress || ""),
                               patientName: viewingInvoice.opPetName || "",
                               petName: viewingInvoice.opPetName || "",
                             });
                           } else {
                             setWhatsappSendInvoice(viewingInvoice);
                           }
                         }}
                         disabled={!!whatsappSendInvoice}
                         className="w-full py-2 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-green-500/30 animate-in fade-in duration-300"
                       >
                         <MessageCircle className="w-4 h-4" />
                         {whatsappSendInvoice ? "SENDING..." : "WHATSAPP PDF"}
                       </button>
                     )}






                    <button
                      onClick={() => saveMutation.mutate(true)}
                      disabled={saveMutation.isPending || !!isInvoiceReadOnly}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      SAVE AS PENDING
                    </button>
                    <button
                      onClick={() => {
                         if (!isManualOp && !selectedOwner) return toast({ title: "Action Required", description: "Please select an owner/patient first.", variant: "destructive" });
                         if (rows.every(r => !r.description)) return toast({ title: "Action Required", description: "Please add at least one item.", variant: "destructive" });
                         setShowPaymentTerminal(true);
                      }}
                      disabled={!!isInvoiceReadOnly}
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 shine disabled:opacity-50"
                    >
                      <Banknote className="w-5 h-5" /> COLLECT PAYMENT
                    </button>
                 </div>
              </div>
            </div>
        </div>
      </div>


      {/* â•â•â• MINI PAYMENT TERMINAL OVERLAY â•â•â• */}
      {showPaymentTerminal && (
        <div className="fixed inset-0 z-[60] bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden border border-zinc-300 transform transition-all animate-in zoom-in-95 duration-200">
              <div className="bg-teal-700 p-4 flex justify-between items-center">
                 <h3 className="text-white font-black text-lg tracking-tight uppercase">Payment Terminal</h3>
                 <button onClick={() => setShowPaymentTerminal(false)} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg text-white transition-all"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-6">
                 {/* Summary Header */}
                 <div className="flex justify-between items-center pb-6 border-b border-zinc-100">
                    <div>
                       <p className="text-[10px] text-zinc-400 font-black uppercase">Grand Total</p>
                       <p className="text-3xl font-black text-zinc-900">₹{fmtNum(grandTotal)}</p>
                    </div>
                    {totalReceived > 0 && (
                      <div className="text-right">
                         <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Balance Remaining</p>
                         <p className={cn("text-xl font-black", balance <= 0 ? "text-emerald-600" : "text-rose-500")}>
                           ₹{fmtNum(Math.max(0, balance))}
                         </p>
                      </div>
                    )}
                 </div>

                 {/* Payment Mode Selector */}
                 <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: "cash", label: "Cash", icon: Banknote },
                      { id: "upi", label: "UPI", icon: Smartphone },
                      { id: "card", label: "Card", icon: CreditCard },
                      { id: "split", label: "Split", icon: Plus },
                      { id: "credit", label: "Credit", icon: AlertTriangle },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setPayMode(mode.id as any);
                          if (mode.id !== "split" && mode.id !== "credit") setCashRcvd(grandTotal.toFixed(2));
                          if (mode.id === "credit") setCashRcvd("0");
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95",
                          payMode === mode.id ? "bg-teal-50 border-teal-600 text-teal-700 ring-2 ring-teal-100 shadow-md" : "border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 text-zinc-500"
                        )}
                      >
                         <mode.icon className={cn("w-5 h-5", payMode === mode.id ? "text-teal-700" : "text-zinc-400")} />
                         <span className="text-[10px] font-black uppercase">{mode.label}</span>
                      </button>
                    ))}
                 </div>

                 {/* Input Area */}
                 <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200">
                    {payMode === "split" ? (
                      <div className="space-y-4">
                         <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-zinc-400 uppercase px-1">Cash</label>
                               <Input value={cashRcvd} onChange={e => setCashRcvd(e.target.value)} placeholder="0.00" className="h-10 font-bold border-zinc-200 focus:ring-teal-500" type="number" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-teal-700 uppercase px-1">UPI</label>
                               <Input value={splitUpi} onChange={e => setSplitUpi(e.target.value)} placeholder="0.00" className="h-10 font-bold border-zinc-200 focus:ring-teal-500" type="number" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-zinc-400 uppercase px-1">Card</label>
                               <Input value={splitCard} onChange={e => setSplitCard(e.target.value)} placeholder="0.00" className="h-10 font-bold border-zinc-200 focus:ring-teal-500" type="number" />
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                         <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Receive Amount</label>
                            <Input
                              value={cashRcvd}
                              onChange={e => setCashRcvd(e.target.value)}
                              placeholder="0.00"
                              className="h-12 text-2xl font-black text-zinc-800 border-zinc-200 focus:ring-teal-500 shadow-inner"
                              type="number"
                              disabled={payMode === "credit"}
                            />
                         </div>
                         {payMode === "cash" && (
                           <button onClick={() => setCashRcvd(grandTotal.toFixed(2))} className="h-12 px-4 bg-teal-100 text-teal-700 font-black rounded-xl text-xs hover:bg-teal-200 transition-all active:scale-95">Full Amt</button>
                         )}
                      </div>
                    )}
                 </div>

                 {/* Confirm Button */}
                 <button
                   onClick={() => saveMutation.mutate(false)}
                   disabled={saveMutation.isPending || (payMode !== "credit" && totalReceived < grandTotal)}
                   className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                 >
                   {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                   CONFIRM & PRINT
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ═══ PRINT PREVIEW DIALOG ═══ */}
      {showPrintPreview && viewingInvoice && (() => {
        const isOp = viewingInvoice.invoiceType === "op" || viewingInvoice.ownerId === 0;
        let enriched: InvoiceWithMeta = { ...viewingInvoice };
        if (isOp && viewingInvoice.opOwnerName) {
          const parts = (viewingInvoice.opOwnerName as string).split("|").map((s: string) => s.trim());
          const ownerName = parts[0] || "Walk-in";
          const phonePart = parts.find((p: string) => p.startsWith("Ph:"));
          const addrPart  = parts.find((p: string) => p.startsWith("Addr:"));
          enriched = {
            ...viewingInvoice,
            ownerName,
            ownerPhone: phonePart ? phonePart.replace("Ph:", "").trim() : (viewingInvoice.ownerPhone || ""),
            ownerAddress: addrPart ? addrPart.replace("Addr:", "").trim() : (viewingInvoice.ownerAddress || ""),
            patientName: viewingInvoice.opPetName || "",
            petName: viewingInvoice.opPetName || "",
          };
        }
        return (
          <ViewInvoiceDialog
            invoice={enriched}
            owners={owners}
            allPets={allPets}
            open={showPrintPreview}
            forcePreview={true}
            printDesignOverride={printDesignOverride}
            autoShare={autoShareOnPreview}
            onOpenChange={(v) => {
              if (!v) {
                setShowPrintPreview(false);
                setAutoShareOnPreview(false);
              }
            }}
            onMarkPaid={(inv) => {
              setShowPrintPreview(false);
              setAutoShareOnPreview(false);
              setMarkPaidFromPreview(inv);
            }}
          />
        );
      })()}

      <MarkAsPaidDialog
        invoice={markPaidFromPreview}
        open={!!markPaidFromPreview}
        onOpenChange={(v) => { if (!v) setMarkPaidFromPreview(null); }}
        onSuccess={() => {
          setMarkPaidFromPreview(null);
          // Invalidate all caches immediately — invoices list, specific invoice, ledger, accounts
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          if (viewingInvoiceId) {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices", viewingInvoiceId] });
          }
          queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
          queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        }}
      />

      {/* WhatsApp sender — hidden off-screen renderer, no dialog */}
      <InvoiceWhatsAppSender
        invoice={whatsappSendInvoice}
        owners={owners}
        allPets={allPets}
        onDone={() => setWhatsappSendInvoice(null)}
      />
    </div>
  );
}

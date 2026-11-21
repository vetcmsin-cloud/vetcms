import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Search, Receipt, Eye, Trash2,
  ArrowUp, ArrowDown, ArrowUpDown, Settings2,
  X, RotateCcw, EyeOff,
  Banknote, Smartphone, CheckSquare, CreditCard, Wallet,
} from "lucide-react";
import type { Owner, Pet } from "@shared/schema";
import {
  ViewInvoiceDialog,
  MarkAsPaidDialog,
  DeleteInvoiceDialog,
  type InvoiceWithMeta,
  statusLabel,
  formatCurrency,
} from "@/components/invoice-dialogs";
import { openNewInvoiceTerminal } from "@/components/NewInvoiceTerminal";

// ─── Column config ───────────────────────────────────────────────────────────

type ColKey = "invoiceNumber" | "date" | "type" | "patient" | "owner" | "payment" | "billedBy" | "status" | "amount" | "actions";
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
  { key: "invoiceNumber", label: "Invoice #", defaultWidth: 110, minWidth: 80, sortable: true, hideable: false },
  { key: "date", label: "Date", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
  { key: "type", label: "I/P O/P", defaultWidth: 80, minWidth: 60, sortable: true, hideable: true },
  { key: "patient", label: "Patient", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
  { key: "owner", label: "Owner", defaultWidth: 150, minWidth: 100, sortable: true, hideable: true },
  { key: "payment", label: "Payment", defaultWidth: 90, minWidth: 80, sortable: true, hideable: true },
  { key: "billedBy", label: "Billed By", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
  { key: "status", label: "Status", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
  { key: "amount", label: "Amount", defaultWidth: 120, minWidth: 80, sortable: true, hideable: false },
  { key: "actions", label: "Actions", defaultWidth: 90, minWidth: 70, sortable: false, hideable: false },
];

interface GridSettings {
  columnWidths: Record<string, number>;
  hiddenCols: string[];
  sortCol: ColKey | null;
  sortDir: SortDir;
}

const DEFAULT_GRID: GridSettings = {
  columnWidths: Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<string, number>,
  hiddenCols: [],
  sortCol: "date",
  sortDir: "desc",
};

const STORAGE_KEY = "billing_grid_v2";

function loadGrid(): GridSettings {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return { ...DEFAULT_GRID, ...JSON.parse(s) };
  } catch { }
  return DEFAULT_GRID;
}

function saveGrid(s: GridSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── Payment method badge ─────────────────────────────────────────────────────

function PaymentBadge({ method }: { method: string | null }) {
  if (!method) return <span className="text-muted-foreground text-xs">–</span>;
  const icons: Record<string, any> = { cash: Banknote, upi: Smartphone, card: CreditCard, cheque: CheckSquare };
  const Icon = icons[method.toLowerCase()] || Wallet;
  const colors: Record<string, string> = {
    cash: "text-green-600", upi: "text-violet-600", card: "text-blue-600", cheque: "text-amber-600",
  };
  return (
    <span className={cn("flex items-center gap-1 text-xs font-semibold", colors[method.toLowerCase()] || "text-muted-foreground")}>
      <Icon className="w-3 h-3" />
      {method.toUpperCase()}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    forwarded: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide", colors[status] || "bg-muted text-muted-foreground border-border")}>
      {statusLabel(status)}
    </span>
  );
}

// ─── Grid Settings Panel ──────────────────────────────────────────────────────

function GridSettingsPanel({ settings, onChange, onClose }: {
  settings: GridSettings;
  onChange: (s: GridSettings) => void;
  onClose: () => void;
}) {
  const toggle = (key: ColKey) => {
    const hidden = settings.hiddenCols.includes(key)
      ? settings.hiddenCols.filter(k => k !== key)
      : [...settings.hiddenCols, key];
    onChange({ ...settings, hiddenCols: hidden });
  };
  const reset = () => onChange({ ...DEFAULT_GRID, columnWidths: { ...DEFAULT_GRID.columnWidths } });

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border bg-popover shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-1.5"><Settings2 className="w-4 h-4 text-primary" /> Columns</span>
        <div className="flex gap-1">
          <button onClick={reset} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Reset"><RotateCcw className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-0.5">
        {ALL_COLUMNS.filter(c => c.hideable).map(col => {
          const visible = !settings.hiddenCols.includes(col.key);
          return (
            <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 cursor-pointer">
              <div
                onClick={() => toggle(col.key)}
                className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                  visible ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                )}
              >
                {visible && <span className="text-[10px] font-bold">✓</span>}
              </div>
              <span className="text-sm">{col.label}</span>
              {!visible && <EyeOff className="w-3 h-3 text-muted-foreground ml-auto" />}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// CreateInvoiceDialog replaced by NewInvoiceTerminal

// ─── Main Billing Page ────────────────────────────────────────────────────────

export default function AdminBilling() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithMeta | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceWithMeta | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithMeta | null>(null);
  const [gridSettings, setGridSettings] = useState<GridSettings>(loadGrid);
  const [showGridSettings, setShowGridSettings] = useState(false);

  const resizingRef = useRef<{ col: ColKey; startX: number; startWidth: number } | null>(null);

  const updateGrid = useCallback((s: GridSettings) => {
    setGridSettings(s);
    saveGrid(s);
  }, []);

  const startResize = useCallback((e: React.MouseEvent, col: ColKey) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { col, startX: e.clientX, startWidth: gridSettings.columnWidths[col] };
    const onMove = (ev: MouseEvent) => {
      const current = resizingRef.current;
      if (!current) return;
      const delta = ev.clientX - current.startX;
      const colDef = ALL_COLUMNS.find(c => c.key === current.col)!;
      const newW = Math.max(colDef.minWidth, current.startWidth + delta);
      setGridSettings(prev => {
        const next = { ...prev, columnWidths: { ...prev.columnWidths, [current.col]: newW } };
        saveGrid(next);
        return next;
      });
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [gridSettings.columnWidths]);

  const handleSort = useCallback((col: ColKey) => {
    setGridSettings(prev => {
      let dir: SortDir;
      if (prev.sortCol !== col) dir = "asc";
      else if (prev.sortDir === "asc") dir = "desc";
      else dir = null;
      const next = { ...prev, sortCol: dir ? col : null, sortDir: dir };
      saveGrid(next);
      return next;
    });
  }, []);

  const { data: invoicesData, isLoading } = useQuery<InvoiceWithMeta[]>({ queryKey: ["/api/invoices"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      if (!res.ok) throw new Error("Failed to delete invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDeletingInvoice(null);
      toast({ title: "Invoice Deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const getOwnerName = (inv: InvoiceWithMeta) => {
    if (inv.invoiceType === "op" && inv.opOwnerName) return inv.opOwnerName;
    const o = owners?.find(o => o.id === inv.ownerId);
    return o ? `${o.firstName} ${o.lastName}` : inv.ownerName || "—";
  };
  const getPetName = (inv: InvoiceWithMeta) => {
    if (inv.invoiceType === "op" && inv.opPetName) return inv.opPetName;
    if (!inv.petId) return "—";
    return allPets?.find(p => p.id === inv.petId)?.name || inv.petName || "—";
  };

  // Filter + sort — paid & marked invoices are hidden from this page
  const statuses = ["pending", "draft", "forwarded", "cancelled"];

  const filtered = useMemo(() => {
    // Always exclude paid and marked invoices from this page
    let result = (invoicesData || []).filter(inv => inv.status !== "paid" && inv.status !== "marked");
    if (statusFilter) result = result.filter(inv => inv.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.ownerName || "").toLowerCase().includes(q) ||
        (inv.petName || "").toLowerCase().includes(q) ||
        (inv.createdByName || "").toLowerCase().includes(q)
      );
    }
    if (gridSettings.sortCol && gridSettings.sortDir) {
      result = [...result].sort((a, b) => {
        let av: any = "", bv: any = "";
        switch (gridSettings.sortCol) {
          case "invoiceNumber":
            const am = String(a.invoiceNumber).match(/\d+/);
            const bm = String(b.invoiceNumber).match(/\d+/);
            if (am && bm) return gridSettings.sortDir === "asc" ? Number(am[0]) - Number(bm[0]) : Number(bm[0]) - Number(am[0]);
            return gridSettings.sortDir === "asc" ? String(a.invoiceNumber).localeCompare(String(b.invoiceNumber)) : String(b.invoiceNumber).localeCompare(String(a.invoiceNumber));
          case "date": av = a.date || ""; bv = b.date || ""; break;
          case "type": av = a.invoiceType || "ip"; bv = b.invoiceType || "ip"; break;
          case "patient": av = getPetName(a); bv = getPetName(b); break;
          case "owner": av = getOwnerName(a); bv = getOwnerName(b); break;
          case "payment": av = a.paymentMethod || ""; bv = b.paymentMethod || ""; break;
          case "billedBy": av = a.billedByName || a.createdByName || ""; bv = b.billedByName || b.createdByName || ""; break;
          case "status": av = a.status; bv = b.status; break;
          case "amount": av = parseFloat(a.total || "0"); bv = parseFloat(b.total || "0"); break;
        }
        if (typeof av === "number" && typeof bv === "number") {
          return gridSettings.sortDir === "asc" ? av - bv : bv - av;
        }
        return gridSettings.sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [invoicesData, searchQuery, statusFilter, gridSettings.sortCol, gridSettings.sortDir, owners, allPets]);

  // Summary stats
  const stats = useMemo(() => {
    const all = invoicesData || [];
    const paid = all.filter(i => i.status === "paid");
    const pending = all.filter(i => i.status === "pending");
    const drafts = all.filter(i => i.status === "draft");
    return {
      total: all.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((s, i) => s + parseFloat(i.total || "0"), 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, i) => s + parseFloat(i.total || "0"), 0),
      draftCount: drafts.length,
    };
  }, [invoicesData]);

  const visibleCols = ALL_COLUMNS.filter(c => !gridSettings.hiddenCols.includes(c.key));
  const tableWidth = visibleCols.reduce((s, c) => s + gridSettings.columnWidths[c.key], 0);
  const isHidden = (k: ColKey) => gridSettings.hiddenCols.includes(k);

  return (
    <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-6">

      {/* Billing Terminal is now globally mounted in App.tsx */}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="w-8 h-8 text-primary" />
            Billing
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage invoices, track payments and billing history.
          </p>
        </div>
        {hasPermission("billing.create", "billing.manage") && (
          <Button onClick={openNewInvoiceTerminal} className="gap-2">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border bg-card flex flex-col gap-1 hover:shadow-sm transition-shadow">
          <span className="text-xs font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" /> Total Invoices
          </span>
          <span className="text-2xl font-black">{isLoading ? "—" : stats.total}</span>
        </div>
        <div
          className="p-4 rounded-xl border bg-amber-50/60 border-amber-200/80 flex flex-col gap-1 cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => setStatusFilter("pending")}
        >
          <span className="text-xs font-bold uppercase text-amber-600 tracking-wide">Pending</span>
          <span className="text-2xl font-black text-amber-700">{isLoading ? "—" : stats.pendingCount}</span>
          <span className="text-xs text-amber-600">₹{stats.pendingAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
        </div>
        <div
          className="p-4 rounded-xl border bg-zinc-50/60 flex flex-col gap-1 cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => setStatusFilter("draft")}
        >
          <span className="text-xs font-bold uppercase text-muted-foreground tracking-wide">Drafts</span>
          <span className="text-2xl font-black text-muted-foreground">{isLoading ? "—" : stats.draftCount}</span>
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice, owner, patient..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              statusFilter === ""
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-transparent hover:border-border hover:bg-muted/60"
            )}
          >
            All
          </button>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:border-border hover:bg-muted/60"
              )}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Invoice Table ── */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Table header bar */}
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Invoices
            </h2>
            <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
          </div>
          <div className="flex items-center gap-2 relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowGridSettings(!showGridSettings)}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Columns
            </Button>
            {showGridSettings && (
              <GridSettingsPanel
                settings={gridSettings}
                onChange={updateGrid}
                onClose={() => setShowGridSettings(false)}
              />
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Receipt className="w-12 h-12 opacity-20" />
            <p className="text-sm">No invoices found.</p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                <X className="w-3.5 h-3.5 mr-1" /> Clear search
              </Button>
            )}
          </div>
        ) : (
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 380px)", minHeight: 200 }}
          >
            <table
              style={{ tableLayout: "fixed", width: tableWidth }}
              className="w-full text-sm"
            >
              <thead className="sticky top-0 z-10">
                <tr className="border-b bg-muted/40">
                  {visibleCols.map(col => {
                    const isSorted = gridSettings.sortCol === col.key;
                    return (
                      <th
                        key={col.key}
                        style={{ width: gridSettings.columnWidths[col.key], minWidth: col.minWidth, position: "relative", userSelect: "none" }}
                        className={cn(
                          "px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground tracking-wide bg-muted/40",
                          col.sortable && "cursor-pointer hover:text-foreground hover:bg-muted/60 transition-colors",
                          isSorted && "text-primary bg-primary/5"
                        )}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1 pr-2">
                          <span className="truncate">{col.label.toUpperCase()}</span>
                          {col.sortable && (
                            <span className="flex-shrink-0 ml-auto">
                              {isSorted && gridSettings.sortDir === "asc"
                                ? <ArrowUp className="w-3 h-3 text-primary" />
                                : isSorted && gridSettings.sortDir === "desc"
                                ? <ArrowDown className="w-3 h-3 text-primary" />
                                : <ArrowUpDown className="w-3 h-3 opacity-30" />
                              }
                            </span>
                          )}
                        </div>
                        <div
                          onMouseDown={e => startResize(e, col.key)}
                          onClick={e => e.stopPropagation()}
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center group"
                        >
                          <div className="w-0.5 h-4 bg-border rounded group-hover:bg-primary/60 transition-colors" />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr
                    key={inv.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setViewInvoice(inv)}
                  >
                    {!isHidden("invoiceNumber") && (
                      <td style={{ width: gridSettings.columnWidths["invoiceNumber"] }} className="px-3 py-2.5">
                        <span 
                          className="font-mono text-xs text-primary font-bold truncate block hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNewInvoiceTerminal(inv.id);
                          }}
                        >
                          {inv.invoiceNumber}
                        </span>
                      </td>
                    )}
                    {!isHidden("date") && (
                      <td style={{ width: gridSettings.columnWidths["date"] }} className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground truncate block">{inv.date}</span>
                      </td>
                    )}
                    {!isHidden("type") && (
                      <td style={{ width: gridSettings.columnWidths["type"] }} className="px-3 py-2.5">
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-bold px-1.5 py-0 uppercase",
                          inv.invoiceType === "op" ? "border-amber-200 text-amber-600 bg-amber-50" : "border-blue-200 text-blue-600 bg-blue-50"
                        )}>
                          {inv.invoiceType || "ip"}
                        </Badge>
                      </td>
                    )}
                    {!isHidden("patient") && (
                      <td style={{ width: gridSettings.columnWidths["patient"] }} className="px-3 py-2.5">
                        <span className="text-sm font-medium truncate block">{getPetName(inv)}</span>
                      </td>
                    )}
                    {!isHidden("owner") && (
                      <td style={{ width: gridSettings.columnWidths["owner"] }} className="px-3 py-2.5">
                        <span className="text-sm truncate block">{getOwnerName(inv)}</span>
                      </td>
                    )}
                    {!isHidden("payment") && (
                      <td style={{ width: gridSettings.columnWidths["payment"] }} className="px-3 py-2.5">
                        <PaymentBadge method={inv.paymentMethod} />
                      </td>
                    )}
                    {!isHidden("billedBy") && (
                      <td style={{ width: gridSettings.columnWidths["billedBy"] }} className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground truncate block">
                          {inv.billedByName || inv.createdByName || "—"}
                        </span>
                      </td>
                    )}
                    {!isHidden("status") && (
                      <td style={{ width: gridSettings.columnWidths["status"] }} className="px-3 py-2.5">
                        <StatusPill status={inv.status} />
                      </td>
                    )}
                    {!isHidden("amount") && (
                      <td style={{ width: gridSettings.columnWidths["amount"] }} className="px-3 py-2.5">
                        <span className={cn(
                          "block text-right font-semibold font-mono truncate",
                          inv.status === "paid" ? "text-emerald-700" : "text-foreground"
                        )}>
                          {formatCurrency(inv.total)}
                        </span>
                      </td>
                    )}
                    {!isHidden("actions") && (
                      <td
                        style={{ width: gridSettings.columnWidths["actions"] }}
                        className="px-3 py-2.5"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setViewInvoice(inv)}
                            title="View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {hasPermission("billing.manage", "billing.delete") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingInvoice(inv)}
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer total */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t flex justify-between items-center text-sm bg-muted/20">
            <span className="text-muted-foreground font-medium">
              {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
              {statusFilter && ` · ${statusLabel(statusFilter)}`}
            </span>
            <span className="font-bold text-primary font-mono">
              {formatCurrency(filtered.reduce((s, i) => s + parseFloat(i.total || "0"), 0))}
            </span>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      {viewInvoice && owners && allPets && (
        <ViewInvoiceDialog
          invoice={viewInvoice}
          owners={owners}
          allPets={allPets}
          open={!!viewInvoice}
          onOpenChange={v => { if (!v) setViewInvoice(null); }}
          onMarkPaid={setPayingInvoice}
        />
      )}

      <MarkAsPaidDialog
        invoice={payingInvoice}
        open={!!payingInvoice}
        onOpenChange={v => { if (!v) setPayingInvoice(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })}
      />

      <DeleteInvoiceDialog
        invoice={deletingInvoice}
        open={!!deletingInvoice}
        onOpenChange={v => { if (!v) setDeletingInvoice(null); }}
        onConfirm={() => deletingInvoice && deleteInvoiceMutation.mutate(deletingInvoice.id)}
        isDeleting={deleteInvoiceMutation.isPending}
      />
    </div>
  );
}

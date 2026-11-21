import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search, Calendar, User, Phone, MapPin, FileText, Plus,
  Download, Printer, ChevronDown, ChevronUp, Filter,
  PawPrint, CreditCard, Banknote, Smartphone, RefreshCw,
  TrendingUp, Users, Receipt, IndianRupee, ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { InvoiceWithMeta } from "@/components/invoice-dialogs";
import { ViewInvoiceDialog, MarkAsPaidDialog, DeleteInvoiceDialog } from "@/components/invoice-dialogs";
import type { Owner, Pet } from "@shared/schema";
import { openNewInvoiceTerminal } from "@/components/NewInvoiceTerminal";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: string | number | null | undefined) {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? "0.00" : v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

function payIcon(method: string | null | undefined, status?: string) {
  if (status && status !== "paid") return null;
  if (!method) return <Banknote className="w-3.5 h-3.5 text-zinc-400" />;
  const m = method.toLowerCase();
  if (m.includes("upi")) return <Smartphone className="w-3.5 h-3.5 text-violet-500" />;
  if (m.includes("card")) return <CreditCard className="w-3.5 h-3.5 text-blue-500" />;
  if (m.includes("credit")) return <CreditCard className="w-3.5 h-3.5 text-rose-500" />;
  return <Banknote className="w-3.5 h-3.5 text-emerald-500" />;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    credit: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", map[status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200")}>
      {status}
    </span>
  );
}

// Parse opOwnerName which is formatted as: "Name | Ph: 1234 | Addr: ..."
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

/**
 * Enrich an OP invoice so the InvoiceRenderer can populate its fields.
 * The renderer looks for: ownerName, ownerPhone, ownerAddress, patientName.
 * For OP invoices these live in opOwnerName / opPetName.
 */
function enrichOpInvoice(inv: InvoiceWithMeta): InvoiceWithMeta {
  const owner = parseOpOwner(inv.opOwnerName);
  return {
    ...inv,
    ownerName: owner.name,
    ownerPhone: owner.phone,
    ownerAddress: owner.address,
    patientName: inv.opPetName || "",
    petName: inv.opPetName || "",
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OpLedger() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "credit">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "total">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithMeta | null>(null);
  const [markPaidInvoice, setMarkPaidInvoice] = useState<InvoiceWithMeta | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithMeta | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

  const { data: allInvoices = [], isLoading, refetch } = useQuery<InvoiceWithMeta[]>({
    queryKey: ["/api/invoices"],
    staleTime: 0,
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      if (!res.ok) throw new Error("Failed to delete invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
      setDeletingInvoice(null);
      toast({ title: "Invoice Deleted", description: "Paid OP invoice has been permanently deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ViewInvoiceDialog needs owners + pets arrays (empty is fine for OP - no FK owner)
  const { data: owners = [] } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: allPets = [] } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  // Only OP invoices
  const opInvoices = useMemo(() =>
    allInvoices.filter(inv => inv.invoiceType === "op" || inv.ownerId === 0),
    [allInvoices]
  );

  // Apply filters
  const filtered = useMemo(() => {
    let list = [...opInvoices];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(inv => {
        const owner = parseOpOwner(inv.opOwnerName);
        return (
          owner.name.toLowerCase().includes(q) ||
          owner.phone.includes(q) ||
          owner.address.toLowerCase().includes(q) ||
          (inv.opPetName || "").toLowerCase().includes(q) ||
          (inv.invoiceNumber || "").toLowerCase().includes(q)
        );
      });
    }

    if (dateFrom) list = list.filter(inv => (inv.date || "") >= dateFrom);
    if (dateTo)   list = list.filter(inv => (inv.date || "") <= dateTo);
    if (statusFilter !== "all") list = list.filter(inv => inv.status === statusFilter);

    list.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortBy === "date") { va = a.date || ""; vb = b.date || ""; }
      if (sortBy === "name") { va = parseOpOwner(a.opOwnerName).name; vb = parseOpOwner(b.opOwnerName).name; }
      if (sortBy === "total") { va = parseFloat(String(a.total || 0)); vb = parseFloat(String(b.total || 0)); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [opInvoices, search, dateFrom, dateTo, statusFilter, sortBy, sortDir]);

  // Summary stats
  const stats = useMemo(() => {
    const total   = filtered.reduce((s, i) => s + parseFloat(String(i.total || 0)), 0);
    const paid    = filtered.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(String(i.total || 0)), 0);
    const pending = filtered.filter(i => i.status === "pending").reduce((s, i) => s + parseFloat(String(i.total || 0)), 0);
    const uniquePatients = new Set(filtered.map(i => parseOpOwner(i.opOwnerName).name.toLowerCase())).size;
    return { total, paid, pending, uniquePatients, count: filtered.length };
  }, [filtered]);

  // Group by patient name
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string; address: string; invoices: InvoiceWithMeta[] }>();
    for (const inv of filtered) {
      const owner = parseOpOwner(inv.opOwnerName);
      const key = owner.name.toLowerCase().trim() || "unknown";
      if (!map.has(key)) map.set(key, { key, ...owner, invoices: [] });
      map.get(key)!.invoices.push(inv);
    }
    return [...map.values()];
  }, [filtered]);

  function toggleSort(col: "date" | "name" | "total") {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: "date" | "name" | "total" }) {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 text-zinc-300" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-orange-500" />
      : <ChevronDown className="w-3 h-3 text-orange-500" />;
  }

  function openInvoice(inv: InvoiceWithMeta) {
    openNewInvoiceTerminal(inv.id);
  }

  // Export CSV
  function exportCSV() {
    const headers = ["Invoice No", "Date", "Patient Name", "Phone", "Address", "Pet/Animal", "Total", "Status", "Payment Method"];
    const rows = filtered.map(inv => {
      const o = parseOpOwner(inv.opOwnerName);
      return [inv.invoiceNumber, inv.date, o.name, o.phone, o.address, inv.opPetName || "", inv.total, inv.status, inv.status === "paid" ? (inv.paymentMethod || "cash") : "—"];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `op-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-700 via-orange-600 to-amber-600 px-6 pt-8 pb-6 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-start gap-4">
              <button 
                onClick={() => setLocation("/accounts")}
                className="mt-1 flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Back to Accounts"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-orange-200 font-bold mb-1">Out-Patient Register</p>
                <h1 className="text-2xl font-black flex items-center gap-2">
                  <Users className="w-6 h-6 text-orange-200" />
                  O/P Patient Ledger
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openNewInvoiceTerminal}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" /> New Invoice
              </button>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition-all"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-orange-700 font-bold text-sm hover:bg-orange-50 shadow transition-all"
              >
                <Printer className="w-4 h-4" /> Print List
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total O/P Visits", value: stats.count, icon: Receipt, color: "text-white", sub: "invoices" },
              { label: "Unique Patients", value: stats.uniquePatients, icon: Users, color: "text-white", sub: "individuals" },
              { label: "Total Revenue", value: `₹${fmt(stats.total)}`, icon: IndianRupee, color: "text-emerald-300", sub: "collected + pending" },
              { label: "Pending Amount", value: `₹${fmt(stats.pending)}`, icon: TrendingUp, color: "text-amber-300", sub: "not yet paid" },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                <p className="text-[10px] text-orange-200 font-semibold uppercase tracking-wider">{stat.label}</p>
                <p className={cn("text-xl font-black mt-1", stat.color)}>{stat.value}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, phone, pet, invoice no..."
                className="w-full h-9 pl-9 pr-3 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">From</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="h-9 pl-8 pr-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 w-36" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">To</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="h-9 pl-8 pr-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 w-36" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Status</label>
            <div className="flex rounded-xl border border-zinc-200 overflow-hidden h-9">
              {(["all", "paid", "pending", "credit"] as const).map(s => (
                <button key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 text-xs font-bold capitalize transition-colors border-r last:border-r-0 border-zinc-200",
                    statusFilter === s ? "bg-orange-600 text-white" : "bg-white text-zinc-500 hover:bg-orange-50"
                  )}
                >{s}</button>
              ))}
            </div>
          </div>

          {(search || dateFrom || dateTo || statusFilter !== "all") && (
            <button
              onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter("all"); }}
              className="h-9 px-3 text-xs font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 border border-red-200 flex items-center gap-1 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
              <p className="text-sm text-zinc-500">Loading O/P records...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-zinc-200 p-12 flex flex-col items-center text-center">
            <Users className="w-12 h-12 text-zinc-200 mb-3" />
            <p className="text-zinc-500 font-semibold">No O/P records found</p>
            <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters or create walk-in invoices from the billing terminal.</p>
          </div>
        ) : (
          <>
            {/* Flat Table */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  All O/P Invoices
                  <span className="ml-1 bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full">{filtered.length}</span>
                </h2>
                <p className="text-xs text-zinc-400">Total: <span className="font-bold text-zinc-700">₹{fmt(stats.total)}</span></p>
              </div>

              <div className="grid grid-cols-[120px_1fr_130px_110px_90px_100px_40px] gap-0 bg-zinc-50 border-b border-zinc-100 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                <button onClick={() => toggleSort("date")} className="flex items-center gap-1 px-3 py-2.5 hover:text-orange-600 transition-colors">
                  Date <SortIcon col="date" />
                </button>
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 px-3 py-2.5 hover:text-orange-600 transition-colors">
                  Patient / Owner <SortIcon col="name" />
                </button>
                <div className="px-3 py-2.5">Invoice</div>
                <div className="px-3 py-2.5">Pet / Animal</div>
                <div className="px-3 py-2.5">Status</div>
                <button onClick={() => toggleSort("total")} className="flex items-center gap-1 px-3 py-2.5 hover:text-orange-600 transition-colors justify-end">
                  Total <SortIcon col="total" />
                </button>
                <div className="px-3 py-2.5"></div>
              </div>

              <div className="divide-y divide-zinc-50">
                {filtered.map(inv => {
                  const owner = parseOpOwner(inv.opOwnerName);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => openInvoice(inv)}
                      className="grid grid-cols-[120px_1fr_130px_110px_90px_100px_40px] gap-0 items-center hover:bg-orange-50/50 cursor-pointer group transition-colors"
                    >
                      <div className="px-3 py-3 text-xs text-zinc-500 font-mono">{fmtDate(inv.date)}</div>
                      <div className="px-3 py-3 min-w-0">
                        <p className="font-bold text-sm text-zinc-800 truncate">{owner.name}</p>
                        {owner.phone && (
                          <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />{owner.phone}
                          </p>
                        )}
                        {owner.address && (
                          <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />{owner.address}
                          </p>
                        )}
                      </div>
                      <div className="px-3 py-3 text-xs font-mono text-zinc-600">{inv.invoiceNumber}</div>
                      <div className="px-3 py-3 text-xs text-zinc-600 flex items-center gap-1">
                        <PawPrint className="w-3 h-3 text-orange-300 shrink-0" />
                        <span className="truncate">{inv.opPetName || <span className="text-zinc-300 italic">—</span>}</span>
                      </div>
                      <div className="px-3 py-3">{statusBadge(inv.status)}</div>
                      <div className="px-3 py-3 text-right">
                        <p className="font-bold text-sm text-zinc-800">₹{fmt(inv.total)}</p>
                        <div className="flex justify-end mt-0.5">{payIcon(inv.paymentMethod, inv.status)}</div>
                      </div>
                      <div className="px-2 py-3 flex items-center justify-center">
                        <ChevronDown className="w-4 h-4 text-zinc-300 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-orange-50 border-t border-orange-200 grid grid-cols-[120px_1fr_130px_110px_90px_100px_40px] items-center">
                <div className="px-3 py-2.5 col-span-5 text-xs font-black uppercase text-orange-700">Grand Total ({filtered.length} invoices)</div>
                <div className="px-3 py-2.5 text-right font-black text-sm text-orange-700">₹{fmt(stats.total)}</div>
                <div />
              </div>
            </div>

            {/* Grouped by Patient */}
            <div className="mt-6">
              <h2 className="text-sm font-bold text-zinc-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                Grouped by Patient
              </h2>
              <div className="space-y-2">
                {grouped.map(group => {
                  const groupTotal = group.invoices.reduce((s, i) => s + parseFloat(String(i.total || 0)), 0);
                  const isExpanded = expandedGroup === group.key;
                  return (
                    <div key={group.key} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50/60 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-zinc-800">{group.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {group.phone && (
                              <span className="text-[10px] text-zinc-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{group.phone}</span>
                            )}
                            {group.address && (
                              <span className="text-[10px] text-zinc-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{group.address}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-bold text-zinc-600">{group.invoices.length} visit{group.invoices.length > 1 ? "s" : ""}</p>
                            <p className="text-sm font-black text-orange-600">₹{fmt(groupTotal)}</p>
                          </div>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-orange-500" />
                            : <ChevronDown className="w-4 h-4 text-zinc-400" />
                          }
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-zinc-100 divide-y divide-zinc-50">
                          {group.invoices.map(inv => (
                            <div
                              key={inv.id}
                              onClick={() => openInvoice(inv)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/40 cursor-pointer transition-colors"
                            >
                              <div className="text-xs font-mono text-zinc-500 w-28 shrink-0">{fmtDate(inv.date)}</div>
                              <div className="text-xs font-mono text-zinc-500 w-28 shrink-0">{inv.invoiceNumber}</div>
                              {inv.opPetName && (
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                  <PawPrint className="w-3 h-3 text-orange-300" />{inv.opPetName}
                                </div>
                              )}
                              <div className="ml-auto flex items-center gap-2">
                                {statusBadge(inv.status)}
                                <span className="font-bold text-sm text-zinc-800 w-24 text-right">₹{fmt(inv.total)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Real Invoice Dialog — uses the clinic's designed template for printing */}
      {selectedInvoice && (
        <ViewInvoiceDialog
          invoice={selectedInvoice}
          owners={owners}
          allPets={allPets}
          open={!!selectedInvoice}
          onOpenChange={(v) => { if (!v) setSelectedInvoice(null); }}
          onMarkPaid={(inv) => {
            setSelectedInvoice(null);
            setMarkPaidInvoice(inv);
          }}
          onDeleteRequest={isSuperAdmin ? (inv) => {
            setSelectedInvoice(null);
            setDeletingInvoice(inv);
          } : undefined}
        />
      )}

      {/* Delete Invoice Dialog */}
      <DeleteInvoiceDialog
        invoice={deletingInvoice}
        open={!!deletingInvoice}
        onOpenChange={(v) => { if (!v) setDeletingInvoice(null); }}
        onConfirm={() => deletingInvoice && deleteInvoiceMutation.mutate(deletingInvoice.id)}
        isDeleting={deleteInvoiceMutation.isPending}
      />

      {/* Mark As Paid Dialog */}
      <MarkAsPaidDialog
        invoice={markPaidInvoice}
        open={!!markPaidInvoice}
        onOpenChange={(v) => { if (!v) setMarkPaidInvoice(null); }}
        onSuccess={() => {
          setMarkPaidInvoice(null);
          refetch();
        }}
      />
    </div>
  );
}

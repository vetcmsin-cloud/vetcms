import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type Expense, type InsertExpense, insertExpenseSchema, type LedgerEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ViewInvoiceDialog, DeleteInvoiceDialog, type InvoiceWithMeta } from "@/components/invoice-dialogs";
import { openNewInvoiceTerminal } from "@/components/NewInvoiceTerminal";
import { openNewExpenseTerminal } from "@/components/NewExpenseTerminal";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2, Plus, Trash2, TrendingUp, TrendingDown, Wallet,
    FileText, Receipt, BarChart3, Printer, Search, Eye, EyeOff,
    CreditCard, Banknote, Smartphone, CheckSquare, CalendarDays,
    Settings2, RotateCcw, X, ArrowUp, ArrowDown, ArrowUpDown,
    History, PieChart, FolderTree, BookText, Users, Truck, Coins, BookOpen, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Owner, Pet } from "@shared/schema";



type ClinicSettingsMap = Record<string, string>;

function formatCurrency(amount: number | string) {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(num);
}

function statusBadge(status: string) {
    switch (status) {
        case "paid": return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Paid</Badge>;
        case "pending": return <Badge variant="secondary">Pending</Badge>;
        case "forwarded": return <Badge variant="outline">Forwarded</Badge>;
        case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}

function paymentMethodBadge(method: string | null) {
    if (!method) return <span className="text-muted-foreground text-xs">–</span>;
    const icons: Record<string, any> = {
        cash: Banknote,
        upi: Smartphone,
        card: CreditCard,
        cheque: CheckSquare,
    };
    const Icon = icons[method.toLowerCase()] || Wallet;
    const colors: Record<string, string> = {
        cash: "text-green-600",
        upi: "text-violet-600",
        card: "text-blue-600",
        cheque: "text-amber-600",
    };
    const color = colors[method.toLowerCase()] || "text-muted-foreground";
    return (
        <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
            <Icon className="w-3 h-3" />
            {method.toUpperCase()}
        </span>
    );
}

// Tile navigation
type Tab = "invoices" | "expenses" | "reports" | "ledger" | "expense_management";

// ─── Grid Settings Types & Config ─────────────────────────────────────────────
type ColKey = "invoiceNumber" | "date" | "type" | "createdAt" | "patient" | "owner" | "payment" | "billedBy" | "amount" | "actions";
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
    { key: "invoiceNumber", label: "Invoice #", defaultWidth: 100, minWidth: 80, sortable: true, hideable: false },
    { key: "date", label: "Date", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
    { key: "type", label: "I/P O/P", defaultWidth: 80, minWidth: 60, sortable: true, hideable: true },
    { key: "createdAt", label: "Created Time", defaultWidth: 140, minWidth: 100, sortable: true, hideable: true },
    { key: "patient", label: "Patient", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
    { key: "owner", label: "Owner", defaultWidth: 150, minWidth: 100, sortable: true, hideable: true },
    { key: "payment", label: "Payment", defaultWidth: 100, minWidth: 80, sortable: true, hideable: true },
    { key: "billedBy", label: "Billed By", defaultWidth: 120, minWidth: 80, sortable: true, hideable: true },
    { key: "amount", label: "Amount", defaultWidth: 120, minWidth: 80, sortable: true, hideable: false },
    { key: "actions", label: "Actions", defaultWidth: 80, minWidth: 60, sortable: false, hideable: false },
];

interface GridSettings {
    columnWidths: Record<string, number>;
    hiddenCols: string[];
    sortCol: ColKey | null;
    sortDir: SortDir;
}

const DEFAULT_SETTINGS: GridSettings = {
    columnWidths: Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<string, number>,
    hiddenCols: [],
    sortCol: "createdAt",
    sortDir: "desc",
};

const STORAGE_KEY = "accounts_grid_settings_v1";

function loadGridSettings(): GridSettings {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch { }
    return DEFAULT_SETTINGS;
}

function saveGridSettings(settings: GridSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
        };
        onSettingsChange(fresh);
    };

    return (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border bg-popover shadow-xl p-4 flex flex-col gap-3">
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
            <p className="text-xs text-muted-foreground text-center">
                Drag column borders to resize • Click headers to sort
            </p>
        </div>
    );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
    const [, setLocation] = useLocation();
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewInvoice, setViewInvoice] = useState<InvoiceWithMeta | null>(null);
    const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithMeta | null>(null);
    const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

    // Grid settings state
    const [gridSettings, setGridSettings] = useState<GridSettings>(loadGridSettings);
    const [showGridSettings, setShowGridSettings] = useState(false);

    const updateGridSettings = useCallback((s: GridSettings) => {
        setGridSettings(s);
        saveGridSettings(s);
    }, []);

    // Resizing state
    const resizingRef = useRef<{ col: ColKey; startX: number; startWidth: number } | null>(null);

    const startResize = useCallback((e: React.MouseEvent, col: ColKey) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { col, startX: e.clientX, startWidth: gridSettings.columnWidths[col] };
        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const delta = ev.clientX - resizingRef.current.startX;
            const colDef = ALL_COLUMNS.find(c => c.key === resizingRef.current!.col)!;
            const newWidth = Math.max(colDef.minWidth, resizingRef.current.startWidth + delta);
            setGridSettings(prev => {
                const next = { ...prev, columnWidths: { ...prev.columnWidths, [resizingRef.current!.col]: newWidth } };
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
        setGridSettings(prev => {
            let dir: SortDir;
            if (prev.sortCol !== col) dir = "asc";
            else if (prev.sortDir === "asc") dir = "desc";
            else dir = null;
            const next = { ...prev, sortCol: dir ? col : null, sortDir: dir };
            saveGridSettings(next);
            return next;
        });
    }, []);

    // Blur-reveal state for sensitive amounts (start blurred)
    const [todayRevealed, setTodayRevealed] = useState(false);
    const [revenueRevealed, setRevenueRevealed] = useState(false);
    const [expensesRevealed, setExpensesRevealed] = useState(false);
    const [profitRevealed, setProfitRevealed] = useState(false);

    const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
        queryKey: ["/api/expenses"],
    });

    const { data: summary, isLoading: loadingSummary } = useQuery<{
        income: number;
        expenses: number;
        netProfit: number;
    }>({
        queryKey: ["/api/accounts/summary"],
    });

    const { data: ledgerEntries, isLoading: loadingLedger } = useQuery<LedgerEntry[]>({
        queryKey: ["/api/ledger"],
    });

    const { data: invoicesData, isLoading: loadingInvoices } = useQuery<InvoiceWithMeta[]>({
        queryKey: ["/api/invoices"],
    });

    const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
    const { data: allPets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });
    const { data: clinicSettings } = useQuery<ClinicSettingsMap>({ queryKey: ["/api/clinic-settings"] });

    // Only paid invoices shown in accounting
    const paidInvoices = useMemo(() => {
        if (!invoicesData) return [];
        return invoicesData.filter(inv => inv.status === "paid");
    }, [invoicesData]);

    // Today's revenue — uses createdAt timestamp (IST), falls back to date field
    const todayRevenue = useMemo(() => {
        const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        return paidInvoices
            .filter(inv => inv.date === todayIST)
            .reduce((sum, inv) => sum + parseFloat(inv.total || "0"), 0);
    }, [paidInvoices]);

    const filteredPaidInvoices = useMemo(() => {
        let result = paidInvoices;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = paidInvoices.filter(inv => {
                const owner = owners?.find(o => o.id === inv.ownerId);
                const pet = inv.petId ? allPets?.find(p => p.id === inv.petId) : null;
                const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : "";
                const petName = pet?.name || "";
                return (
                    inv.invoiceNumber.toLowerCase().includes(q) ||
                    ownerName.toLowerCase().includes(q) ||
                    petName.toLowerCase().includes(q) ||
                    (inv.paymentMethod || "").toLowerCase().includes(q) ||
                    (inv.createdByName || "").toLowerCase().includes(q)
                );
            });
        }

        // Apply visual sorting
        if (gridSettings.sortCol && gridSettings.sortDir) {
            result = [...result].sort((a, b) => {
                let aVal: any = "";
                let bVal: any = "";

                switch (gridSettings.sortCol) {
                    case "invoiceNumber":
                        aVal = a.invoiceNumber;
                        bVal = b.invoiceNumber;
                        // Special numeric sort if they match the '#PET-XXXX' pattern
                        const aMatch = String(aVal).match(/\d+/);
                        const bMatch = String(bVal).match(/\d+/);
                        if (aMatch && bMatch) {
                            return gridSettings.sortDir === "asc" ? Number(aMatch[0]) - Number(bMatch[0]) : Number(bMatch[0]) - Number(aMatch[0]);
                        }
                        return gridSettings.sortDir === "asc"
                            ? String(aVal).localeCompare(String(bVal))
                            : String(bVal).localeCompare(String(aVal));
                    case "date":
                        aVal = a.date || "";
                        bVal = b.date || "";
                        break;
                    case "type":
                        aVal = a.invoiceType || "ip";
                        bVal = b.invoiceType || "ip";
                        break;
                    case "createdAt":
                        aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        break;
                    case "patient":
                        aVal = allPets?.find(p => p.id === a.petId)?.name || "";
                        bVal = allPets?.find(p => p.id === b.petId)?.name || "";
                        break;
                    case "owner":
                        aVal = owners?.find(o => o.id === a.ownerId)?.firstName || "";
                        bVal = owners?.find(o => o.id === b.ownerId)?.firstName || "";
                        break;
                    case "payment":
                        aVal = a.paymentMethod || "";
                        bVal = b.paymentMethod || "";
                        break;
                    case "billedBy":
                        aVal = a.billedByName || a.createdByName || "";
                        bVal = b.billedByName || b.createdByName || "";
                        break;
                    case "amount":
                        aVal = parseFloat(a.total || "0");
                        bVal = parseFloat(b.total || "0");
                        break;
                }

                if (typeof aVal === "number" && typeof bVal === "number") {
                    return gridSettings.sortDir === "asc" ? aVal - bVal : bVal - aVal;
                }
                return gridSettings.sortDir === "asc"
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
            });
        }
        return result;
    }, [paidInvoices, searchQuery, owners, allPets, gridSettings.sortCol, gridSettings.sortDir]);

    const filteredExpenses = useMemo(() => {
        if (!searchQuery.trim() || !expenses) return expenses || [];
        const q = searchQuery.toLowerCase();
        return expenses.filter(exp =>
            exp.description.toLowerCase().includes(q) ||
            exp.category.toLowerCase().includes(q) ||
            exp.paymentMethod.toLowerCase().includes(q)
        );
    }, [expenses, searchQuery]);

    const filteredLedger = useMemo(() => {
        if (!ledgerEntries) return [];
        let result = ledgerEntries;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = ledgerEntries.filter(entry => 
                (entry.description || "").toLowerCase().includes(q) ||
                (entry.party || "").toLowerCase().includes(q) ||
                (entry.voucherNumber || "").toLowerCase().includes(q)
            );
        }
        
        // Calculate running balance (Debits add to balance, Credits subtract)
        const asc = [...result].sort((a,b) => {
            if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
            return a.id - b.id;
        });
        
        let balance = 0;
        const withBalance = asc.map(entry => {
            const debit = parseFloat(String(entry.debitAmount)) || 0;
            const credit = parseFloat(String(entry.creditAmount)) || 0;
            balance += (debit - credit);
            return { ...entry, runningBalance: balance };
        });
        
        return withBalance.reverse();
    }, [ledgerEntries, searchQuery]);

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/expenses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
            toast({ title: "Expense deleted", description: "Expense record has been removed." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
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
            toast({ title: "Invoice Deleted", description: "Paid invoice has been permanently deleted." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const getOwnerName = (inv: InvoiceWithMeta) => {
        if (inv.invoiceType === "op" && inv.opOwnerName) return inv.opOwnerName;
        const owner = owners?.find(o => o.id === inv.ownerId);
        return owner ? `${owner.firstName} ${owner.lastName}` : (inv.ownerName || "Unknown");
    };

    const getPetName = (inv: InvoiceWithMeta) => {
        if (inv.invoiceType === "op" && inv.opPetName) return inv.opPetName;
        if (!inv.petId) return "–";
        const pet = allPets?.find(p => p.id === inv.petId);
        return pet?.name || inv.petName || "–";
    };

    const handlePrint = (inv: InvoiceWithMeta) => {
        setViewInvoice(inv);
    };

    if (!hasPermission("accounts.view")) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                You do not have permission to view accounts.
            </div>
        );
    }

    const isLoading = loadingExpenses || loadingSummary || loadingInvoices;

    // --- Monthly revenue for reports ---
    const monthlyRevenue = useMemo(() => {
        if (!paidInvoices) return [];
        const map: Record<string, number> = {};
        for (const inv of paidInvoices) {
            const month = inv.date?.substring(0, 7) || "Unknown";
            map[month] = (map[month] || 0) + parseFloat(inv.total || "0");
        }
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, total]) => ({
                month: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
                total,
            }));
    }, [paidInvoices]);

    const maxRevenue = useMemo(() => Math.max(...monthlyRevenue.map(m => m.total), 1), [monthlyRevenue]);

    const expenseByCategory = useMemo(() => {
        if (!expenses) return [];
        const map: Record<string, number> = {};
        for (const exp of expenses) {
            map[exp.category] = (map[exp.category] || 0) + parseFloat(String(exp.amount) || "0");
        }
        return Object.entries(map)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, total]) => ({ cat, total }));
    }, [expenses]);


    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {!activeTab ? (
                <>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
                            <p className="text-muted-foreground mt-1">
                                Financial overview, paid invoices and expense management.
                            </p>
                        </div>
                    </div>

                    {/* Summary Cards — 4 cols on large screens */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Today's Revenue */}
                        <Card className="border-l-4 border-l-amber-400">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                                <CalendarDays className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <button
                                    onClick={() => setTodayRevealed(v => !v)}
                                    className="flex items-center gap-2 group focus:outline-none"
                                    title={todayRevealed ? "Click to hide" : "Click to reveal"}
                                >
                                    <span className={`text-2xl font-bold text-amber-600 transition-all duration-300 select-none ${todayRevealed ? "" : "blur-[6px]"}`}>
                                        {loadingInvoices ? "──────" : formatCurrency(todayRevenue)}
                                    </span>
                                    <span className="opacity-0 group-hover:opacity-50 transition-opacity text-amber-600">
                                        {todayRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </span>
                                </button>
                                <p className="text-xs text-muted-foreground mt-1">Paid invoices today</p>
                            </CardContent>
                        </Card>
                        {/* Total Revenue */}
                        <Card className="border-l-4 border-l-emerald-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <button
                                    onClick={() => setRevenueRevealed(v => !v)}
                                    className="flex items-center gap-2 group focus:outline-none"
                                    title={revenueRevealed ? "Click to hide" : "Click to reveal"}
                                >
                                    <span className={`text-2xl font-bold text-emerald-600 transition-all duration-300 select-none ${revenueRevealed ? "" : "blur-[6px]"}`}>
                                        {loadingSummary ? "──────" : formatCurrency(summary?.income || 0)}
                                    </span>
                                    <span className="opacity-0 group-hover:opacity-50 transition-opacity text-emerald-600">
                                        {revenueRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </span>
                                </button>
                                <p className="text-xs text-muted-foreground mt-1">From {paidInvoices.length} paid invoices</p>
                            </CardContent>
                        </Card>

                        {/* Total Expenses */}
                        <Card className="border-l-4 border-l-rose-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                                <TrendingDown className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <button
                                    onClick={() => setExpensesRevealed(v => !v)}
                                    className="flex items-center gap-2 group focus:outline-none"
                                    title={expensesRevealed ? "Click to hide" : "Click to reveal"}
                                >
                                    <span className={`text-2xl font-bold text-rose-600 transition-all duration-300 select-none ${expensesRevealed ? "" : "blur-[6px]"}`}>
                                        {loadingSummary ? "──────" : formatCurrency(summary?.expenses || 0)}
                                    </span>
                                    <span className="opacity-0 group-hover:opacity-50 transition-opacity text-rose-600">
                                        {expensesRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </span>
                                </button>
                                <p className="text-xs text-muted-foreground mt-1">{expenses?.length || 0} recorded expenses</p>
                            </CardContent>
                        </Card>

                        {/* Net Profit */}
                        <Card className="border-l-4 border-l-primary">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                                <Wallet className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <button
                                    onClick={() => setProfitRevealed(v => !v)}
                                    className="flex items-center gap-2 group focus:outline-none"
                                    title={profitRevealed ? "Click to hide" : "Click to reveal"}
                                >
                                    <span className={`text-2xl font-bold transition-all duration-300 select-none ${(summary?.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"} ${profitRevealed ? "" : "blur-[6px]"}`}>
                                        {loadingSummary ? "──────" : formatCurrency(summary?.netProfit || 0)}
                                    </span>
                                    <span className="opacity-0 group-hover:opacity-50 transition-opacity text-muted-foreground">
                                        {profitRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </span>
                                </button>
                                <p className="text-xs text-muted-foreground mt-1">Revenue − Expenses</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Privacy hint */}
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 -mt-3">
                        <Eye className="w-3 h-3" />
                        Amounts are hidden for privacy — click any figure to reveal.
                    </p>


                    {/* Quick Action Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                        <button 
                            onClick={() => { setActiveTab("invoices"); setSearchQuery(""); }}
                            className={`group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md ${activeTab === "invoices" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                            <div className="p-3 rounded-full bg-green-50 text-green-600 group-hover:scale-110 transition-transform">
                                <History className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">Transactions</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab("reports")}
                            className={`group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md ${activeTab === "reports" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                            <div className="p-3 rounded-full bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                                <PieChart className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">Reports</span>
                        </button>
                        <button 
                            onClick={() => { setActiveTab("expenses"); setSearchQuery(""); }}
                            className={`group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md ${activeTab === "expenses" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                            <div className="p-3 rounded-full bg-orange-50 text-orange-500 group-hover:scale-110 transition-transform">
                                <FolderTree className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">Account Group</span>
                        </button>
                        <button 
                            onClick={() => { setActiveTab("expense_management"); setSearchQuery(""); }}
                            className={`group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md border-orange-200 bg-orange-50/30 ${activeTab === "expense_management" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                            <div className="p-3 rounded-full bg-orange-500 text-white group-hover:scale-110 transition-transform shadow-sm">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight text-orange-700">Expense</span>
                        </button>
                        <button 
                            onClick={() => { setActiveTab("ledger"); setSearchQuery(""); }}
                            className={`group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md ${activeTab === "ledger" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                            <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                                <BookText className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">Ledger</span>
                        </button>
                        <button 
                            onClick={() => setLocation("/op-ledger")}
                            className={`group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md opacity-80 hover:opacity-100`}
                        >
                            <div className="p-3 rounded-full bg-orange-50 text-orange-600 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">O/P Ledger</span>
                        </button>
                        <button className="group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
                            <div className="p-3 rounded-full bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">Customers</span>
                        </button>
                        <button className="group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
                            <div className="p-3 rounded-full bg-yellow-50 text-yellow-600 group-hover:scale-110 transition-transform">
                                <Truck className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">Suppliers</span>
                        </button>
                        <button className="group flex flex-col items-center justify-center p-4 gap-2 transition-all rounded-xl border bg-card shadow-sm hover:shadow-md opacity-80 hover:opacity-100 grayscale hover:grayscale-0">
                            <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                                <Coins className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight text-center leading-tight">Currency Details</span>
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-between mb-6 border-b pb-4">
                    <Button variant="ghost" onClick={() => setActiveTab(null)} className="gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Back to Accounts
                    </Button>
                    {activeTab === "expenses" && hasPermission("accounts.manage") && (
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Expense
                        </Button>
                    )}
                </div>
            )}


            {/* Search Bar */}
            {(activeTab === "invoices" || activeTab === "expenses" || activeTab === "ledger") && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={activeTab === "invoices" ? "Search invoices..." : activeTab === "ledger" ? "Search descriptions, parties..." : "Search expenses..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            )}

            {/* ═══════ INVOICES TAB ═══════ */}
            {activeTab === "invoices" && (
                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="px-5 py-3.5 border-b flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-emerald-600" />
                            Paid Invoices
                        </h2>
                        <div className="flex items-center gap-3 relative">
                            <Badge variant="secondary">{filteredPaidInvoices.length} invoices</Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowGridSettings(!showGridSettings)}
                                className="h-8 gap-1.5"
                                title="Grid Settings"
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                Grid Settings
                            </Button>
                            {showGridSettings && (
                                <GridSettingsPanel
                                    settings={gridSettings}
                                    onSettingsChange={updateGridSettings}
                                    onClose={() => setShowGridSettings(false)}
                                />
                            )}
                        </div>
                    </div>
                    {loadingInvoices ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredPaidInvoices.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                            <Receipt className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No paid invoices found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "calc(100vh - 350px)", minHeight: 200 }}>
                            <table
                                style={{ tableLayout: "fixed", width: ALL_COLUMNS.filter(c => !gridSettings.hiddenCols.includes(c.key)).reduce((sum, c) => sum + gridSettings.columnWidths[c.key], 0) }}
                                className="w-full text-sm"
                            >
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b bg-muted/40">
                                        {ALL_COLUMNS.filter(c => !gridSettings.hiddenCols.includes(c.key)).map(col => {
                                            const isSorted = gridSettings.sortCol === col.key;
                                            const sortDir = isSorted ? gridSettings.sortDir : null;
                                            return (
                                                <th
                                                    key={col.key}
                                                    style={{ width: gridSettings.columnWidths[col.key], minWidth: col.minWidth, position: "relative", userSelect: "none" }}
                                                    className={`px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground tracking-wide bg-muted/40 ${col.sortable ? "cursor-pointer hover:text-foreground hover:bg-muted/60 transition-colors" : ""} ${isSorted ? "text-primary bg-primary/5" : ""}`}
                                                    onClick={() => col.sortable && handleSort(col.key)}
                                                >
                                                    <div className="flex items-center gap-1 pr-2">
                                                        <span className="truncate">{col.label.toUpperCase()}</span>
                                                        {col.sortable && (
                                                            <span className="flex-shrink-0 ml-auto">
                                                                {sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : sortDir === "desc" ? <ArrowDown className="w-3 h-3 text-primary" /> : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                                            </span>
                                                        )}
                                                    </div>
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
                                    {filteredPaidInvoices.map((inv) => {
                                        const isHidden = (k: ColKey) => gridSettings.hiddenCols.includes(k);
                                        return (
                                            <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                {!isHidden("invoiceNumber") && (
                                                    <td style={{ width: gridSettings.columnWidths["invoiceNumber"] }} className="px-3 py-2.5">
                                                        <span 
                                                            className="font-mono text-xs text-primary font-bold truncate block cursor-pointer hover:underline"
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
                                                        <span className="truncate block text-sm">{inv.date}</span>
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
                                                {!isHidden("createdAt") && (
                                                    <td style={{ width: gridSettings.columnWidths["createdAt"] }} className="px-3 py-2.5">
                                                        <span className="text-xs text-muted-foreground truncate block">
                                                            {inv.createdAt ? new Date(inv.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }) : "–"}
                                                        </span>
                                                    </td>
                                                )}
                                                {!isHidden("patient") && (
                                                    <td style={{ width: gridSettings.columnWidths["patient"] }} className="px-3 py-2.5">
                                                        <span className="truncate block text-sm font-medium">{getPetName(inv)}</span>
                                                    </td>
                                                )}
                                                {!isHidden("owner") && (
                                                    <td style={{ width: gridSettings.columnWidths["owner"] }} className="px-3 py-2.5">
                                                        <span className="truncate block text-sm">{getOwnerName(inv)}</span>
                                                    </td>
                                                )}
                                                {!isHidden("payment") && (
                                                    <td style={{ width: gridSettings.columnWidths["payment"] }} className="px-3 py-2.5">
                                                        {paymentMethodBadge(inv.paymentMethod)}
                                                    </td>
                                                )}
                                                {!isHidden("billedBy") && (
                                                    <td style={{ width: gridSettings.columnWidths["billedBy"] }} className="px-3 py-2.5">
                                                        <span className="truncate block text-sm text-muted-foreground">{inv.billedByName || inv.createdByName || "System"}</span>
                                                    </td>
                                                )}
                                                {!isHidden("amount") && (
                                                    <td style={{ width: gridSettings.columnWidths["amount"] }} className="px-3 py-2.5">
                                                        <span className="block text-right font-semibold text-emerald-700 truncate">{formatCurrency(inv.total)}</span>
                                                    </td>
                                                )}
                                                {!isHidden("actions") && (
                                                    <td style={{ width: gridSettings.columnWidths["actions"] }} className="px-3 py-2.5">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewInvoice(inv)} title="View / Edit Invoice">
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrint(inv)} title="Print Invoice">
                                                                <Printer className="w-3.5 h-3.5" />
                                                            </Button>
                                                            {isSuperAdmin && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => setDeletingInvoice(inv)}
                                                                    title="Delete Paid Invoice (Super Admin)"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {/* Total row */}
                    {filteredPaidInvoices.length > 0 && (
                        <div className="px-5 py-3 border-t flex justify-between items-center text-sm bg-emerald-50/50">
                            <span className="font-medium text-muted-foreground">
                                Total ({filteredPaidInvoices.length} invoices)
                            </span>
                            <span className="font-bold text-emerald-700 text-base">
                                {formatCurrency(filteredPaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || "0"), 0))}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ EXPENSES TAB ═══════ */}
            {activeTab === "expenses" && (
                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="px-5 py-3.5 border-b flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                            Recorded Expenses
                        </h2>
                        <Badge variant="secondary">{filteredExpenses.length} expenses</Badge>
                    </div>
                    {loadingExpenses ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                            <TrendingDown className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No expenses recorded yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="font-semibold text-xs">Date</TableHead>
                                        <TableHead className="font-semibold text-xs">Category</TableHead>
                                        <TableHead className="font-semibold text-xs">Description</TableHead>
                                        <TableHead className="font-semibold text-xs">Payment</TableHead>
                                        <TableHead className="text-right font-semibold text-xs">Amount</TableHead>
                                        {hasPermission("accounts.manage") && (
                                            <TableHead className="w-[60px]" />
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExpenses.map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-mono text-xs">
                                                {new Date(expense.date).toLocaleDateString("en-IN")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {expense.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{expense.description}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground capitalize">
                                                {expense.paymentMethod}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-rose-700">
                                                {formatCurrency(Number(expense.amount))}
                                            </TableCell>
                                            {hasPermission("accounts.manage") && (
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to delete this expense?")) {
                                                                deleteMutation.mutate(expense.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    {/* Total row */}
                    {filteredExpenses.length > 0 && (
                        <div className="px-5 py-3 border-t flex justify-between items-center text-sm bg-rose-50/50">
                            <span className="font-medium text-muted-foreground">
                                Total ({filteredExpenses.length} expenses)
                            </span>
                            <span className="font-bold text-rose-700 text-base">
                                {formatCurrency(filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ REPORTS TAB ═══════ */}
            {activeTab === "reports" && (
                <div className="space-y-6">
                    {/* Revenue by Month chart */}
                    <div className="rounded-xl border bg-card shadow-sm p-5">
                        <h2 className="font-semibold flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-violet-600" />
                            Monthly Revenue (Last 6 Months)
                        </h2>
                        {monthlyRevenue.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                                <BarChart3 className="w-10 h-10 opacity-30" />
                                <p className="text-sm">No revenue data available yet.</p>
                            </div>
                        ) : (
                            <div className="flex items-end gap-3 h-48">
                                {monthlyRevenue.map(({ month, total }) => {
                                    const pct = (total / maxRevenue) * 100;
                                    return (
                                        <div key={month} className="flex flex-col items-center gap-1.5 flex-1">
                                            <span className="text-xs font-semibold text-violet-700">
                                                {formatCurrency(total)}
                                            </span>
                                            <div
                                                className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-violet-400 min-h-[4px] transition-all duration-500"
                                                style={{ height: `${Math.max(pct, 3)}%` }}
                                            />
                                            <span className="text-xs text-muted-foreground text-center leading-tight">{month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Expense breakdown by category */}
                    <div className="rounded-xl border bg-card shadow-sm p-5">
                        <h2 className="font-semibold flex items-center gap-2 mb-4">
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                            Expenses by Category
                        </h2>
                        {expenseByCategory.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                                <TrendingDown className="w-10 h-10 opacity-30" />
                                <p className="text-sm">No expense data available yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {expenseByCategory.map(({ cat, total }) => {
                                    const pct = (total / (summary?.expenses || 1)) * 100;
                                    return (
                                        <div key={cat} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{cat}</span>
                                                <span className="text-muted-foreground">
                                                    {formatCurrency(total)} <span className="text-xs">({pct.toFixed(1)}%)</span>
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Financial Summary Table */}
                    <div className="rounded-xl border bg-card shadow-sm p-5">
                        <h2 className="font-semibold flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 text-primary" />
                            Financial Summary
                        </h2>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="font-semibold text-xs">Metric</TableHead>
                                    <TableHead className="text-right font-semibold text-xs">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="text-sm">Total Invoices</TableCell>
                                    <TableCell className="text-right font-semibold">{invoicesData?.length || 0}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-sm">Paid Invoices</TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-700">{paidInvoices.length}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-sm">Pending Invoices</TableCell>
                                    <TableCell className="text-right font-semibold text-amber-600">
                                        {invoicesData?.filter(i => i.status === "pending").length || 0}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-sm font-semibold">Total Revenue (Paid)</TableCell>
                                    <TableCell className="text-right font-bold text-emerald-700">
                                        {formatCurrency(summary?.income || 0)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-sm font-semibold">Total Expenses</TableCell>
                                    <TableCell className="text-right font-bold text-rose-700">
                                        {formatCurrency(summary?.expenses || 0)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/30">
                                    <TableCell className="text-sm font-bold">Net Profit</TableCell>
                                    <TableCell className={`text-right font-bold text-lg ${(summary?.netProfit || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                        {formatCurrency(summary?.netProfit || 0)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* ═══════ LEDGER TAB ═══════ */}
            {activeTab === "ledger" && (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <BookText className="w-5 h-5 text-indigo-600" />
                            General Ledger
                            <Badge variant="outline" className="ml-2 font-normal text-xs">{filteredLedger.length} Entries</Badge>
                        </h2>
                    </div>

                    {loadingLedger ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredLedger.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <BookText className="w-12 h-12 opacity-20 mx-auto mb-3" />
                            <p>No ledger entries found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/40 sticky top-0">
                                    <TableRow>
                                        <TableHead className="w-[110px]">Date</TableHead>
                                        <TableHead className="w-[100px]">Voucher #</TableHead>
                                        <TableHead className="w-[180px]">Party</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-[140px] text-right text-emerald-700">Money IN (₹)</TableHead>
                                        <TableHead className="w-[140px] text-right text-rose-700">Money OUT (₹)</TableHead>
                                        <TableHead className="w-[140px] text-right">Balance (₹)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLedger.map((entry) => (
                                        <TableRow key={entry.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium">
                                                {entry.date ? format(new Date(entry.date), "dd MMM, yyyy") : "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[10px] bg-white">
                                                    {entry.voucherNumber}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-muted-foreground">
                                                {entry.party || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span 
                                                        className={cn(
                                                            "text-sm font-medium",
                                                            entry.type === "sale" && "text-primary hover:underline cursor-pointer"
                                                        )}
                                                        onClick={() => {
                                                            if (entry.type === "sale" && entry.referenceId) {
                                                                openNewInvoiceTerminal(entry.referenceId);
                                                            }
                                                        }}
                                                    >
                                                        {entry.description}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        {entry.type === "sale" && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] h-4 leading-[10px] uppercase">Sale</Badge>}
                                                        {entry.type === "purchase" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] h-4 leading-[10px] uppercase">Purchase</Badge>}
                                                        {entry.type === "expense" && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] h-4 leading-[10px] uppercase">Expense</Badge>}
                                                        
                                                        <span 
                                                            className={cn(
                                                                "text-[10px] text-muted-foreground",
                                                                entry.type === "sale" && "hover:text-primary hover:underline cursor-pointer"
                                                            )}
                                                            onClick={(e) => {
                                                                if (entry.type === "sale" && entry.referenceId) {
                                                                    e.stopPropagation();
                                                                    openNewInvoiceTerminal(entry.referenceId);
                                                                }
                                                            }}
                                                        >
                                                            Ref: {entry.referenceNumber || "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-600 font-medium">
                                                {parseFloat(String(entry.debitAmount)) > 0 ? formatCurrency(entry.debitAmount) : "–"}
                                            </TableCell>
                                            <TableCell className="text-right text-rose-600 font-medium">
                                                {parseFloat(String(entry.creditAmount)) > 0 ? formatCurrency(entry.creditAmount) : "–"}
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${entry.runningBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {formatCurrency(entry.runningBalance)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ EXPENSE MANAGEMENT TAB ═══════ */}
            {activeTab === "expense_management" && (
                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="px-5 py-3.5 border-b flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <FolderTree className="w-4 h-4 text-orange-600" />
                            Expenses
                        </h2>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary">{expenses?.length || 0} expenses</Badge>
                            <Button onClick={openNewExpenseTerminal} className="gap-2">
                                <Plus className="w-4 h-4" /> Add Expense Entry
                            </Button>
                        </div>
                    </div>
                    {loadingExpenses ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !expenses || expenses.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                            <FolderTree className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No expenses found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "calc(100vh - 350px)", minHeight: 200 }}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Payment Mode</TableHead>
                                        <TableHead className="text-right">Base Amount</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses
                                        .filter(e => e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || e.category?.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {expense.date ? format(new Date(expense.date), "dd MMM, yyyy") : "-"}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={expense.description}>
                                                {expense.description}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-normal">
                                                    {expense.category}
                                                </Badge>
                                                {expense.subCategory && (
                                                    <span className="text-xs text-muted-foreground block mt-0.5">{expense.subCategory}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="capitalize">{expense.paymentMethod}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                ₹{parseFloat(String(expense.amount || 0)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-foreground">
                                                ₹{parseFloat(String(expense.totalAmount || expense.amount || 0)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {/* Add Expense Dialog */}
            <ExpenseDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

            {/* View Invoice Dialog (reused from billing page) */}
            {viewInvoice && owners && allPets && (
                <ViewInvoiceDialog
                    invoice={viewInvoice}
                    owners={owners}
                    allPets={allPets}
                    open={viewInvoice !== null}
                    onOpenChange={(v: boolean) => { if (!v) setViewInvoice(null); }}
                    onMarkPaid={() => { }} // paid invoices don't need mark-paid
                    onDeleteRequest={isSuperAdmin ? (inv) => {
                        setViewInvoice(null);
                        setDeletingInvoice(inv);
                    } : undefined}
                />
            )}

            {/* Delete Paid Invoice Dialog — Super Admin only */}
            <DeleteInvoiceDialog
                invoice={deletingInvoice}
                open={!!deletingInvoice}
                onOpenChange={(v) => { if (!v) setDeletingInvoice(null); }}
                onConfirm={() => deletingInvoice && deleteInvoiceMutation.mutate(deletingInvoice.id)}
                isDeleting={deleteInvoiceMutation.isPending}
            />
        </div>
    );
}

function ExpenseDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const form = useForm<InsertExpense>({
        resolver: zodResolver(insertExpenseSchema),
        defaultValues: {
            date: format(new Date(), "yyyy-MM-dd"),
            description: "",
            amount: "0",
            category: "",
            paymentMethod: "",
            notes: "",
            recordedBy: user?.id,
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: InsertExpense) => {
            await apiRequest("POST", "/api/expenses", { ...values, recordedBy: user?.id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
            toast({ title: "Expense added", description: "New expense has been recorded." });
            onOpenChange(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Supplies">Supplies</SelectItem>
                                            <SelectItem value="Utilities">Utilities</SelectItem>
                                            <SelectItem value="Salary">Salary</SelectItem>
                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                            <SelectItem value="Marketing">Marketing</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Expense description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Card">Card</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Additional notes..." {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Expense
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

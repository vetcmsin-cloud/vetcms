import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { type ActivityLog, type User } from "@shared/schema";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, ChevronLeft, ChevronRight, Filter, X, Monitor, Smartphone } from "lucide-react";

// Simple User-Agent parser
function parseUserAgent(ua: string | null | undefined): { browser: string; os: string; isMobile: boolean } | null {
    if (!ua) return null;
    let browser = "Unknown";
    let os = "Unknown";
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

    // Browser detection
    if (ua.includes("Edg/")) {
        const m = ua.match(/Edg\/(\d+)/);
        browser = `Edge ${m?.[1] || ""}`;
    } else if (ua.includes("OPR/") || ua.includes("Opera")) {
        const m = ua.match(/OPR\/(\d+)/);
        browser = `Opera ${m?.[1] || ""}`;
    } else if (ua.includes("Chrome/") && !ua.includes("Edg")) {
        const m = ua.match(/Chrome\/(\d+)/);
        browser = `Chrome ${m?.[1] || ""}`;
    } else if (ua.includes("Firefox/")) {
        const m = ua.match(/Firefox\/(\d+)/);
        browser = `Firefox ${m?.[1] || ""}`;
    } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
        const m = ua.match(/Version\/(\d+)/);
        browser = `Safari ${m?.[1] || ""}`;
    }

    // OS detection
    if (ua.includes("Windows NT 10")) os = "Windows 10/11";
    else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
    else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
    else if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS X")) {
        const m = ua.match(/Mac OS X ([\d_]+)/);
        os = `macOS ${m?.[1]?.replace(/_/g, ".") || ""}`;
    } else if (ua.includes("Android")) {
        const m = ua.match(/Android ([\d.]+)/);
        os = `Android ${m?.[1] || ""}`;
    } else if (ua.includes("iPhone OS") || ua.includes("iPad")) {
        const m = ua.match(/OS ([\d_]+)/);
        os = `iOS ${m?.[1]?.replace(/_/g, ".") || ""}`;
    } else if (ua.includes("Linux")) os = "Linux";

    return { browser: browser.trim(), os: os.trim(), isMobile };
}

const ENTITY_TYPES = [
    "Auth",
    "User",
    "Role",
    "Fee Structure",
    "Invoice",
    "Clinic Settings",
    "Medical Records",
    "Appointments",
    "Pets",
    "Owners",
    "All Data",
    "Invoices",
    "Inventory",
    "Supplier",
    "Purchase Order",
    "Expense",
    "Lab Report",
    "Owner",
    "Pet",
    "Appointment",
    "Medical Record",
];

const ACTION_COLORS: Record<string, string> = {
    LOGIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    LOGOUT: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
    CREATE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    UPDATE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    ERASE: "bg-red-200 text-red-900 dark:bg-red-950/60 dark:text-red-200",
    MARK_PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    RECEIVE: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const PAGE_SIZE = 25;

export default function ActivityLogPage() {
    const { hasPermission } = useAuth();
    const [page, setPage] = useState(0);
    const [userFilter, setUserFilter] = useState<string>("");
    const [entityFilter, setEntityFilter] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const buildQuery = () => {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(page * PAGE_SIZE));
        if (userFilter) params.set("userId", userFilter);
        if (entityFilter) params.set("entityType", entityFilter);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        return `/api/activity-logs?${params.toString()}`;
    };

    const { data, isLoading } = useQuery<{
        logs: ActivityLog[];
        total: number;
        limit: number;
        offset: number;
    }>({
        queryKey: ["/api/activity-logs", page, userFilter, entityFilter, startDate, endDate],
        queryFn: async () => {
            const res = await fetch(buildQuery(), { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch activity logs");
            return res.json();
        },
    });

    const { data: users } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    if (!hasPermission("activity_log.view", "admin_dashboard.view")) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                You do not have permission to view activity logs.
            </div>
        );
    }

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

    const clearFilters = () => {
        setUserFilter("");
        setEntityFilter("");
        setStartDate("");
        setEndDate("");
        setPage(0);
    };

    const hasFilters = userFilter || entityFilter || startDate || endDate;

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Activity className="w-7 h-7 text-primary" />
                        Activity Log
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track every action performed across the system.
                    </p>
                </div>
                {data && (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                        {data.total.toLocaleString()} total entries
                    </Badge>
                )}
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filters
                        {hasFilters && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-2" onClick={clearFilters}>
                                <X className="w-3 h-3 mr-1" />
                                Clear
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">User</label>
                            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v === "all" ? "" : v); setPage(0); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {users?.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Entity Type</label>
                            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v === "all" ? "" : v); setPage(0); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    {[...new Set(ENTITY_TYPES)].sort().map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Log Table */}
            <div className="rounded-md border bg-card">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-border" />
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Date & Time</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead className="w-[120px]">Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Device</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No activity logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data?.logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    timeZone: "Asia/Kolkata"
                                                })}{" "}
                                                <span className="text-muted-foreground">
                                                    {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                        hour12: true,
                                                        timeZone: "Asia/Kolkata"
                                                    })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium text-sm">{log.userName}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"}`}>
                                                    {log.action}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{log.entityType}</span>
                                                {log.entityId && (
                                                    <span className="text-xs text-muted-foreground ml-1">#{log.entityId}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <span className="text-sm text-muted-foreground truncate block">
                                                    {log.details || "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const parsed = parseUserAgent(log.userAgent);
                                                    if (!parsed) return <span className="text-xs text-muted-foreground">—</span>;
                                                    return (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            {parsed.isMobile ? (
                                                                <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                                                            ) : (
                                                                <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                                                            )}
                                                            <span className="whitespace-nowrap">
                                                                {parsed.browser} · {parsed.os}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <span className="text-sm text-muted-foreground">
                                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data?.total || 0)} of {data?.total || 0}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 0}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm font-medium">
                                        Page {page + 1} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= totalPages - 1}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

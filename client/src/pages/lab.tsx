import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LabReportRenderer } from "@/components/document-designer/LabReportRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Plus,
    Search,
    FileText,
    Activity,
    ClipboardList,
    Printer,
    TrendingUp,
    FlaskConical,
    CheckCircle,
    Clock,
    AlertCircle,
    Check,
    ChevronsUpDown,
    Camera,
    Loader2,
    Wifi
} from "lucide-react";
import {
    type LabReport,
    type Pet,
    type Owner,
    LAB_REPORT_CATEGORIES
} from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Tesseract from "tesseract.js";

function CreateLabOrderDialog({ pets, owners }: { pets: Pet[], owners: Owner[] }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [ownerOpen, setOwnerOpen] = useState(false);
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");

    const [form, setForm] = useState({
        petId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        category: "Hematology",
        title: "",
        notes: "",
    });

    // Filter pets based on selected owner
    const filteredPets = selectedOwnerId
        ? pets.filter(p => p.ownerId === parseInt(selectedOwnerId))
        : [];

    // Automatically select pet if only one exists for the owner
    useEffect(() => {
        if (selectedOwnerId && filteredPets.length === 1) {
            setForm(prev => ({ ...prev, petId: String(filteredPets[0].id) }));
        } else if (selectedOwnerId && filteredPets.length === 0) {
            setForm(prev => ({ ...prev, petId: "" })); // Reset if no pets
        }
    }, [selectedOwnerId, filteredPets.length]);

    const { data: categories } = useQuery<any[]>({
        queryKey: ["/api/lab-settings/categories"],
    });

    const availableCategories = categories && categories.length > 0
        ? categories.map((c: any) => c.name)
        : LAB_REPORT_CATEGORIES;

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/lab-reports", {
                ...form,
                petId: parseInt(form.petId),
                status: "pending",
                result: "",
                notes: form.notes || undefined,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/lab-reports"] });
            setOpen(false);
            setForm({
                petId: "",
                date: format(new Date(), "yyyy-MM-dd"),
                category: availableCategories.length > 0 ? availableCategories[0] : LAB_REPORT_CATEGORIES[0],
                title: "",
                notes: "",
            });
            setSelectedOwnerId("");
            toast({ title: "Order Created", description: "New lab order has been created." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const getOwnerDisplay = (ownerId: string) => {
        const owner = owners.find(o => String(o.id) === ownerId);
        if (!owner) return "Select owner";
        return `${owner.firstName} ${owner.lastName} (${owner.phone})`;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex flex-col items-center justify-center p-4 h-full min-h-[140px] cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-lg shadow-md gap-3">
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                        <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-semibold text-lg text-center">Create New Lab Order</span>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Lab Order</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label>Owner</Label>
                        <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={ownerOpen}
                                    className="justify-between w-full"
                                >
                                    {selectedOwnerId ? getOwnerDisplay(selectedOwnerId) : "Select owner..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search by owner, phone, or patient name..." />
                                    <CommandList>
                                        <CommandEmpty>No owner found.</CommandEmpty>
                                        <CommandGroup>
                                            {owners.map((owner) => {
                                                const ownerPets = pets.filter(p => p.ownerId === owner.id);
                                                const petNames = ownerPets.map(p => p.name).join(" ");
                                                return (
                                                    <CommandItem
                                                        key={owner.id}
                                                        value={`${owner.firstName} ${owner.lastName} ${owner.phone} ${petNames}`}
                                                        onSelect={() => {
                                                            setSelectedOwnerId(String(owner.id));
                                                            setOwnerOpen(false);
                                                            // Reset pet selection when owner changes, unless auto-selected by effect
                                                            if (String(owner.id) !== selectedOwnerId) {
                                                                setForm(prev => ({ ...prev, petId: "" }));
                                                            }
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4 shrink-0",
                                                                selectedOwnerId === String(owner.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <span className="font-medium truncate">{owner.firstName} {owner.lastName} ({owner.phone})</span>
                                                            {ownerPets.length > 0 && (
                                                                <span className="text-[10px] text-muted-foreground truncate">
                                                                    Patients: {ownerPets.map(p => p.name).join(', ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label>Patient</Label>
                            <Select
                                value={form.petId}
                                onValueChange={(v) => setForm({ ...form, petId: v })}
                                disabled={!selectedOwnerId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={selectedOwnerId ? "Select patient" : "Select owner first"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredPets.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            {p.name} ({p.species})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="order-date">Date</Label>
                            <Input
                                id="order-date"
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Category</Label>
                        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.map((c: string) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="test-title">Test Name / Title</Label>
                        <Input
                            id="test-title"
                            placeholder="e.g. Complete Blood Count"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="order-notes">Notes</Label>
                        <Textarea
                            id="order-notes"
                            placeholder="Clinical indications or special instructions..."
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>
                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || !form.petId || !form.title}
                    >
                        {mutation.isPending ? "Creating..." : "Create Order"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StatTile({
    title,
    value,
    icon: Icon,
    colorClass,
    onClick,
    active
}: {
    title: string;
    value?: string | number;
    icon: any;
    colorClass: string;
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${active ? 'ring-2 ring-primary ring-offset-2' : ''} ${colorClass}`}
            onClick={onClick}
        >
            <CardContent className="p-4 flex flex-col items-center text-center justify-center h-full min-h-[140px] gap-3">
                <div className={`p-3 rounded-full bg-background/50 backdrop-blur-sm`}>
                    <Icon className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg">{title}</span>
                    {value !== undefined && <span className="text-3xl font-bold">{value}</span>}
                </div>
            </CardContent>
        </Card>
    );
}

export default function LabDashboard() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const { data: reports, isLoading } = useQuery<LabReport[]>({ queryKey: ["/api/lab-reports"] });
    const { data: pets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });
    const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });

    const pendingCount = reports?.filter(r => r.status === "pending").length || 0;
    const completedCount = reports?.filter(r => r.status === "completed").length || 0;

    const filteredReports = reports
        ?.filter((r) => {
            // Status Filter
            if (statusFilter !== "all" && r.status !== statusFilter) return false;

            // Search Filter
            if (!search) return true;
            const pet = pets?.find((p) => p.id === r.petId);
            const searchLower = search.toLowerCase();
            return (
                pet?.name.toLowerCase().includes(searchLower) ||
                r.title.toLowerCase().includes(searchLower) ||
                r.category.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Printing Logic similar to LabReportsTab
    const { data: settings, isLoading: isLoadingSettings } = useQuery<Record<string, string>>({
        queryKey: ["/api/clinic-settings"],
    });

    const [printReportId, setPrintReportId] = useState<number | null>(null);

    const reportToPrint = useMemo(() => {
        return reports?.find(r => r.id === printReportId);
    }, [reports, printReportId]);

    const petToPrint = useMemo(() => {
        if (!reportToPrint || !pets) return undefined;
        return pets.find(p => p.id === reportToPrint.petId);
    }, [reportToPrint, pets]);

    const ownerToPrint = useMemo(() => {
        if (!petToPrint || !owners) return undefined;
        return owners.find(o => o.id === petToPrint.ownerId);
    }, [petToPrint, owners]);

    const labReportLayout = useMemo(() => {
        if (!reportToPrint || !settings) return undefined;

        // Dynamic layout keys for all types except pure Hematology
        const key = reportToPrint.category === "Hematology" ? "labReportLayout" : `labReportLayout_${reportToPrint.category}`;

        if (settings[key]) {
            try {
                return JSON.parse(settings[key]);
            } catch (e) {
                console.error(`Failed to parse lab report layout for ${reportToPrint.category}`, e);
            }
        }

        // Backward compatibility: Fallback to Hematology layout for specific categories if no explicit layout exists
        if (reportToPrint.category === "Hematology & Blood Chemistry" && settings.labReportLayout) {
            try {
                return JSON.parse(settings.labReportLayout);
            } catch (e) {
                console.error(`Failed to parse fallback lab report layout for ${reportToPrint.category}`, e);
            }
        }

        return undefined;
    }, [reportToPrint, settings]);

    useEffect(() => {
        if (printReportId && reportToPrint && petToPrint && ownerToPrint && !isLoadingSettings) {
            const timer = setTimeout(() => {
                window.print();
                setPrintReportId(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [printReportId, reportToPrint, petToPrint, ownerToPrint, isLoadingSettings]);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto min-h-screen bg-muted/20">
            <div className="flex flex-col gap-2 mb-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <FlaskConical className="w-8 h-8 text-primary" />
                    Lab Dashboard
                </h1>
                <p className="text-muted-foreground">Manage laboratory orders, results, and reports.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Search Patient */}
                <StatTile
                    title="Search Patient"
                    icon={Search}
                    colorClass="border-l-blue-500 bg-blue-50/50 text-blue-700"
                    onClick={() => {
                        setIsSearchOpen(!isSearchOpen);
                        setTimeout(() => document.getElementById("search-input")?.focus(), 100);
                    }}
                    active={isSearchOpen}
                />

                {/* Create New Lab Order - Using Dialog */}
                <div className="col-span-1 h-full">
                    <CreateLabOrderDialog pets={pets || []} owners={owners || []} />
                </div>

                {/* Pending Tests */}
                <StatTile
                    title="Pending Tests"
                    value={pendingCount}
                    icon={Clock}
                    colorClass="border-l-amber-500 bg-amber-50/50 text-amber-700"
                    onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
                    active={statusFilter === "pending"}
                />

                {/* Completed Tests */}
                <StatTile
                    title="Completed Tests"
                    value={completedCount}
                    icon={CheckCircle}
                    colorClass="border-l-emerald-500 bg-emerald-50/50 text-emerald-700"
                    onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
                    active={statusFilter === "completed"}
                />

                {/* Print Reports */}
                <StatTile
                    title="Print Reports"
                    icon={Printer}
                    colorClass="border-l-purple-500 bg-purple-50/50 text-purple-700"
                    onClick={() => {
                        setStatusFilter("completed");
                    }}
                />

                {/* Trend Analysis */}
                <StatTile
                    title="Trend Analysis"
                    icon={TrendingUp}
                    colorClass="border-l-rose-500 bg-rose-50/50 text-rose-700"
                    onClick={() => { }}
                />
            </div>

            <style>
                {`
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        
                        /* Show the lab report print container */
                        #printable-lab-report-container {
                            visibility: visible;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 794px !important;
                            height: 1123px !important;
                            margin: 0;
                            padding: 0;
                            background: white;
                            z-index: 9999;
                        }
                        
                        #printable-lab-report-container * {
                            visibility: visible;
                        }
                    }
                `}
            </style>

            {/* Hidden Print Container */}
            {printReportId && reportToPrint && petToPrint && ownerToPrint && (
                createPortal(
                    <div id="printable-lab-report-container" className="hidden print:block">
                        <LabReportRenderer
                            settings={settings || {}}
                            report={reportToPrint}
                            pet={petToPrint}
                            owner={ownerToPrint}
                            layout={labReportLayout}
                        />
                    </div>,
                    document.body
                )
            )}

            <LabReportsList
                reports={filteredReports || []}
                isLoading={isLoading}
                pets={pets || []}
                statusFilter={statusFilter}
                search={search}
                setSearch={setSearch}
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                onPrint={(id) => setPrintReportId(id)}
            />
        </div>
    );
}

function LabReportsList({
    reports,
    isLoading,
    pets,
    statusFilter,
    search,
    setSearch,
    isSearchOpen,
    setIsSearchOpen,
    onPrint
}: {
    reports: LabReport[],
    isLoading: boolean,
    pets: Pet[],
    statusFilter: string,
    search?: string,
    setSearch?: (v: string) => void,
    isSearchOpen?: boolean,
    setIsSearchOpen?: (v: boolean) => void,
    onPrint?: (id: number) => void
}) {
    const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
    const { toast } = useToast();

    if (isLoading) {
        return (
            <div className="grid gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="space-y-4">
                {isSearchOpen && setSearch && (
                    <Card className="animate-in fade-in slide-in-from-top-2 border-blue-200 bg-blue-50 mb-4">
                        <CardContent className="p-4 flex items-center gap-4">
                            <Search className="w-5 h-5 text-blue-500" />
                            <Input
                                id="search-input"
                                placeholder="Search by patient name, test title or category..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-white"
                                autoFocus
                            />
                            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen && setIsSearchOpen(false)}>
                                <span className="sr-only">Close</span>
                                <AlertCircle className="w-4 h-4" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="text-center py-12 text-muted-foreground bg-white rounded-lg border border-dashed">
                    <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <h3 className="text-lg font-medium">No lab reports found</h3>
                    <p>Try adjusting your filters or create a new order.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {isSearchOpen && setSearch && (
                <Card className="animate-in fade-in slide-in-from-top-2 border-blue-200 bg-blue-50 mb-4">
                    <CardContent className="p-4 flex items-center gap-4">
                        <Search className="w-5 h-5 text-blue-500" />
                        <Input
                            id="search-input"
                            placeholder="Search by patient name, test title or category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white"
                            autoFocus
                        />
                        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen && setIsSearchOpen(false)}>
                            <span className="sr-only">Close</span>
                            <AlertCircle className="w-4 h-4" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        {statusFilter === 'all' ? 'All' : statusFilter === 'pending' ? 'Pending' : 'Completed'} Lab Orders
                        <Badge variant="secondary">{reports.length}</Badge>
                    </h2>
                </div>

                <div className="grid gap-4">
                    {reports.map((report) => {
                        const pet = pets.find(p => p.id === report.petId);
                        const isPending = report.status === "pending";

                        return (
                            <Card key={report.id} className={`overflow-hidden transition-all hover:shadow-md ${isPending ? 'border-amber-200' : 'border-emerald-200'}`}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center">
                                    <div className={`w-2 self-stretch min-h-[100px] sm:min-h-0 ${isPending ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                    <div className="flex-1 p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between w-full">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-12 h-12 border-2 border-background">
                                                <AvatarImage src={pet?.imageUrl || ""} />
                                                <AvatarFallback>{pet?.name?.[0] || "?"}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-lg">{report.title}</h3>
                                                    <Badge variant={isPending ? "outline" : "default"} className={isPending ? "text-amber-600 border-amber-200 bg-amber-50" : "bg-emerald-600 hover:bg-emerald-700"}>
                                                        {report.status?.toUpperCase() || "PENDING"}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                                                    <span className="font-medium text-foreground">{pet?.name}</span>
                                                    <span>•</span>
                                                    <span>{report.category}</span>
                                                    <span>•</span>
                                                    <span>{format(new Date(report.date), "MMM d, yyyy")} {report.createdAt && `at ${new Date(report.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}`}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                            {isPending ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2 border-amber-200 hover:bg-amber-50 hover:text-amber-700 w-full sm:w-auto"
                                                    onClick={() => setSelectedReport(report)}
                                                >
                                                    <Clock className="w-4 h-4" />
                                                    Enter Results
                                                </Button>
                                            ) : (
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <Button size="sm" variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => onPrint ? onPrint(report.id) : window.open(`/api/lab-reports/${report.id}/print`, '_blank')}>
                                                        <Printer className="w-4 h-4" />
                                                        Print
                                                    </Button>
                                                    <Button size="sm" variant="secondary" className="gap-2 flex-1 sm:flex-none" onClick={() => setSelectedReport(report)}>
                                                        <FileText className="w-4 h-4" />
                                                        View / Edit
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {
                selectedReport && (
                    <EnterResultsDialog
                        report={selectedReport}
                        open={!!selectedReport}
                        onOpenChange={(open) => !open && setSelectedReport(null)}
                        onPrint={onPrint}
                    />
                )
            }
        </>
    );
}

function EnterResultsDialog({ report, open, onOpenChange, onPrint }: { report: LabReport, open: boolean, onOpenChange: (open: boolean) => void, onPrint?: (id: number) => void }) {
    const { toast } = useToast();
    const [results, setResults] = useState<Record<string, any>>((report.details as Record<string, any>) || {});
    const [summary, setSummary] = useState(report.result === "Completed" ? "" : (report.result || ""));
    const [notes, setNotes] = useState(report.notes || "");
    const [isScanning, setIsScanning] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("PATCH", `/api/lab-reports/${report.id}`, {
                status: "completed",
                details: results,
                result: summary || "Completed",
                notes: notes
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/lab-reports"] });
            toast({ title: "Results Saved", description: "The lab report has been updated." });
            onOpenChange(false);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    // ---- Receive CBC from Mindray BC-20s via HL7 (LAN) ----
    const handleReceiveFromMachine = async (specificSample?: any) => {
        setIsReceiving(!specificSample);
        if (!specificSample) {
            toast({ title: "Fetching from machine...", description: "Checking for CBC results from Mindray BC-20s." });
        }

        try {
            let result;

            if (specificSample) {
                result = specificSample;
            } else {
                const res = await fetch("/api/mindray/results", { credentials: "include" });
                if (!res.ok) {
                    const err = await res.json();
                    toast({
                        title: "No Results",
                        description: err.message || "Failed to fetch results.",
                        variant: "destructive",
                    });
                    return;
                }

                const results = await res.json();
                if (!results || results.length === 0) {
                    toast({
                        title: "No Results",
                        description: "No CBC results received from the machine yet. Make sure the machine is connected and has transmitted data.",
                        variant: "destructive",
                    });
                    return;
                }
                result = results[0]; // Get the latest one by default if not specified
            }

            const machineData = result.data as Record<string, string>;

            let findings = 0;
            const fieldMap: Record<string, string> = {
                wbc: "wbc", rbc: "rbc", hb: "hb", pcv: "pcv",
                mcv: "mcv", mch: "mch", mchc: "mchc", platelet: "platelet",
                neutrophils: "neutrophils", lymphocytes: "lymphocytes",
                monocytes: "monocytes", eosinophils: "eosinophils", basophils: "basophils",
            };

            const newResults: Record<string, string> = {};
            for (const [machineKey, formKey] of Object.entries(fieldMap)) {
                if (machineData[machineKey]) {
                    newResults[formKey] = machineData[machineKey];
                    findings++;
                }
            }

            if (findings > 0) {
                setResults(prev => ({ ...prev, ...newResults }));
                toast({
                    title: "\u2705 Machine Data Received",
                    description: `Successfully loaded ${findings} CBC values from Mindray BC-20s${result.sampleId ? ` (Sample: ${result.sampleId})` : ''}.`,
                });
            } else {
                toast({
                    title: "No Matching Data",
                    description: "Received data from machine but could not map any CBC values.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Machine receive error:", error);
            toast({
                title: "Connection Error",
                description: "Failed to fetch data from the machine. Ensure the HL7 listener is running and the machine is connected.",
                variant: "destructive",
            });
        } finally {
            setIsReceiving(false);
        }
    };

    // Request all recent results for the dropdown
    const { data: recentMindrayResults, refetch: fetchRecentMindray } = useQuery<any[]>({
        queryKey: ["/api/mindray/results"],
        enabled: open, // Only fetch when the dialog is open
    });

    // ---- OCR Image Scan (Fallback) ----
    const handleCbcImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        toast({ title: "Scanning image...", description: "Please wait, this might take a few seconds." });

        try {
            // Advanced preprocessing: upscale + grayscale + contrast + threshold
            const imgBitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const scale = 3;
            canvas.width = imgBitmap.width * scale;
            canvas.height = imgBitmap.height * scale;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                const contrast = 1.5;
                const adjusted = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
                const final = adjusted > 140 ? 255 : 0;
                d[i] = d[i + 1] = d[i + 2] = final;
            }
            ctx.putImageData(imgData, 0, 0);

            const processedBlob: Blob = await new Promise(resolve => canvas.toBlob(resolve as any, 'image/png'));
            const processedFile = new File([processedBlob], file.name, { type: 'image/png' });

            // Do NOT use character whitelist — it strips parameter names
            const result = await Tesseract.recognize(processedFile, 'eng', {
                logger: m => console.log(m)
            });

            const text = result.data.text;
            console.log("OCR Result Text:\n", text);

            const mappings = [
                { key: "wbc", regex: /\bWBC\b/i },
                { key: "rbc", regex: /\bRBC\b/i },
                { key: "hb", regex: /\b(?:HGB|HB)\b/i },
                { key: "pcv", regex: /\b(?:HCT|PCV)\b/i },
                { key: "mcv", regex: /\bMCV\b/i },
                { key: "mchc", regex: /\bMCHC\b/i },
                { key: "mch", regex: /\bMCH\b/i },
                { key: "platelet", regex: /\b(?:PLT|Platelet)\b/i },
                { key: "neutrophils", regex: /\b(?:Neu%|Neu#|Neu|Neutrophils)[:]?/i },
                { key: "lymphocytes", regex: /\b(?:Lym%|Lym#|Lym|Lymphocytes)[:]?/i },
                { key: "monocytes", regex: /\b(?:Mon#|Mon\b|Monocytes)/i },
                { key: "eosinophils", regex: /\b(?:Eos%|Eos#|Eos|Eosinophils)[:]?/i },
                { key: "basophils", regex: /\b(?:Bas#|Bas\b|Basophils)/i },
            ];

            let findings = 0;
            const extractedResults: Record<string, string> = {};
            const extractedKeys = new Set();

            const tokens = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().split(' ');

            for (let i = 0; i < tokens.length; i++) {
                let currentToken = tokens[i];

                for (const { key, regex } of mappings) {
                    if (extractedKeys.has(key)) continue;

                    if (key === "mch" && /\bMCHC\b/i.test(currentToken)) continue;

                    if (regex.test(currentToken)) {
                        for (let j = 1; j <= 3 && i + j < tokens.length; j++) {
                            let nextToken = tokens[i + j];

                            if (mappings.some(m => m.regex.test(nextToken))) break;

                            // Skip H/L/N flags and unit strings
                            if (/^[HL*+\-N]$/i.test(nextToken)) continue;
                            if (/^(10|\d+)\^/i.test(nextToken)) continue;
                            if (/^[a-z\/]+$/i.test(nextToken) && !/^[0-9]/.test(nextToken)) continue;

                            if (/^[0-9]+(\.[0-9]+)?$/.test(nextToken)) {
                                extractedResults[key] = nextToken;
                                findings++;
                                extractedKeys.add(key);
                                break;
                            }
                        }
                    }
                }
            }

            if (findings > 0) {
                setResults(prev => ({ ...prev, ...extractedResults }));
                toast({ title: "Scan Complete", description: `Successfully extracted ${findings} values.` });
            } else {
                toast({ title: "Scan Complete", description: "Could not identify any valid values from the image. Try using 'Receive from Machine' for better accuracy.", variant: "destructive" });
            }

        } catch (error) {
            console.error("OCR Error:", error);
            toast({ title: "Error", description: "Failed to read image. Please try again.", variant: "destructive" });
        } finally {
            setIsScanning(false);
            if (e.target) e.target.value = '';
        }
    };

    const isBloodTest = report.category === "Hematology" || report.category === "Hematology & Blood Chemistry" || report.category === "Blood Chemistry" || report.category === "Biochemistry";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between mt-2 pr-6">
                    <DialogTitle>Enter Results: {report.title}</DialogTitle>
                    {isBloodTest && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                id={`lab-camera-upload-${report.id}`}
                                onChange={handleCbcImageUpload}
                            />
                            <DropdownMenu onOpenChange={(dropdownOpen) => {
                                if (dropdownOpen) fetchRecentMindray();
                            }}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        disabled={isReceiving}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isReceiving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
                                        Receive from Machine
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-64" align="end">
                                    <DropdownMenuLabel>Mindray BC-20s Results</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleReceiveFromMachine()}>
                                        Load Latest Result
                                    </DropdownMenuItem>

                                    {(recentMindrayResults?.length || 0) > 0 && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel className="text-xs text-muted-foreground">Recent Test Results</DropdownMenuLabel>
                                            {recentMindrayResults?.slice(0, 10).map((res, i) => (
                                                <DropdownMenuItem
                                                    key={i}
                                                    onSelect={() => handleReceiveFromMachine(res)}
                                                    className="flex justify-between items-center cursor-pointer"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">Sample: {res.sampleId || "Unknown"}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Values: {Object.keys(res.data).length} detected
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground ml-4">
                                                        {new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`lab-camera-upload-${report.id}`)?.click()} disabled={isScanning}>
                                {isScanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                                Scan Results (Photo)
                            </Button>
                        </div>
                    )}
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {(report.category === "Hematology" || report.category === "Hematology & Blood Chemistry") && (
                        <div className="border p-4 rounded-md space-y-4">
                            <h4 className="font-semibold text-sm uppercase mb-3">Hematology (CBC) Details</h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                {["wbc", "rbc", "hb", "pcv", "mcv", "mch", "mchc", "platelet", "neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils"].map(field => (
                                    <div key={field} className="space-y-1">
                                        <Label className="text-xs uppercase">{field}</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={results[field] || ""}
                                            onChange={(e) => setResults(prev => ({ ...prev, [field]: e.target.value }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(report.category === "Blood Chemistry" || report.category === "Hematology & Blood Chemistry") && (
                        <div className="border p-4 rounded-md space-y-4">
                            <h4 className="font-semibold text-sm uppercase mb-3">Blood Chemistry Details</h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                {["glucose", "urea", "creatinine", "alt", "ast", "alp", "totalProtein", "albumin", "globulin", "totalBilirubin", "sodium", "potassium", "chloride", "calcium", "phosphorus"].map(field => (
                                    <div key={field} className="space-y-1">
                                        <Label className="text-xs uppercase">{field}</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={results[field] || ""}
                                            onChange={(e) => setResults(prev => ({ ...prev, [field]: e.target.value }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.category === "Biochemistry" && (
                        <div className="border p-4 rounded-md space-y-4">
                            <h4 className="font-semibold text-sm uppercase mb-3">Biochemistry Details</h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                {[
                                    { key: "bio_glucose", label: "Glucose" },
                                    { key: "bio_urea", label: "Urea (BUN)" },
                                    { key: "bio_creatinine", label: "Creatinine" },
                                    { key: "bio_alt", label: "ALT (SGPT)" },
                                    { key: "bio_ast", label: "AST (SGOT)" },
                                    { key: "bio_alp", label: "ALP" },
                                    { key: "bio_totalProtein", label: "Total Protein" },
                                    { key: "bio_albumin", label: "Albumin" },
                                    { key: "bio_globulin", label: "Globulin" },
                                    { key: "bio_totalBilirubin", label: "Total Bilirubin" },
                                    { key: "bio_sodium", label: "Sodium" },
                                    { key: "bio_potassium", label: "Potassium" },
                                    { key: "bio_chloride", label: "Chloride" },
                                    { key: "bio_calcium", label: "Calcium" },
                                    { key: "bio_phosphorus", label: "Phosphorus" },
                                ].map(({ key, label }) => (
                                    <div key={key} className="space-y-1">
                                        <Label className="text-xs">{label}</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={results[key] || ""}
                                            onChange={(e) => setResults(prev => ({ ...prev, [key]: e.target.value }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.category !== "Hematology" && report.category !== "Hematology & Blood Chemistry" && report.category !== "Blood Chemistry" && report.category !== "Biochemistry" && (
                        <div className="text-center p-8 bg-muted rounded-md space-y-4">
                            <p>Use the summary and notes fields below for {report.category} results.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label>Summary / Conclusion</Label>
                            <Textarea
                                placeholder="Overall result interpretation..."
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Notes</Label>
                            <Textarea
                                placeholder="Additional notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>


                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>

                        {onPrint && (
                            <Button
                                variant="secondary"
                                className="gap-2"
                                onClick={() => {
                                    mutation.mutate();
                                    onPrint(report.id);
                                }}
                                disabled={mutation.isPending}
                            >
                                <Printer className="w-4 h-4" />
                                Save & Print
                            </Button>
                        )}
                        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : "Save & Complete"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}


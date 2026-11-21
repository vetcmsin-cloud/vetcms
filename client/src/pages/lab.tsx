import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
import { Checkbox } from "@/components/ui/checkbox";
import { BloodSmearBuilder } from "@/components/blood-smear-builder";
import { WetFilmBuilder } from "@/components/wet-film-builder";
import { VaginalCytologyBuilder } from "@/components/vaginal-cytology-builder";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    Wifi,
    Settings,
    Trash2,
    X,
    RotateCcw
} from "lucide-react";
import {
    type LabReport,
    type Pet,
    type Owner,
    type Appointment,
    LAB_REPORT_CATEGORIES
} from "@shared/schema";
import { format } from "date-fns";
import { formatInTZ, getClinicTimezone } from "@/lib/timezone";
import { cn, formatLocalTimestamp, formatWhatsAppLink, openWhatsAppLink } from "@/lib/utils";
import { generatePDFFromElement } from "@/lib/pdf-generator";
import { FaWhatsapp } from "react-icons/fa";
// Tesseract is loaded lazily inside handleCbcImageUpload to avoid bundle/module issues

function CreateLabOrderDialog({ pets, owners }: { pets: Pet[], owners: Owner[] }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [ownerOpen, setOwnerOpen] = useState(false);
    const [patientOpen, setPatientOpen] = useState(false);
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");

    const [form, setForm] = useState({
        petId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        category: "Hematology",
        title: "",
        notes: "",
    });

    const { data: appointments } = useQuery<Appointment[]>({
        queryKey: ["/api/appointments"],
        enabled: open,
    });

    // Map petId -> latest appointment ID
    const petLatestActivity = useMemo(() => {
        const map: Record<number, number> = {};
        if (appointments) {
            appointments.forEach(apt => {
                if (apt.petId) {
                    map[apt.petId] = Math.max(map[apt.petId] || 0, apt.id);
                }
            });
        }
        return map;
    }, [appointments]);

    // Map ownerId -> latest appointment ID
    const ownerLatestActivity = useMemo(() => {
        const map: Record<number, number> = {};
        if (appointments) {
            appointments.forEach(apt => {
                if (apt.ownerId) {
                    map[apt.ownerId] = Math.max(map[apt.ownerId] || 0, apt.id);
                }
            });
        }
        return map;
    }, [appointments]);

    // Sorted owners for search suggestion: latest appointment owner first
    const sortedOwners = useMemo(() => {
        return [...owners].sort((a, b) => {
            const activityA = ownerLatestActivity[a.id] || 0;
            const activityB = ownerLatestActivity[b.id] || 0;
            if (activityB !== activityA) return activityB - activityA;
            return b.id - a.id;
        });
    }, [owners, ownerLatestActivity]);

    // Sorted pets for search suggestion: latest appointment pet first
    const sortedPets = useMemo(() => {
        const list = selectedOwnerId
            ? pets.filter(p => p.ownerId === parseInt(selectedOwnerId))
            : pets;

        return [...list].sort((a, b) => {
            const activityA = petLatestActivity[a.id] || 0;
            const activityB = petLatestActivity[b.id] || 0;
            if (activityB !== activityA) return activityB - activityA;
            return b.id - a.id;
        });
    }, [pets, selectedOwnerId, petLatestActivity]);

    // Automatically select pet if only one exists for the selected owner
    useEffect(() => {
        if (selectedOwnerId) {
            const ownerPets = pets.filter(p => p.ownerId === parseInt(selectedOwnerId));
            if (ownerPets.length === 1) {
                setForm(prev => ({ ...prev, petId: String(ownerPets[0].id) }));
            }
        }
    }, [selectedOwnerId, pets]);

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
            setOwnerOpen(false);
            setPatientOpen(false);
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

    const getPatientDisplay = (petId: string) => {
        const pet = pets.find(p => String(p.id) === petId);
        if (!pet) return "Select patient";
        const owner = owners.find(o => o.id === pet.ownerId);
        const ownerStr = owner ? ` - ${owner.firstName} ${owner.lastName}` : "";
        return `${pet.name} (${pet.species || 'Pet'})${ownerStr}`;
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
                    {/* Filter Active Reset Bar */}
                    {(selectedOwnerId || form.petId) && (
                        <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5 rounded-md border text-xs">
                            <span className="text-muted-foreground font-medium">
                                Active Selection Applied
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                    setSelectedOwnerId("");
                                    setForm(prev => ({ ...prev, petId: "" }));
                                }}
                            >
                                <RotateCcw className="w-3 h-3 mr-1" /> Clear Selection
                            </Button>
                        </div>
                    )}

                    {/* Direct Search by Owner OR Search by Patient */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Owner Selector */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label>Filter by Owner</Label>
                                {selectedOwnerId && (
                                    <button
                                        type="button"
                                        className="text-[11px] text-destructive hover:underline flex items-center gap-0.5 font-medium"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedOwnerId("");
                                        }}
                                    >
                                        <X className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>
                            <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={ownerOpen}
                                        className="justify-between w-full text-left font-normal"
                                    >
                                        <span className="truncate">
                                            {selectedOwnerId ? getOwnerDisplay(selectedOwnerId) : "Select owner..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search owner, phone, or patient..." />
                                        <CommandList>
                                            <CommandEmpty>No owner found.</CommandEmpty>
                                            <CommandGroup>
                                                {sortedOwners.map((owner, idx) => {
                                                    const ownerPets = pets.filter(p => p.ownerId === owner.id);
                                                    const petNames = ownerPets.map(p => p.name).join(" ");
                                                    return (
                                                        <CommandItem
                                                            key={owner.id}
                                                            value={`${owner.firstName} ${owner.lastName} ${owner.phone} ${petNames}`}
                                                            onSelect={() => {
                                                                const newOwnerId = String(owner.id);
                                                                setSelectedOwnerId(newOwnerId);
                                                                setOwnerOpen(false);
                                                                if (newOwnerId !== selectedOwnerId) {
                                                                    const oPets = pets.filter(p => p.ownerId === owner.id);
                                                                    if (oPets.length === 1) {
                                                                        setForm(prev => ({ ...prev, petId: String(oPets[0].id) }));
                                                                    } else {
                                                                        setForm(prev => ({ ...prev, petId: "" }));
                                                                    }
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
                                                                <div className="flex items-center gap-1.5 font-medium truncate">
                                                                    <span>{owner.firstName} {owner.lastName} ({owner.phone})</span>
                                                                    {idx === 0 && (
                                                                        <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">Latest</span>
                                                                    )}
                                                                </div>
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

                        {/* Patient Selector */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label>Search / Select Patient</Label>
                                {form.petId && (
                                    <button
                                        type="button"
                                        className="text-[11px] text-destructive hover:underline flex items-center gap-0.5 font-medium"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForm(prev => ({ ...prev, petId: "" }));
                                        }}
                                    >
                                        <X className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>
                            <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={patientOpen}
                                        className="justify-between w-full text-left font-normal"
                                    >
                                        <span className="truncate">
                                            {form.petId ? getPatientDisplay(form.petId) : "Select patient..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search patient name, species, breed..." />
                                        <CommandList>
                                            <CommandEmpty>No patient found.</CommandEmpty>
                                            <CommandGroup>
                                                {sortedPets.map((pet, idx) => {
                                                    const owner = owners.find(o => o.id === pet.ownerId);
                                                    const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : "";
                                                    const ownerPhone = owner?.phone || "";
                                                    return (
                                                        <CommandItem
                                                            key={pet.id}
                                                            value={`${pet.name} ${pet.species || ""} ${pet.breed || ""} ${ownerName} ${ownerPhone}`}
                                                            onSelect={() => {
                                                                setForm(prev => ({ ...prev, petId: String(pet.id) }));
                                                                if (pet.ownerId) {
                                                                    setSelectedOwnerId(String(pet.ownerId));
                                                                }
                                                                setPatientOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4 shrink-0",
                                                                    form.petId === String(pet.id) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <div className="flex items-center gap-1.5 font-medium truncate">
                                                                    <span>{pet.name} ({pet.species}{pet.breed ? `, ${pet.breed}` : ""})</span>
                                                                    {idx === 0 && (
                                                                        <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">Latest</span>
                                                                    )}
                                                                </div>
                                                                {owner && (
                                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                                        Owner: {ownerName} ({ownerPhone})
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

                    <div className="flex flex-col gap-1.5">
                        <Label>Category</Label>
                        <Select value={form.category} onValueChange={(v) => {
                            setForm({ ...form, category: v, title: "" }) // Reset title on category change
                        }}>
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

                    {(form.category === "Hematology" || form.category === "Hematology & Blood Chemistry") && (
                        <div className="flex flex-col gap-2 border p-3 rounded-md bg-muted/20">
                            <Label className="mb-1 text-sm font-semibold">Select Tests</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="test-cbc"
                                        checked={form.title.includes("CBC")}
                                        onCheckedChange={(checked) => {
                                            const parts = form.title ? form.title.split(" + ").filter(Boolean) : [];
                                            if (checked) {
                                                if (!parts.includes("CBC Test")) parts.push("CBC Test");
                                            } else {
                                                const idx = parts.indexOf("CBC Test");
                                                if (idx > -1) parts.splice(idx, 1);
                                            }
                                            setForm(prev => ({ ...prev, title: parts.join(" + ") }));
                                        }}
                                    />
                                    <Label htmlFor="test-cbc" className="cursor-pointer text-sm font-medium">CBC Test</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="test-bs"
                                        checked={form.title.includes("Blood Smear")}
                                        onCheckedChange={(checked) => {
                                            const parts = form.title ? form.title.split(" + ").filter(Boolean) : [];
                                            if (checked) {
                                                if (!parts.includes("Blood Smear Test")) parts.push("Blood Smear Test");
                                            } else {
                                                const idx = parts.indexOf("Blood Smear Test");
                                                if (idx > -1) parts.splice(idx, 1);
                                            }
                                            setForm(prev => ({ ...prev, title: parts.join(" + ") }));
                                        }}
                                    />
                                    <Label htmlFor="test-bs" className="cursor-pointer text-sm font-medium">Blood Smear Test</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="test-wf"
                                        checked={form.title.includes("Wet Film")}
                                        onCheckedChange={(checked) => {
                                            const parts = form.title ? form.title.split(" + ").filter(Boolean) : [];
                                            if (checked) {
                                                if (!parts.includes("Wet Film Test")) parts.push("Wet Film Test");
                                            } else {
                                                const idx = parts.indexOf("Wet Film Test");
                                                if (idx > -1) parts.splice(idx, 1);
                                            }
                                            setForm(prev => ({ ...prev, title: parts.join(" + ") }));
                                        }}
                                    />
                                    <Label htmlFor="test-wf" className="cursor-pointer text-sm font-medium">Wet Film Test</Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {form.category === "Reproductive" && (
                        <div className="flex flex-col gap-2 border p-3 rounded-md bg-rose-50/40 border-rose-200">
                            <Label className="mb-1 text-sm font-semibold text-rose-800">Reproductive Test</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="test-evc"
                                        checked={form.title.includes("EVC") || form.title.includes("Vaginal Cytology")}
                                        onCheckedChange={(checked) => {
                                            const parts = form.title ? form.title.split(" + ").filter(Boolean) : [];
                                            if (checked) {
                                                if (!parts.some(p => p.includes("EVC") || p.includes("Vaginal Cytology"))) {
                                                    parts.push("Vaginal Cytology (EVC)");
                                                }
                                            } else {
                                                const idx = parts.findIndex(p => p.includes("EVC") || p.includes("Vaginal Cytology"));
                                                if (idx > -1) parts.splice(idx, 1);
                                            }
                                            setForm(prev => ({ ...prev, title: parts.join(" + ") }));
                                        }}
                                    />
                                    <Label htmlFor="test-evc" className="cursor-pointer text-sm font-medium">Vaginal Cytology (EVC)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="test-prog"
                                        checked={form.title.includes("Progesterone")}
                                        onCheckedChange={(checked) => {
                                            const parts = form.title ? form.title.split(" + ").filter(Boolean) : [];
                                            if (checked) {
                                                if (!parts.some(p => p.includes("Progesterone"))) {
                                                    parts.push("Progesterone Assay Test");
                                                }
                                            } else {
                                                const idx = parts.findIndex(p => p.includes("Progesterone"));
                                                if (idx > -1) parts.splice(idx, 1);
                                            }
                                            setForm(prev => ({ ...prev, title: parts.join(" + ") }));
                                        }}
                                    />
                                    <Label htmlFor="test-prog" className="cursor-pointer text-sm font-medium">Progesterone Assay Test</Label>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="test-title">Test Name / Title {(form.category === "Hematology" || form.category === "Hematology & Blood Chemistry" || form.category === "Reproductive") ? "(Other/Custom)" : ""}</Label>
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
    const [, setLocation] = useLocation();
    const { hasPermission } = useAuth();

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
        .sort((a, b) => {
            // Latest created lab order first (highest ID & creation time)
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            return b.id - a.id;
        });

    // Printing Logic similar to LabReportsTab
    const { data: settings, isLoading: isLoadingSettings } = useQuery<Record<string, string>>({
        queryKey: ["/api/clinic-settings"],
    });

    const [printReportId, setPrintReportId] = useState<number | null>(null);
    const [whatsappReportId, setWhatsappReportId] = useState<number | null>(null);

    const reportToPrint = useMemo(() => {
        return reports?.find(r => r.id === (printReportId || whatsappReportId));
    }, [reports, printReportId, whatsappReportId]);

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

        // Backward compatibility: old "Imaging" records fall back to Ultrasonography layout
        if (reportToPrint.category === "Imaging" && settings["labReportLayout_Ultrasonography"]) {
            try {
                return JSON.parse(settings["labReportLayout_Ultrasonography"]);
            } catch (e) {
                console.error(`Failed to parse Ultrasonography layout fallback for Imaging`, e);
            }
        }

        // Default layout for Reproductive reports so the Cycle Timeline panel always appears in-flow
        if (reportToPrint.category === "Reproductive") {
            return [
                { id: "customer_details_default", type: "panel", isVisible: true, label: "Customer / Patient Details", panelKey: "customer_details", x: 40, y: 170, width: 714, height: 200 },
                { id: "evc_panel_default", type: "panel", isVisible: true, label: "Vaginal Cytology (EVC)", panelKey: "evc_panel", x: 40, y: 380, width: 714, height: 320, position: "body" },
                { id: "progesterone_panel_default", type: "panel", isVisible: true, label: "Progesterone Assay", panelKey: "progesterone_panel", x: 40, y: 710, width: 714, height: 250, position: "body" },
                { id: "summary_default", type: "field", field: "summary", isVisible: true, label: "Summary / Conclusion", position: "body", x: 40, y: 970, width: 714, height: 120 },
                { id: "cycle_timeline_panel_default", type: "panel", isVisible: true, label: "Cycle Timeline", panelKey: "cycle_timeline_panel", x: 40, y: 1100, width: 714, height: 140, position: "body" },
                { id: "notes_default", type: "field", field: "notes", isVisible: true, label: "Notes", position: "body", x: 40, y: 1250, width: 714, height: 80 },
            ];
        }

        // Default layout for Ultrasonography reports — mirrors what the Design Studio saves
        if (reportToPrint.category === "Ultrasonography" || reportToPrint.category === "Imaging") {
            return [
                { id: "customer_details_usg", type: "panel", isVisible: true, label: "Customer / Patient Details", panelKey: "customer_details", x: 40, y: 170, width: 714, height: 160 },
                { id: "usg_panel_default", type: "panel", isVisible: true, label: "USG / Ultrasonography Findings", panelKey: "usg_panel", position: "body", x: 40, y: 340, width: 714, height: 580 },
                { id: "impression_panel_default", type: "panel", isVisible: true, label: "Impression", panelKey: "impression_panel", position: "body", x: 40, y: 930, width: 714, height: 80 },
                { id: "suggestion_panel_default", type: "panel", isVisible: true, label: "Suggestion", panelKey: "suggestion_panel", position: "body", x: 40, y: 1020, width: 714, height: 80 },
                { id: "notes_usg_default", type: "field", field: "notes", isVisible: true, label: "Notes", position: "body", x: 40, y: 1110, width: 714, height: 80 },
            ];
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FlaskConical className="w-8 h-8 text-primary" />
                        Lab Dashboard
                    </h1>
                    <p className="text-muted-foreground">Manage laboratory orders, results, and reports.</p>
                </div>
                {hasPermission("admin_dashboard.view") && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setLocation("/admin/lab-settings")}
                    >
                        <Settings className="w-4 h-4" />
                        Lab Configuration
                    </Button>
                )}
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

            {/* Preload Background Image */}
            {settings?.labReportBackgroundImage && (
                <img src={settings.labReportBackgroundImage} className="absolute w-0 h-0 opacity-0 pointer-events-none" alt="Preload Background" />
            )}

            {/* Hidden Print Container */}
            {(printReportId || whatsappReportId) && reportToPrint && petToPrint && ownerToPrint && (
                createPortal(
                    <div id="printable-lab-report-container" className="fixed -left-[2000px] print:left-0">
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
                owners={owners || []}
                statusFilter={statusFilter}
                search={search}
                setSearch={setSearch}
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                onPrint={(id) => setPrintReportId(id)}
                onWhatsAppPdfRequest={(id) => setWhatsappReportId(id)}
                onWhatsAppPdfClear={() => setWhatsappReportId(null)}
            />
        </div>
    );
}

function LabReportsList({
    reports,
    isLoading,
    pets,
    owners,
    statusFilter,
    search,
    setSearch,
    isSearchOpen,
    setIsSearchOpen,
    onPrint,
    onWhatsAppPdfRequest,
    onWhatsAppPdfClear
}: {
    reports: LabReport[],
    isLoading: boolean,
    pets: Pet[],
    owners: Owner[],
    statusFilter: string,
    search?: string,
    setSearch?: (v: string) => void,
    isSearchOpen?: boolean,
    setIsSearchOpen?: (v: boolean) => void,
    onPrint?: (id: number) => void,
    onWhatsAppPdfRequest?: (id: number) => void,
    onWhatsAppPdfClear?: () => void
}) {
    const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canDelete = hasPermission("medical_records.delete", "admin_dashboard.view");
    const [displayCount, setDisplayCount] = useState(24);
    const { data: clinicSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/clinic-settings"] });
    const tz = getClinicTimezone(clinicSettings);

    // Display helper: map legacy "Imaging" to "Ultrasonography" for UI labels
    const formatCategory = (cat: string) => cat === "Imaging" ? "Ultrasonography" : cat;

    const handleWhatsAppShare = (report: LabReport, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        const pet = pets?.find(p => String(p.id) === String(report.petId));
        const owner = pet?.ownerId ? owners?.find(o => String(o.id) === String(pet.ownerId)) : null;

        if (!owner || !owner.phone) {
            toast({
                title: "WhatsApp Share Failed",
                description: pet ? `Owner phone number not found for pet "${pet.name}".` : "Patient or owner details not found for this report.",
                variant: "destructive"
            });
            return;
        }

        const clinicName = clinicSettings?.clinicName || "PetPoint Pro Veterinary Clinic";
        const reportDate = formatLocalTimestamp(report.createdAt || report.date);
        const ownerFullName = `${owner.firstName} ${owner.lastName || ""}`.trim();
        const petName = pet?.name || "Patient";
        const categoryFormatted = formatCategory(report.category);
        const statusFormatted = report.status ? report.status.toUpperCase() : "COMPLETED";

        const template = clinicSettings?.whatsappLabReportTemplate;
        const defaultTemplate = `*Lab Report Notification*

Dear {ownerName},
Here is the lab report for your pet *{petName}*:

🧪 Test: {testTitle}
🏷️ Category: {category}
📅 Date: {reportDate}
📌 Status: {status}
{resultSummary}
🔗 View Full Report: {reportUrl}

Thank you,
{clinicName}`;

        const formatMessage = (shortUrl: string = "") => {
            let msg = template && template.trim() ? template : defaultTemplate;
            const resultBlock = report.result ? `\n📝 *Result Summary:*\n${report.result}\n` : "";
            
            msg = msg
                .replace(/\{ownerName\}/g, ownerFullName)
                .replace(/\{petName\}/g, petName)
                .replace(/\{testTitle\}/g, report.title)
                .replace(/\{category\}/g, categoryFormatted)
                .replace(/\{reportDate\}/g, reportDate)
                .replace(/\{status\}/g, statusFormatted)
                .replace(/\{resultSummary\}/g, resultBlock)
                .replace(/\{reportUrl\}/g, shortUrl)
                .replace(/\{clinicName\}/g, clinicName);

            if (shortUrl && (!template || !template.includes("{reportUrl}"))) {
                msg += `\n🔗 *View Full Report:* ${shortUrl}\n`;
            }
            return msg;
        };

        const mode = clinicSettings?.whatsappMode || "direct";
        const countryCode = clinicSettings?.whatsappCountryCode || "91";

        if (mode === "ultramsg" || mode === "evolution" || mode === "direct") {
            if (onWhatsAppPdfRequest) onWhatsAppPdfRequest(report.id);
            toast({
                title: "Generating PDF...",
                description: `Preparing WhatsApp document for ${owner.firstName}...`,
            });

            setTimeout(async () => {
                try {
                    const base64Pdf = await generatePDFFromElement("printable-lab-report-container");
                    
                    const cleanPhone = owner.phone ? owner.phone.replace(/\D/g, '') : '';
                    const pdfFileName = cleanPhone ? `${cleanPhone}.pdf` : `Report_${Date.now()}.pdf`;

                    if (mode === "ultramsg" || mode === "evolution") {
                        const message = formatMessage("");
                        const res = await fetch("/api/whatsapp/send", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                phone: owner.phone,
                                message: message,
                                document: base64Pdf,
                                filename: pdfFileName
                            })
                        });
                        
                        const data: any = await res.json().catch(() => ({}));
                        if (!res.ok || data.error) {
                            throw new Error(data.error || data.message || "Failed to send WhatsApp document");
                        }
                        
                        toast({
                            title: "WhatsApp Sent",
                            description: `Lab report sent to ${owner.firstName} via WhatsApp.`,
                        });
                    } else {
                        // Direct mode: Upload PDF to get a secure unguessable public short link
                        const res = await fetch("/api/upload/base64-pdf", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                base64: base64Pdf,
                                filename: pdfFileName,
                                ownerPhone: owner.phone,
                                petName: pet?.name,
                                reportTitle: report.title
                            })
                        });
                        
                        if (!res.ok) throw new Error("Failed to generate PDF sharing link");
                        const data = await res.json();
                        
                        // Short unguessable secure report link: e.g. https://clinic.com/r/a7e93f2c
                        const reportPath = data.url || (data.token ? `/r/${data.token}` : `/r/${pdfFileName}`);
                        const fullUrl = `${window.location.origin}${reportPath}`;
                        const finalMessage = formatMessage(fullUrl);
                        
                        toast({
                            title: "Opening WhatsApp",
                            description: `Preparing WhatsApp chat for ${owner.firstName}...`,
                        });
                        
                        openWhatsAppLink(owner.phone, finalMessage, countryCode);
                    }
                } catch (err: any) {
                    toast({
                        title: "WhatsApp Share Failed",
                        description: err.message || "Could not send the PDF document.",
                        variant: "destructive"
                    });
                } finally {
                    if (onWhatsAppPdfClear) onWhatsAppPdfClear();
                }
            }, 800);
            return;
        }
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/lab-reports/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/lab-reports"] });
            toast({ title: "Lab order deleted", description: "The lab order has been removed." });
        },
        onError: (err: Error) => {
            toast({ title: "Delete failed", description: err.message, variant: "destructive" });
        },
    });

    useEffect(() => {
        setDisplayCount(24);
    }, [search, statusFilter]);

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
                    {reports.slice(0, displayCount).map((report) => {
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
                                                    <span>{formatCategory(report.category)}</span>
                                                    <span>•</span>
                                                    <span>{formatLocalTimestamp(report.createdAt || report.date)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                                            {isPending ? (
                                                <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-2 border-amber-200 hover:bg-amber-50 hover:text-amber-700 w-full sm:w-auto"
                                                        onClick={() => setSelectedReport(report)}
                                                    >
                                                        <Clock className="w-4 h-4" />
                                                        Enter Results
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                        onClick={(e) => handleWhatsAppShare(report, e)}
                                                        title="Share Lab Order on WhatsApp"
                                                    >
                                                        <FaWhatsapp className="w-4 h-4 text-white" />
                                                        WhatsApp
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                                    <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none" onClick={() => onPrint ? onPrint(report.id) : window.open(`/api/lab-reports/${report.id}/print`, '_blank')}>
                                                        <Printer className="w-4 h-4" />
                                                        Print
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium shadow-sm flex-1 sm:flex-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                        onClick={(e) => handleWhatsAppShare(report, e)}
                                                        title="Share Lab Report on WhatsApp"
                                                    >
                                                        <FaWhatsapp className="w-4 h-4 text-white" />
                                                        WhatsApp
                                                    </Button>
                                                    <Button size="sm" variant="secondary" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setSelectedReport(report)}>
                                                        <FileText className="w-4 h-4" />
                                                        View / Edit
                                                    </Button>
                                                </div>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                                                    onClick={() => setDeleteConfirmId(report.id)}
                                                    disabled={deleteMutation.isPending && deleteMutation.variables === report.id}
                                                    title="Delete lab order"
                                                >
                                                    {deleteMutation.isPending && deleteMutation.variables === report.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Trash2 className="w-4 h-4" />}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
                {reports.length > displayCount && (
                    <div className="flex justify-center mt-4">
                        <Button variant="outline" onClick={() => setDisplayCount(c => c + 24)}>
                            Load More Reports
                        </Button>
                    </div>
                )}
            </div>

            {
                selectedReport && (
                    <EnterResultsDialog
                        report={selectedReport}
                        open={!!selectedReport}
                        onOpenChange={(open) => !open && setSelectedReport(null)}
                        onPrint={onPrint}
                        onWhatsAppShare={() => handleWhatsAppShare(selectedReport)}
                    />
                )
            }

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lab Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this lab order and all associated results. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (deleteConfirmId !== null) {
                                    deleteMutation.mutate(deleteConfirmId);
                                    setDeleteConfirmId(null);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function EnterResultsDialog({ report, open, onOpenChange, onPrint, onWhatsAppShare }: { report: LabReport, open: boolean, onOpenChange: (open: boolean) => void, onPrint?: (id: number) => void, onWhatsAppShare?: () => void }) {
    const { toast } = useToast();
    const [results, setResults] = useState<Record<string, any>>((report.details as Record<string, any>) || {});
    const [summary, setSummary] = useState(report.result === "Completed" ? "" : (report.result || ""));
    const [notes, setNotes] = useState(report.notes || "");
    const [isScanning, setIsScanning] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);

    // Fetch pet info to get species for blood smear test
    const { data: pet } = useQuery({ queryKey: [`/api/pets/${report.petId}`], enabled: !!report.petId && open });

    // Initial parsing for what test sub-forms to show
    const initialReportTitle = report.title?.toLowerCase() || "";
    const isSmear = initialReportTitle.includes("smear");
    const isWet = initialReportTitle.includes("wet");
    const isComprehensive = initialReportTitle.includes("comprehensive") || initialReportTitle.includes("panel") || (!isSmear && !isWet && !initialReportTitle.includes("cbc"));
    const isCBC = initialReportTitle.includes("cbc") || isComprehensive;

    // Add existing values into account, just in case user resumes editing
    const d = (report.details || {}) as any;
    const hasCbcData = d.wbc || d.rbc || d.hb || d.pcv || d.platelet || d.mcv || d.mch || d.mchc || d.neutrophils || d.lymphocytes || d.monocytes || d.eosinophils || d.basophils;
    const hasSmearData = !!d.bloodSmear;
    const hasWetData = !!d.wetFilm;

    const [selectedTests, setSelectedTests] = useState({
        cbc: isCBC || !!hasCbcData,
        bloodSmear: isSmear || isComprehensive || hasSmearData,
        wetFilm: isWet || isComprehensive || hasWetData
    });

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
        onSuccess: (updatedReport) => {
            queryClient.setQueryData(["/api/lab-reports"], (oldData: LabReport[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.map(r => r.id === updatedReport.id ? updatedReport : r);
            });
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
            const Tesseract = (await import("tesseract.js")).default;
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
    const isReproductive = report.category === "Reproductive";
    const isUltrasonography = report.category === "Ultrasonography" || report.category === "Imaging";

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
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 pb-2 border-b">
                                <h4 className="font-semibold text-sm uppercase">Select Tests to Result</h4>
                                <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <Checkbox checked={selectedTests.cbc} onCheckedChange={(checked) => setSelectedTests(prev => ({ ...prev, cbc: !!checked }))} />
                                        CBC Panel
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <Checkbox checked={selectedTests.bloodSmear} onCheckedChange={(checked) => setSelectedTests(prev => ({ ...prev, bloodSmear: !!checked }))} />
                                        Blood Smear
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                                        <Checkbox checked={selectedTests.wetFilm} onCheckedChange={(checked) => setSelectedTests(prev => ({ ...prev, wetFilm: !!checked }))} />
                                        Wet Film
                                    </label>
                                </div>
                            </div>

                            {!selectedTests.cbc && !selectedTests.bloodSmear && !selectedTests.wetFilm && (
                                <div className="text-sm text-muted-foreground italic text-center py-4">
                                    Select at least one test above to enter results.
                                </div>
                            )}

                            {selectedTests.cbc && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">CBC PANEL</h4>
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

                            {(selectedTests.bloodSmear || selectedTests.wetFilm) && (
                                <div className={`grid ${selectedTests.bloodSmear && selectedTests.wetFilm ? 'grid-cols-2' : 'grid-cols-1'} gap-4 text-sm mt-4 pt-4 ${selectedTests.cbc ? 'border-t border-muted' : ''}`}>
                                    {selectedTests.bloodSmear && (
                                        <div className="space-y-1">
                                            <Label className="text-xs uppercase">Blood Smear Test</Label>
                                            <BloodSmearBuilder
                                                value={results.bloodSmear || ""}
                                                onChange={(val) => setResults(prev => ({ ...prev, bloodSmear: val }))}
                                                petSpecies={(pet as any)?.species}
                                            />
                                        </div>
                                    )}
                                    {selectedTests.wetFilm && (
                                        <div className="space-y-1">
                                            <Label className="text-xs uppercase">Wet Film Test</Label>
                                            <WetFilmBuilder
                                                value={results.wetFilm || ""}
                                                onChange={(val) => setResults(prev => ({ ...prev, wetFilm: val }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {(report.category === "Blood Chemistry" || report.category === "Hematology & Blood Chemistry") && (
                        <div className="border p-4 rounded-md space-y-4">
                            <h4 className="font-semibold text-sm uppercase mb-3">Blood Chemistry Details</h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                {["ast", "alt", "alp", "ggt", "totalBilirubin", "totalProtein", "albumin", "globulin", "cholesterol", "triglyceride", "creatinine", "urea", "amylase", "lipase", "ck", "calcium", "phosphorus", "magnesium", "sodium", "potassium", "chloride", "glucose"].map(field => (
                                    <div key={field} className="space-y-1">
                                        <Label className="text-xs uppercase">{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
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
                                    { key: "bio_ast", label: "AST (SGOT)" },
                                    { key: "bio_alt", label: "ALT (SGPT)" },
                                    { key: "bio_alp", label: "ALP" },
                                    { key: "bio_ggt", label: "GGT" },
                                    { key: "bio_totalBilirubin", label: "Total Bilirubin" },
                                    { key: "bio_totalProtein", label: "Total Protein" },
                                    { key: "bio_albumin", label: "Albumin" },
                                    { key: "bio_globulin", label: "Globulin" },
                                    { key: "bio_cholesterol", label: "Cholesterol" },
                                    { key: "bio_triglyceride", label: "Triglyceride" },
                                    { key: "bio_creatinine", label: "Creatinine" },
                                    { key: "bio_urea", label: "Urea (BUN)" },
                                    { key: "bio_amylase", label: "Amylase" },
                                    { key: "bio_lipase", label: "Lipase" },
                                    { key: "bio_ck", label: "CK (CPK)" },
                                    { key: "bio_calcium", label: "Calcium" },
                                    { key: "bio_phosphorus", label: "Phosphorus" },
                                    { key: "bio_magnesium", label: "Magnesium" },
                                    { key: "bio_sodium", label: "Sodium" },
                                    { key: "bio_potassium", label: "Potassium" },
                                    { key: "bio_chloride", label: "Chloride" },
                                    { key: "bio_glucose", label: "Glucose" },
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

                    {isReproductive && (
                        <div className="border p-4 rounded-md space-y-4">
                            <VaginalCytologyBuilder
                                value={results}
                                onChange={(newVals) => setResults(prev => ({ ...prev, ...newVals }))}
                                reportTitle={report.title}
                            />
                        </div>
                    )}

                    {isUltrasonography && (
                        <div className="border p-4 rounded-md space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { key: "usg_urinaryBladder", label: "Urinary Bladder", placeholder: "UB moderately distended, wall thickness 1.09 mm. No luminal defects seen." },
                                    { key: "usg_liver", label: "Liver", placeholder: "Hepatic Parenchyma is normal. Lobes shape and size normal. No SOL seen..." },
                                    { key: "usg_spleen", label: "Spleen", placeholder: "Dense, homogenous, fine granular echotexture seen, margin is sharp and well defined..." },
                                    { key: "usg_kidney", label: "Kidney", placeholder: "Both renal corticomedullary differentiation (CMD) clear, cortex isoechoic to liver..." },
                                    { key: "usg_stomach", label: "Stomach", placeholder: "Dark and bright rugal folds seen. Lumen filled with gases and echogenic contents." },
                                    { key: "usg_intestine", label: "Intestine", placeholder: "Intestinal loops are normal. Lumen filled with gases and echogenic contents." },
                                    { key: "usg_ovaryUterus", label: "Ovary & Uterus", placeholder: "Ovaries seen reactive. Uterine horns seen reactive, horn diameter is 11.33mm..." },
                                    { key: "usg_abdomen", label: "Abdomen", placeholder: "No free fluid seen." },
                                    { key: "usg_pancreas", label: "Pancreas", placeholder: "Pancreatic limb echotexture seen normal. Pancreatic limb width seen normal." },
                                    { key: "usg_adrenalGland", label: "Adrenal Gland", placeholder: "Adrenals seen normal." },
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key} className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold uppercase text-slate-600">{label} :-</Label>
                                        <Textarea
                                            className="min-h-[52px] text-sm resize-none"
                                            placeholder={placeholder}
                                            value={results[key] || ""}
                                            onChange={(e) => setResults(prev => ({ ...prev, [key]: e.target.value }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isUltrasonography && (
                        <div className="border p-4 rounded-md space-y-3">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs font-semibold uppercase text-slate-700">Impression :-</Label>
                                <Textarea
                                    className="min-h-[48px] text-sm resize-none"
                                    placeholder="Splenomegaly, Calcified Uterine body & Endometritis. Reactive ovaries."
                                    value={results.usg_impression || ""}
                                    onChange={(e) => setResults(prev => ({ ...prev, usg_impression: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs font-semibold uppercase text-slate-700">Suggestion :-</Label>
                                <Textarea
                                    className="min-h-[48px] text-sm italic resize-none"
                                    placeholder="To know the function of organs need to correlate with blood parameters findings."
                                    value={results.usg_suggestion || ""}
                                    onChange={(e) => setResults(prev => ({ ...prev, usg_suggestion: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    {!isBloodTest && !isReproductive && !isUltrasonography && (
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

                        {onWhatsAppShare && (
                            <Button
                                className="gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => onWhatsAppShare()}
                                title="Share on WhatsApp"
                            >
                                <FaWhatsapp className="w-4 h-4 text-white" />
                                WhatsApp
                            </Button>
                        )}
                        {onPrint && (
                            <Button
                                variant="secondary"
                                className="gap-2"
                                onClick={() => {
                                    mutation.mutate(undefined, {
                                        onSuccess: () => {
                                            onPrint(report.id);
                                        }
                                    });
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



import { useState, useRef, useEffect } from "react";
import { DraggableComponent } from "./DraggableComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
    Save, LayoutTemplate, Type,
    Image as ImageIcon,
    Trash2, Eye, EyeOff, RotateCcw,
    MonitorPlay, PenTool, PanelTop,
    ZoomIn, ZoomOut, Move,
    Calendar, User, Hash, IndianRupee,
    CreditCard, Building2, Phone, Mail,
    FileText, QrCode, Download, Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    InvoiceHeader,
    InvoiceGrid,
    InvoiceTable,
    InvoiceTotals,
    InvoiceText,
    InvoicePayment,
    InvoiceFooter,
    InvoiceSpacer,
    InvoiceStamp
} from "./InvoiceSections";
import { InvoiceRenderer } from "./InvoiceRenderer";
import type { InvoiceSection, SectionType, InvoiceFieldKey } from "./types";

// A4 Dimensions in Pixels (approx at 96 DPI)
// 210mm x 297mm
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// A5 Dimensions in Pixels
// 148mm x 210mm
const A5_WIDTH_PX = 559;
const A5_HEIGHT_PX = 794;

const AVAILABLE_FIELDS: { key: InvoiceFieldKey; label: string; icon: any; width?: number }[] = [
    { key: "invoiceNumber", label: "Invoice Number", icon: Hash },
    { key: "date", label: "Invoice Date", icon: Calendar },
    { key: "dueDate", label: "Due Date", icon: Calendar },
    { key: "customerName", label: "Customer Name", icon: User },
    { key: "customerAddress", label: "Customer Address", icon: Building2 },
    { key: "customerPhone", label: "Customer Phone", icon: Phone },
    { key: "customerEmail", label: "Customer Email", icon: Mail },
    { key: "patientName", label: "Patient Name", icon: User },
    { key: "ownerName", label: "Owner Name", icon: User },
    { key: "serialNumber", label: "Sl. No.", icon: Hash },
    { key: "clinicPhone", label: "Clinic Phone", icon: Phone },
    { key: "doctorName", label: "Doctor Name", icon: User },
    { key: "doctorPhone", label: "Doctor Mobile", icon: Phone },
    { key: "billedBy", label: "Billed By", icon: User },
    { key: "gstNumber", label: "GST Number", icon: Hash },
    { key: "regNumber", label: "Reg Number", icon: Hash },
    { key: "subtotal", label: "Subtotal", icon: IndianRupee },
    { key: "tax", label: "Tax", icon: IndianRupee },
    { key: "total", label: "Grand Total", icon: IndianRupee },
    { key: "upiId", label: "UPI ID", icon: CreditCard },
    { key: "upiPhone", label: "UPI Phone Number", icon: Phone }, // Added
    { key: "bankName", label: "Bank Name", icon: Building2 },
    { key: "terms", label: "Terms & Conditions", icon: FileText, width: 700 },
    { key: "qrCode", label: "Payment QR", icon: QrCode, width: 100 },
    // Item Fields (First Item)
    { key: "description", label: "Product / Description", icon: LayoutTemplate },
    { key: "quantity", label: "Quantity", icon: Hash },
    { key: "unitPrice", label: "Price / Rate", icon: IndianRupee },
    { key: "lineTotal", label: "Item Subtotal", icon: IndianRupee },
];

// Default sections for a new blank layout
const DEFAULT_SECTIONS: InvoiceSection[] = [];


const PREVIEW_DATA = {
    invoiceNumber: "PET0001",
    date: "2030-10-10",
    dueDate: "2030-10-30",
    ownerName: "Benjamin Shah",
    ownerAddress: "123 Anywhere St., Any City",
    ownerPhone: "+91 98765 43210",
    ownerEmail: "benjamin@example.com",
    patientName: "Bruno",
    items: [
        { id: 1, description: "Consultation", quantity: 1, unitPrice: 500, total: 500 },
        { id: 2, description: "Vaccination", quantity: 1, unitPrice: 800, total: 800 },
    ],
    subtotal: 1300,
    tax: 234,
    discount: 0,
    total: 1534,
    notes: "",
    status: "paid",
    billedByName: "Receptionist Name",
    createdByName: "Doctor Name"
};

export interface InvoiceDesignerProps {
    initialLayout?: InvoiceSection[];
    layout?: InvoiceSection[];
    onLayoutChange?: (layout: InvoiceSection[]) => void;
    onSave?: (layout: InvoiceSection[]) => void;
    settings: Record<string, string>;
}

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";

export interface InvoiceDesignerProps {
    initialLayout?: InvoiceSection[];
    layout?: InvoiceSection[];
    onLayoutChange?: (layout: InvoiceSection[]) => void;
    onSave?: (layout: InvoiceSection[]) => void;
    onSettingsChange?: (settings: Record<string, string>) => void;
    settings: Record<string, string>;
    canvasPaperSize?: "a4" | "a5_portrait" | "a5_landscape";
}

const generateId = (type: SectionType) => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function InvoiceDesigner({ initialLayout, layout: controlledLayout, onLayoutChange, onSave, onSettingsChange, settings, canvasPaperSize }: InvoiceDesignerProps) {
    const { toast } = useToast();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const migrationFix = (sections: InvoiceSection[]): InvoiceSection[] => {
        // Migration logic: If old sections exist (header, grid, etc), we might want to keep them or warn.
        // For now, let's just ensure X/Y/Width exist.
        return sections.map((s, i) => ({
            ...s,
            x: s.x ?? 40,
            y: s.y ?? (40 + i * 50),
            width: s.width ?? 200
        }));
    };

    const [internalLayout, setInternalLayout] = useState<InvoiceSection[]>(() =>
        migrationFix(initialLayout && initialLayout.length > 0 ? initialLayout : DEFAULT_SECTIONS)
    );

    const layout = controlledLayout || internalLayout;

    const effectivePaperSize = canvasPaperSize || settings.printerType || "a4";
    const isA5 = effectivePaperSize.startsWith("a5");
    const isA5Landscape = effectivePaperSize === "a5_landscape";

    let pageWidth = A4_WIDTH_PX;
    let pageHeight = A4_HEIGHT_PX;

    if (isA5) {
        if (isA5Landscape) {
            pageWidth = A5_HEIGHT_PX; // 794
            pageHeight = A5_WIDTH_PX; // 559
        } else {
            pageWidth = A5_WIDTH_PX; // 559
            pageHeight = A5_HEIGHT_PX; // 794
        }
    }

    const setLayout = (newLayout: InvoiceSection[]) => {
        if (onLayoutChange) {
            onLayoutChange(newLayout);
        } else {
            setInternalLayout(newLayout);
        }
    };

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mode, setMode] = useState<"edit" | "preview">("edit");
    const [zoom, setZoom] = useState(0.8);
    const [showGrid, setShowGrid] = useState(false);
    const GRID_SIZE = 20;



    const handleDragStop = (id: string, x: number, y: number) => {
        const newLayout = internalLayout.map(s => {
            if (s.id === id) {
                // Snap to grid if enabled
                const snappedX = showGrid ? Math.round(x / GRID_SIZE) * GRID_SIZE : x;
                const snappedY = showGrid ? Math.round(y / GRID_SIZE) * GRID_SIZE : y;
                return { ...s, x: snappedX, y: snappedY };
            }
            return s;
        });
        setLayout(newLayout);
    };

    const addSection = (type: SectionType, field?: InvoiceFieldKey, defaultWidth?: number) => {
        // Start position: center of current view
        let startY = 100;
        if (scrollContainerRef.current) {
            const containerHeight = scrollContainerRef.current.clientHeight;
            const scrollTop = scrollContainerRef.current.scrollTop;
            // Place in middle of visible area, accounting for zoom
            // The canvas is scaled, but the container scrolls normally.
            // We want the visual center.
            // visualMiddle = scrollTop + containerHeight / 2
            // We need to map this to the unscaled coordinate system of the invoice (0 to 1123)

            // Actually, simpler: just put it a bit below the top of the current scroll
            // factor in zoom? No, the scroll is on the container wrapping the scaled div?
            // Wait, the structure is:
            // <div (overflow-auto)>
            //    <div (transform scale) style={{height: 1123}} />
            // </div>
            // If I scroll down 500px, I am looking at pixel 500 (approx) of the invoices.
            // So y should be scrollTop + padding.

            // Adjust for zoom: content is scaled.
            // If zoom is 0.5, the content is small. 
            // The container scrollHeight will be A4_HEIGHT * zoom.
            // So scrollTop is in "zoomed pixels".

            // We want y in "invoice pixels".
            // y * zoom = scrollTop + offset
            // y = (scrollTop + 100) / zoom

            startY = (scrollTop + 150) / zoom;
        }

        // Randomize slightly X to avoid stacking perfectly
        const startX = 50 + (Math.random() * 20);

        const newSection: InvoiceSection = {
            id: generateId(type),
            type,
            isVisible: true,
            label: field ? AVAILABLE_FIELDS.find(f => f.key === field)?.label || field : `New ${type}`,
            content: type === "text" ? "Enter text here..." : undefined,
            x: startX,
            y: startY,
            width: defaultWidth || (type === "stamp" ? 150 : (field ? 200 : 300)),
            field: field,
        };
        setLayout([...layout, newSection]);
        setSelectedId(newSection.id);

        toast({ title: "Field Added", description: `Added ${newSection.label} to canvas.` });
    };

    const updateSection = (id: string, updates: Partial<InvoiceSection>) => {
        setLayout(layout.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeSection = (id: string) => {
        setLayout(layout.filter(s => s.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const selectedSection = layout.find(s => s.id === selectedId);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedId || mode === "preview") return;

            // Do not trigger if user is typing in an input or textarea
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
                return;
            }

            const step = e.shiftKey ? 10 : 1;
            let dx = 0;
            let dy = 0;

            switch (e.key) {
                case "ArrowUp": dy = -step; break;
                case "ArrowDown": dy = step; break;
                case "ArrowLeft": dx = -step; break;
                case "ArrowRight": dx = step; break;
                default: return;
            }

            e.preventDefault();

            setLayout(layout.map(s =>
                s.id === selectedId
                    ? { ...s, x: (s.x || 0) + dx, y: (s.y || 0) + dy }
                    : s
            ));
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId, layout, mode]);

    const handleSave = () => {
        if (onSave) {
            onSave(layout);
            toast({ title: "Layout Saved", description: "The invoice design has been updated." });
        }
    };

    const handleExport = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layout, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "invoice-layout.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            toast({ title: "Exported", description: "Layout downloaded as JSON." });
        } catch (error) {
            toast({ title: "Export Failed", description: "Could not export layout.", variant: "destructive" });
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedLayout = JSON.parse(event.target?.result as string);
                if (Array.isArray(importedLayout)) {
                    // Validating structure loosely
                    const isValid = importedLayout.every(item =>
                        typeof item === 'object' && 'id' in item && 'type' in item
                    );

                    if (isValid) {
                        // Migration fix just in case
                        const fixedLayout = migrationFix(importedLayout);
                        setLayout(fixedLayout);
                        toast({ title: "Layout Imported", description: "The invoice design has been loaded." });
                    } else {
                        toast({ title: "Import Failed", description: "Invalid layout structure.", variant: "destructive" });
                    }

                } else {
                    toast({ title: "Import Failed", description: "Invalid layout file.", variant: "destructive" });
                }
            } catch (error) {
                toast({ title: "Import Failed", description: "Could not parse JSON.", variant: "destructive" });
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    // Helper to format currency (simplified for designer)
    const fmtCurr = (amount: number) => `₹${amount.toFixed(2)}`;
    const fmtDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' });

    const getPreviewValue = (key: InvoiceFieldKey) => {
        const d = PREVIEW_DATA;
        const s = settings;
        switch (key) {
            case "invoiceNumber": return d.invoiceNumber;
            case "date": return fmtDate(d.date);
            case "dueDate": return fmtDate(d.dueDate);
            case "customerName": return d.ownerName;
            case "customerAddress": return d.ownerAddress;
            case "customerPhone": return d.ownerPhone;
            case "customerEmail": return d.ownerEmail;
            case "patientName": return d.patientName;
            case "ownerName": return d.ownerName;
            // case "serialNumber": return d.items.length; // Count
            // case "serialNumber": return d.items.map((_, i) => i + 1).join("\n"); // If we want list
            case "clinicPhone": return s.upiPhone || settings.clinicPhone || "9999999999";
            case "doctorName": return settings.doctorName || "Dr. Smith";
            case "gstNumber": return settings.gstNumber || "GSTIN123";
            case "regNumber": return settings.registrationNumber || "REG123";
            case "subtotal": return fmtCurr(d.subtotal);
            case "tax": return fmtCurr(d.tax);
            case "total": return fmtCurr(d.total);
            case "upiId": return settings.upiId || "user@upi";
            case "upiPhone": return settings.upiPhone || "9876543210";
            case "bankName": return settings.upiBankName || settings.bankName || "Bank Name";
            case "terms": return settings.termsConditions || "Terms...";

            // List Items
            case "serialNumber": return d.items.map((_, i) => i + 1).join("\n");
            case "description": return d.items.map(i => i.description).join("\n");
            case "quantity": return d.items.map(i => i.quantity).join("\n");
            case "unitPrice": return d.items.map(i => fmtCurr(i.unitPrice)).join("\n");
            case "lineTotal": return d.items.map(i => fmtCurr(i.total)).join("\n");

            default: return `{${AVAILABLE_FIELDS.find(f => f.key === key)?.label || key}}`;
        }
    };

    // Helper to render content for the designer view
    const renderDesignerContent = (section: InvoiceSection) => {
        // ... (legacy types omitted for brevity, they are unchanged)
        if (section.type === "header") return <div className="p-2 border border-dashed bg-gray-50 text-xs">Header Block (Legacy)</div>;
        if (section.type === "grid") return <div className="p-2 border border-dashed bg-gray-50 text-xs">Patient/Recipient Grid (Legacy)</div>;
        if (section.type === "payment") return <div className="p-2 border border-dashed bg-gray-50 text-xs">Payment Info Block (Legacy)</div>;
        if (section.type === "totals") return <InvoiceTotals settings={settings} invoice={PREVIEW_DATA} section={section} logoPx={48} />;
        if (section.type === "table") return <InvoiceTable settings={settings} invoice={PREVIEW_DATA} section={section} logoPx={48} />;
        if (section.type === "image") {
            const src = settings.invoiceLogoImage || "";
            return src ? <img src={src} alt="Logo" className="w-full h-full object-contain" /> : <div className="p-2 border border-dashed text-xs text-center">No Logo</div>;
        }
        if (section.type === "stamp") {
            const stampSrc = settings.invoicePaidStampImage;
            return stampSrc ? (
                <img src={stampSrc} alt="PAID" className="w-full h-full object-contain opacity-80" />
            ) : (
                <div className="border-2 border-red-600 rounded-full w-full h-full flex items-center justify-center p-1"><span className="text-xs font-bold text-red-600">PAID</span></div>
            );
        }
        if (section.type === "text") return <div className={cn("whitespace-pre-wrap", !section.styles?.fontSize && "text-sm")}>{section.content || "Text"}</div>;

        if (section.type === "field" && section.field) {
            const label = section.label || AVAILABLE_FIELDS.find(f => f.key === section.field)?.label || section.field;
            const previewVal = getPreviewValue(section.field);
            // Show placeholder value or label
            return (
                <div className="flex flex-col h-full">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider hidden group-hover:block absolute -top-4 left-0 bg-white/80 px-1 rounded shadow-sm whitespace-nowrap z-50">{label}</span>
                    <div className={cn("font-medium truncate flex-1 flex items-center whitespace-pre-line", !section.styles?.fontSize && "text-sm")}>
                        {previewVal}
                    </div>
                </div>
            );
        }

        return <div className="text-xs text-red-500">Unknown</div>;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Invoice Canvas</h2>
                        <p className="text-sm text-muted-foreground">Click fields to add them to the letterhead.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
                        <Button
                            variant={showGrid ? "default" : "outline"}
                            size="icon"
                            onClick={() => setShowGrid(!showGrid)}
                            title={showGrid ? "Hide Grid" : "Show Grid"}
                        >
                            <LayoutTemplate className="w-4 h-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <Separator orientation="vertical" className="h-4 mx-1" />
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setZoom(0.65)}>Fit</Button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Setup
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Page Setup</h4>
                                    <p className="text-sm text-muted-foreground">Adjust global invoice settings.</p>
                                </div>
                                <div className="grid gap-2">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="maxRows">Rows per Page</Label>
                                        <Input
                                            id="maxRows"
                                            type="number"
                                            className="col-span-2 h-8"
                                            placeholder="Unlimited"
                                            value={settings.invoiceMaxRows || ""}
                                            onChange={(e) => onSettingsChange?.({ invoiceMaxRows: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <Label htmlFor="printerType">Default Print Size</Label>
                                        <select
                                            id="printerType"
                                            className="col-span-2 h-8 flex w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={settings.printerType || "a4"}
                                            onChange={(e) => onSettingsChange?.({ printerType: e.target.value })}
                                        >
                                            <option value="a4">A4 (Standard)</option>
                                            <option value="a5">A5 (Portrait)</option>
                                            <option value="a5_landscape">A5 (Landscape)</option>

                                        </select>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        If items exceed this count, the invoice will split into multiple pages. Totals and footer elements will move to the last page.
                                    </p>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button variant="outline" size="sm" onClick={() => setLayout(DEFAULT_SECTIONS)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                    </Button>

                    <div className="relative">
                        <Button variant="outline" size="sm" className="pointer-events-none">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Import
                        </Button>
                        <Input
                            type="file"
                            accept=".json"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={handleImport}
                            title="Import JSON Layout"
                        />
                    </div>

                    <Button size="sm" onClick={handleSave}>
                        <Save className="w-3.5 h-3.5 mr-1.5" /> Save Layout
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sidebar */}
                <div className="w-72 flex flex-col gap-4 border-r pr-4 overflow-y-auto">
                    <Tabs defaultValue="fields" className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="fields">Fields</TabsTrigger>
                            <TabsTrigger value="edit" disabled={!selectedId}>Properties</TabsTrigger>
                        </TabsList>
                        <TabsContent value="fields" className="space-y-4 mt-4">
                            <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Data Fields</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_FIELDS.map(field => (
                                        <Button
                                            key={field.key}
                                            variant="outline"
                                            size="sm"
                                            className="justify-start h-auto py-2 px-2 text-xs"
                                            onClick={() => addSection("field", field.key, field.width)}
                                        >
                                            <field.icon className="w-3 h-3 mr-1.5 shrink-0" />
                                            <span className="truncate">{field.label}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Components</p>
                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => addSection("text")}>
                                    <Type className="w-4 h-4 mr-2" /> Text Block
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => addSection("stamp")}>
                                    <ImageIcon className="w-4 h-4 mr-2" /> Stamp (PAID)
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => addSection("image")}>
                                    <ImageIcon className="w-4 h-4 mr-2" /> Logo / Image
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => addSection("table")}>
                                    <LayoutTemplate className="w-4 h-4 mr-2" /> Items Table
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => addSection("totals")}>
                                    <IndianRupee className="w-4 h-4 mr-2" /> Totals Block
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="edit" className="space-y-4 mt-4">
                            {selectedSection ? (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Label (Internal)</Label>
                                        <Input value={selectedSection.label} onChange={(e) => updateSection(selectedSection.id, { label: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Width (px)</Label>
                                        <Input type="number" value={selectedSection.width || ""} onChange={(e) => updateSection(selectedSection.id, { width: parseInt(e.target.value) || 0 })} />
                                    </div>

                                    {selectedSection.type === "text" && (
                                        <div className="space-y-1">
                                            <Label>Content</Label>
                                            <Textarea
                                                value={selectedSection.content || ""}
                                                onChange={(e) => updateSection(selectedSection.id, { content: e.target.value })}
                                                className="min-h-[100px]"
                                            />
                                        </div>
                                    )}

                                    {/* Grid Overlay */}
                                    {showGrid && (
                                        <div
                                            className="absolute inset-0 pointer-events-none z-0"
                                            style={{
                                                backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
                                                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                                            }}
                                        />
                                    )}

                                    {/* Style Fields */}
                                    <div className="space-y-1">
                                        <Label>Font Size (px)</Label>
                                        <Input
                                            type="number"
                                            value={selectedSection.styles?.fontSize?.replace('px', '') || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateSection(selectedSection.id, {
                                                    styles: { ...selectedSection.styles, fontSize: val ? `${val}px` : undefined }
                                                });
                                            }}
                                            placeholder="Inherit"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Font Weight</Label>
                                        <Input
                                            value={selectedSection.styles?.fontWeight || ""}
                                            onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, fontWeight: e.target.value } })}
                                            placeholder="bold, 500, etc"
                                        />
                                    </div>


                                    <div className="flex items-center justify-between pt-2">
                                        <Label>Visible</Label>
                                        <Switch checked={selectedSection.isVisible} onCheckedChange={(c) => updateSection(selectedSection.id, { isVisible: c })} />
                                    </div>
                                    <Button variant="destructive" size="sm" className="w-full mt-4" onClick={() => removeSection(selectedSection.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Select an element to edit</p>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Canvas Workspace */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 bg-muted/20 overflow-auto relative flex justify-center p-8"
                >
                    <div
                        className="bg-white shadow-2xl relative transition-transform origin-top"
                        style={{
                            width: pageWidth,
                            height: pageHeight,
                            transform: `scale(${zoom})`,
                            // Background Image (Letterhead)
                            backgroundImage: (isA5 && settings.invoiceBackgroundImage_a5) || settings.invoiceBackgroundImage ? `url(${(isA5 && settings.invoiceBackgroundImage_a5) ? settings.invoiceBackgroundImage_a5 : settings.invoiceBackgroundImage})` : undefined,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            // If no image, show white paper
                        }}
                        onClick={() => setSelectedId(null)}
                    >
                        {!settings.invoiceBackgroundImage && !(isA5 && settings.invoiceBackgroundImage_a5) && (
                            <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center text-6xl font-black uppercase text-slate-300">

                                Letterhead
                            </div>
                        )}

                        {layout.filter(s => s.isVisible).map(section => (
                            <DraggableComponent
                                key={section.id}
                                section={section}
                                isSelected={selectedId === section.id}
                                onSelect={() => setSelectedId(section.id)}
                                onUpdate={(updates) => {
                                    const newLayout = layout.map(s =>
                                        s.id === section.id ? { ...s, ...updates } : s
                                    );
                                    setLayout(newLayout);
                                }}
                                onRemove={() => {
                                    setLayout(layout.filter(s => s.id !== section.id));
                                    setSelectedId(null);
                                }}
                                zoomScale={zoom}
                                gridSize={showGrid ? GRID_SIZE : 0}
                            >
                                <div
                                    className="w-full h-full"
                                    style={{
                                        fontSize: section.styles?.fontSize,
                                        fontWeight: section.styles?.fontWeight,
                                        color: section.styles?.color,
                                    }}
                                >
                                    {mode === "edit" ? renderDesignerContent(section) : <InvoiceRenderer settings={settings} invoice={PREVIEW_DATA} layout={[section]} className="bg-transparent shadow-none border-none p-0 !min-h-0" />}
                                </div>
                            </DraggableComponent>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

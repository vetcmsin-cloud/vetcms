import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Palette, FileImage, Stamp } from "lucide-react";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoiceDesigner } from "@/components/invoice-designer/InvoiceDesigner";
import type { InvoiceSection } from "@/components/invoice-designer/types";
import { DocumentDesigner } from "@/components/document-designer/DocumentDesigner";
import { labReportConfig, LAB_REPORT_TYPES, DEFAULT_LAB_REPORT_TYPE, type LabReportType } from "@/components/document-designer/lab-report-fields";
import { medicalReportConfig } from "@/components/document-designer/medical-report-fields";
import type { DocumentSection } from "@/components/document-designer/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ClinicSettings = Record<string, string>;

const DESIGNER_META: Record<string, { title: string; subtitle: string; color: string }> = {
    invoice: {
        title: "Sales Invoice Design Studio",
        subtitle: "Complete control over your sales invoice layout, colors, fields, and styling.",
        color: "text-primary",
    },
    "lab-report": {
        title: "Lab Report Design Studio",
        subtitle: "Drag-and-drop designer for lab report templates — CBC, blood chemistry, and more.",
        color: "text-green-600",
    },
    "medical-report": {
        title: "Medical Report Design Studio",
        subtitle: "Drag-and-drop designer for medical report templates — SOAP notes, diagnosis, prescriptions.",
        color: "text-purple-600",
    },
    "purchase-invoice": {
        title: "Purchase Invoice Design Studio",
        subtitle: "Complete control over your purchase invoice layout, colors, fields, and styling.",
        color: "text-orange-600",
    },
    "purchase-order": {
        title: "Purchase Order Design Studio",
        subtitle: "Complete control over your purchase order layout, colors, fields, and styling.",
        color: "text-indigo-600",
    },
};

const CUSTOM_DEFAULT_LAYOUT: InvoiceSection[] = [
    { id: "header", type: "header", isVisible: true, label: "Header", styles: { variant: "curved" } },
    { id: "recipient_info", type: "grid", isVisible: true, label: "Recipient Info" },
    { id: "items_table", type: "table", isVisible: true, label: "Items Table" },
    { id: "totals", type: "totals", isVisible: true, label: "Totals" },
    { id: "stamp", type: "stamp", isVisible: true, label: "Paid Stamp" },
    { id: "notes", type: "text", isVisible: true, label: "Terms & Conditions", content: "Please send payment within 30 days of receiving this invoice.\nThere will be a 10% interest charge per month or late invoices." },
    { id: "payment_info", type: "payment", isVisible: true, label: "Payment Info" },
];

// Mapping: designer type → setting key for letterhead background
const LETTERHEAD_KEYS: Record<string, string> = {
    invoice: "invoiceBackgroundImage",
    "purchase-invoice": "purchaseInvoiceBackgroundImage",
    "purchase-order": "purchaseOrderBackgroundImage",
    "lab-report": "labReportBackgroundImage",
    "medical-report": "medicalReportBackgroundImage",
};

export default function DesignStudioPage() {
    const params = useParams<{ type: string }>();
    const designerType = params.type || "invoice";
    const { toast } = useToast();

    const meta = DESIGNER_META[designerType];
    if (!meta) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <p className="text-lg text-muted-foreground">Unknown designer type: {designerType}</p>
                <Link href="/admin/settings">
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Design Studio</Button>
                </Link>
            </div>
        );
    }

    const [invoicePaperSize, setInvoicePaperSize] = useState<"a4" | "a5_portrait" | "a5_landscape">("a4");
    const [printDesign, setPrintDesign] = useState<"print1" | "print2" | "print3">("print1");

    // Dynamic key for invoice background
    let letterheadKey = "invoiceBackgroundImage";
    if (designerType === "invoice") {
        let baseBg = "invoiceBackgroundImage";
        if (printDesign === "print2") baseBg = "invoiceBackgroundImage_print2";
        if (printDesign === "print3") baseBg = "invoiceBackgroundImage_print3";

        if (invoicePaperSize === "a5_portrait") letterheadKey = `${baseBg}_a5`;
        else if (invoicePaperSize === "a5_landscape") letterheadKey = `${baseBg}_a5_landscape`;
        else letterheadKey = baseBg;
    } else if (designerType === "purchase-invoice") {
        if (invoicePaperSize === "a5_portrait") letterheadKey = "purchaseInvoiceBackgroundImage_a5";
        else if (invoicePaperSize === "a5_landscape") letterheadKey = "purchaseInvoiceBackgroundImage_a5_landscape";
        else letterheadKey = "purchaseInvoiceBackgroundImage";
    } else if (designerType === "purchase-order") {
        if (invoicePaperSize === "a5_portrait") letterheadKey = "purchaseOrderBackgroundImage_a5";
        else if (invoicePaperSize === "a5_landscape") letterheadKey = "purchaseOrderBackgroundImage_a5_landscape";
        else letterheadKey = "purchaseOrderBackgroundImage";
    } else {
        letterheadKey = LETTERHEAD_KEYS[designerType] || "invoiceBackgroundImage";
    }

    const { data: settings, isLoading } = useQuery<ClinicSettings>({
        queryKey: ["/api/clinic-settings"],
    });


    const [invoiceLayout, setInvoiceLayout] = useState<InvoiceSection[] | undefined>(undefined);
    const [labReportType, setLabReportType] = useState<LabReportType>(DEFAULT_LAB_REPORT_TYPE);
    const [labReportLayout, setLabReportLayout] = useState<DocumentSection[] | undefined>(undefined);
    const [medicalReportLayout, setMedicalReportLayout] = useState<DocumentSection[] | undefined>(undefined);

    const [letterheadUrl, setLetterheadUrl] = useState("");
    const [paidStampUrl, setPaidStampUrl] = useState("");
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const typeParam = params.get("type");
        if (typeParam && (LAB_REPORT_TYPES as readonly string[]).includes(typeParam)) {
            setLabReportType(typeParam as LabReportType);
        }
    }, []);
    
    // Local state for debouncing textual input changes
    const [localValues, setLocalValues] = useState<Record<string, string>>({});

    const handleLocalChange = (key: string, val: string) => {
        setLocalValues(prev => ({ ...prev, [key]: val }));
    };

    const handleBlur = (key: string, val: string) => {
        if (settings && val !== settings[key]) {
            saveMutation.mutate({ [key]: val });
        }
    };

    useEffect(() => {
        if (settings) {
            // Handle Invoice Layout
            let invLayoutKey = "invoiceLayout";
            if (designerType === "invoice") {
                if (printDesign === "print2") invLayoutKey = "invoiceLayout_print2";
                if (printDesign === "print3") invLayoutKey = "invoiceLayout_print3";
            }

            if (invoicePaperSize === "a5_portrait") invLayoutKey += "_a5";
            else if (invoicePaperSize === "a5_landscape") invLayoutKey += "_a5_landscape";

            if (settings[invLayoutKey]) {
                try {
                    const parsed = JSON.parse(settings[invLayoutKey]);
                    setInvoiceLayout(parsed);
                } catch (e) {
                    console.error("Failed to parse invoice layout", e);
                    setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
                }
            } else {
                // Determine fallback to print1
                let fallbackKey = "invoiceLayout";
                if (invoicePaperSize === "a5_portrait") fallbackKey += "_a5";
                else if (invoicePaperSize === "a5_landscape") fallbackKey += "_a5_landscape";
                
                if (settings[fallbackKey]) {
                    try {
                        setInvoiceLayout(JSON.parse(settings[fallbackKey]));
                    } catch (e) {
                        setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
                    }
                } else {
                    setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
                }
            }
            // Handle Lab Report Layout based on selected type
            const labKey = labReportType === DEFAULT_LAB_REPORT_TYPE ? "labReportLayout" : `labReportLayout_${labReportType}`;
            if (settings[labKey]) {
                try {
                    setLabReportLayout(JSON.parse(settings[labKey]));
                } catch (e) {
                    console.error(`Failed to parse lab report layout for ${labReportType}`, e);
                    setLabReportLayout([]);
                }
            } else if (labReportType === "Ultrasonography") {
                setLabReportLayout([
                    { id: "hdr_customer_details_usg", type: "panel", isVisible: true, label: "Customer / Patient Details 1", panelKey: "customer_details_1", x: 40, y: 170, width: 714, height: 160 },
                    { id: "body_usg_panel", type: "panel", isVisible: true, label: "USG / Ultrasonography Findings", panelKey: "usg_panel", position: "body", x: 40, y: 340, width: 714, height: 580 },
                    { id: "body_impression_panel", type: "panel", isVisible: true, label: "Impression", panelKey: "impression_panel", position: "body", x: 40, y: 930, width: 714, height: 80 },
                    { id: "body_suggestion_panel", type: "panel", isVisible: true, label: "Suggestion", panelKey: "suggestion_panel", position: "body", x: 40, y: 1020, width: 714, height: 80 },
                    { id: "body_notes_usg", type: "field", field: "notes", isVisible: true, label: "Notes", position: "body", x: 40, y: 1110, width: 714, height: 80 },
                ] as any);
            } else if (labReportType === "Reproductive") {
                // Pre-populate Reproductive canvas with all relevant panels so user can see & customise them
                setLabReportLayout([
                    { id: "hdr_customer_details", type: "panel", isVisible: true, label: "Customer / Patient Details 1", panelKey: "customer_details_1", x: 40, y: 170, width: 714, height: 200 },
                    { id: "body_evc_panel", type: "panel", isVisible: true, label: "Vaginal Cytology (EVC)", panelKey: "evc_panel", x: 40, y: 240, width: 714, height: 320, position: "body" },
                    { id: "body_progesterone_panel", type: "panel", isVisible: true, label: "Progesterone Assay", panelKey: "progesterone_panel", x: 40, y: 580, width: 714, height: 250, position: "body" },
                    { id: "body_summary_field", type: "field", field: "summary", isVisible: true, label: "Summary / Conclusion", position: "body", x: 40, y: 840, width: 714, height: 120 },
                    { id: "body_cycle_timeline_panel", type: "panel", isVisible: true, label: "Cycle Timeline", panelKey: "cycle_timeline_panel", x: 40, y: 970, width: 714, height: 160, position: "body" },
                    { id: "body_notes_field", type: "field", field: "notes", isVisible: true, label: "Notes", position: "body", x: 40, y: 1140, width: 714, height: 80 },
                ] as any);
            } else {
                setLabReportLayout([]);
            }

            if (settings.medicalReportLayout) {
                try {
                    setMedicalReportLayout(JSON.parse(settings.medicalReportLayout));
                } catch (e) {
                    console.error("Failed to parse medical report layout", e);
                    setMedicalReportLayout([]);
                }
            } else {
                setMedicalReportLayout([]);
            }

            // Handle Purchase Layout
            if (designerType === "purchase-invoice" || designerType === "purchase-order") {
                const baseKey = designerType === "purchase-order" ? "purchaseOrderLayout" : "purchaseInvoiceLayout";
                let purLayoutKey = baseKey;
                if (invoicePaperSize === "a5_portrait") purLayoutKey = `${baseKey}_a5`;
                else if (invoicePaperSize === "a5_landscape") purLayoutKey = `${baseKey}_a5_landscape`;

                if (settings[purLayoutKey]) {
                    try {
                        setInvoiceLayout(JSON.parse(settings[purLayoutKey]));
                    } catch (e) {
                        setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
                    }
                } else {
                    // Falls back to sales invoice layout if purchase is empty
                    let invLayoutKey = "invoiceLayout";
                    if (invoicePaperSize === "a5_portrait") invLayoutKey = "invoiceLayout_a5";
                    else if (invoicePaperSize === "a5_landscape") invLayoutKey = "invoiceLayout_a5_landscape";

                    if (settings[invLayoutKey]) {
                        try {
                            setInvoiceLayout(JSON.parse(settings[invLayoutKey]));
                        } catch (e) {
                            setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
                        }
                    } else {
                        setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
                    }
                }
            }

            // Load images
            let loadedLetterheadUrl = settings[letterheadKey];
            // Only fall back to Print 1's letterhead if we're actually on Print 1
            // (or a non-invoice designer type). For Print 2/3, show blank if not set.
            if (!loadedLetterheadUrl && designerType === "invoice" && printDesign === "print1") {
                let fallbackBgKey = "invoiceBackgroundImage";
                if (invoicePaperSize === "a5_portrait") fallbackBgKey += "_a5";
                else if (invoicePaperSize === "a5_landscape") fallbackBgKey += "_a5_landscape";
                loadedLetterheadUrl = settings[fallbackBgKey];
            }
            setLetterheadUrl(loadedLetterheadUrl || "");
            setPaidStampUrl(settings.invoicePaidStampImage || "");
        }
    }, [settings, letterheadKey, labReportType, invoicePaperSize, printDesign, designerType]);

    // Determine the correct layout settings key for the active printDesign
    const currentLayoutKey = designerType === "invoice"
        ? (printDesign === "print2" ? "invoiceLayout_print2" : printDesign === "print3" ? "invoiceLayout_print3" : "invoiceLayout")
        : "invoiceLayout";

    const currentSettings = useMemo(() => ({
        ...(settings || {}),
        [letterheadKey]: letterheadUrl,
        invoicePaidStampImage: paidStampUrl,
        ...(invoiceLayout ? { [currentLayoutKey]: JSON.stringify(invoiceLayout) } : {}),
    }), [settings, invoiceLayout, letterheadUrl, paidStampUrl, letterheadKey, currentLayoutKey]);

    const saveMutation = useMutation({
        mutationFn: async (data: Record<string, string>) => {
            const res = await apiRequest("PATCH", "/api/clinic-settings", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
            toast({ title: "Settings saved", description: "Your design has been updated." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[70vh] w-full" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/settings">
                    <Button size="icon" variant="ghost">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <Palette className={`w-6 h-6 ${meta.color}`} />
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
                    <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
                </div>
            </div>

            {/* Letterhead & Image Uploads */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        {designerType === "invoice" ? "Letterhead & Stamp" : "Letterhead / Background"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`grid gap-6 ${designerType === "invoice" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Upload a full-page background image (A4 size recommended). This will serve as your letterhead.
                            </p>
                            <ImageUploader
                                label="Letterhead Image"
                                currentUrl={letterheadUrl}
                                onUploaded={(url) => setLetterheadUrl(url)}
                                onRemoved={() => setLetterheadUrl("")}
                                testIdPrefix={`${designerType}-letterhead`}
                                settingKey={letterheadKey}
                            />
                        </div>

                        {designerType === "invoice" && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Upload a custom image for the "PAID" stamp (transparent PNG recommended).
                                </p>
                                <ImageUploader
                                    label="Paid Stamp Image"
                                    currentUrl={paidStampUrl}
                                    onUploaded={(url) => setPaidStampUrl(url)}
                                    onRemoved={() => setPaidStampUrl("")}
                                    testIdPrefix="invoice-stamp"
                                    settingKey="invoicePaidStampImage"
                                />
                            </div>
                        )}
                        {designerType === "invoice" && (
                            <div className="space-y-2">
                                <Label>Row Spacing (px)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="50"
                                    placeholder="Default: 10"
                                    value={localValues["invoiceRowGap"] ?? settings?.invoiceRowGap ?? ""}
                                    onChange={(e) => handleLocalChange("invoiceRowGap", e.target.value)}
                                    onBlur={(e) => handleBlur("invoiceRowGap", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Adjust vertical spacing between invoice table items.</p>
                            </div>
                        )}
                        {designerType === "lab-report" && (
                            <div className="space-y-2">
                                <Label>Row Spacing (px)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="50"
                                    placeholder="Default: 6"
                                    value={localValues["labReportRowGap"] ?? settings?.labReportRowGap ?? ""}
                                    onChange={(e) => handleLocalChange("labReportRowGap", e.target.value)}
                                    onBlur={(e) => handleBlur("labReportRowGap", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Adjust vertical spacing between test results.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Designer */}
            {(designerType === "invoice" || designerType === "purchase-invoice" || designerType === "purchase-order") && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">Select Paper Size</span>
                            <span className="text-xs text-muted-foreground">Customize the layout for A4 and A5 sizes independently.</span>
                        </div>
                        <Select
                            value={invoicePaperSize}
                            onValueChange={(v) => setInvoicePaperSize(v as "a4" | "a5_portrait" | "a5_landscape")}
                        >
                            <SelectTrigger className="w-[280px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="a4">A4 (Standard)</SelectItem>
                                <SelectItem value="a5_portrait">A5 (Portrait)</SelectItem>
                                <SelectItem value="a5_landscape">A5 (Landscape)</SelectItem>
                            </SelectContent>
                        </Select>

                        {designerType === "invoice" && (
                            <>
                                <div className="flex flex-col gap-1 ml-4 border-l pl-4">
                                    <span className="text-sm font-medium">Print Design</span>
                                    <span className="text-xs text-muted-foreground">Select custom design version</span>
                                </div>
                                <Select
                                    value={printDesign}
                                    onValueChange={(v) => setPrintDesign(v as "print1" | "print2" | "print3")}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="print1">Print 1 (Default)</SelectItem>
                                        <SelectItem value="print2">Print 2</SelectItem>
                                        <SelectItem value="print3">Print 3</SelectItem>
                                    </SelectContent>
                                </Select>
                                
                                <Button
                                    variant={(settings?.activePrintDesign || "print1") === printDesign ? "secondary" : "outline"}
                                    disabled={(settings?.activePrintDesign || "print1") === printDesign || saveMutation.isPending}
                                    onClick={() => saveMutation.mutate({ activePrintDesign: printDesign })}
                                    className="ml-2"
                                >
                                    {(settings?.activePrintDesign || "print1") === printDesign ? "Active Design" : "Set Active"}
                                </Button>
                            </>
                        )}

                        <Button
                            variant={
                                (settings?.[designerType === "invoice" && printDesign === "print2" ? "printerType_print2" : designerType === "invoice" && printDesign === "print3" ? "printerType_print3" : "printerType"] || "a4") === (invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize)
                                    ? "secondary"
                                    : "default"
                            }
                            disabled={
                                (settings?.[designerType === "invoice" && printDesign === "print2" ? "printerType_print2" : designerType === "invoice" && printDesign === "print3" ? "printerType_print3" : "printerType"] || "a4") === (invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize) ||
                                saveMutation.isPending
                            }
                            onClick={() => {
                                const newType = invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize;
                                const key = designerType === "invoice" && printDesign === "print2" ? "printerType_print2" : designerType === "invoice" && printDesign === "print3" ? "printerType_print3" : "printerType";
                                saveMutation.mutate({ [key]: newType });
                            }}
                        >
                            {(settings?.[designerType === "invoice" && printDesign === "print2" ? "printerType_print2" : designerType === "invoice" && printDesign === "print3" ? "printerType_print3" : "printerType"] || "a4") === (invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize)
                                ? "Current Default"
                                : "Set as Default"}
                        </Button>
                    </div>

                    <InvoiceDesigner
                        key={`${invoicePaperSize}-${printDesign}`}
                        designerType={designerType as any}
                        canvasPaperSize={invoicePaperSize}
                        printDesign={printDesign}
                        initialLayout={invoiceLayout}
                        layout={invoiceLayout}
                        onLayoutChange={setInvoiceLayout}
                        onSave={(layout) => {
                            setInvoiceLayout(layout);
                            let key = "invoiceLayout";
                            if (designerType === "purchase-invoice") {
                                key = "purchaseInvoiceLayout";
                                if (invoicePaperSize === "a5_portrait") key = "purchaseInvoiceLayout_a5";
                                else if (invoicePaperSize === "a5_landscape") key = "purchaseInvoiceLayout_a5_landscape";
                            } else if (designerType === "purchase-order") {
                                key = "purchaseOrderLayout";
                                if (invoicePaperSize === "a5_portrait") key = "purchaseOrderLayout_a5";
                                else if (invoicePaperSize === "a5_landscape") key = "purchaseOrderLayout_a5_landscape";
                            } else {
                                if (printDesign === "print2") key = "invoiceLayout_print2";
                                else if (printDesign === "print3") key = "invoiceLayout_print3";

                                if (invoicePaperSize === "a5_portrait") key += "_a5";
                                else if (invoicePaperSize === "a5_landscape") key += "_a5_landscape";
                            }
                            saveMutation.mutate({ [key]: JSON.stringify(layout) });
                        }}
                        onSettingsChange={(updates) => saveMutation.mutate(updates)}
                        settings={{
                            ...currentSettings,
                            [letterheadKey]: letterheadUrl,
                        }}
                    />
                </div>
            )}
            {designerType === "lab-report" && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">Select Report Type</span>
                            <span className="text-xs text-muted-foreground">Customize the layout for each report type independently.</span>
                        </div>
                        <Select
                            value={labReportType}
                            onValueChange={(v) => setLabReportType(v as LabReportType)}
                        >
                            <SelectTrigger className="w-[280px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LAB_REPORT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DocumentDesigner
                        config={{
                            ...labReportConfig,
                            title: `${labReportType} Design Studio`,
                            layoutSettingKey: labReportType === DEFAULT_LAB_REPORT_TYPE ? "labReportLayout" : `labReportLayout_${labReportType}`
                        }}
                        key={labReportType} // Force re-render on type change
                        initialLayout={labReportLayout}
                        layout={labReportLayout}
                        onLayoutChange={setLabReportLayout}
                        onSave={(layout) => {
                            setLabReportLayout(layout);
                            const key = labReportType === DEFAULT_LAB_REPORT_TYPE ? "labReportLayout" : `labReportLayout_${labReportType}`;
                            saveMutation.mutate({ [key]: JSON.stringify(layout) });
                        }}
                        settings={currentSettings}
                    />
                </div>
            )}

            {designerType === "medical-report" && (
                <DocumentDesigner
                    config={medicalReportConfig}
                    initialLayout={medicalReportLayout}
                    layout={medicalReportLayout}
                    onLayoutChange={setMedicalReportLayout}
                    onSave={(layout) => {
                        setMedicalReportLayout(layout);
                        saveMutation.mutate({ medicalReportLayout: JSON.stringify(layout) });
                    }}
                    settings={currentSettings}
                />
            )}
        </div>
    );
}

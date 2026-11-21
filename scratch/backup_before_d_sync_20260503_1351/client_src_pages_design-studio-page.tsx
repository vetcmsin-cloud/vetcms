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
        title: "Invoice Design Studio",
        subtitle: "Complete control over your invoice layout, colors, fields, and styling.",
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

    // Dynamic key for invoice background
    let letterheadKey = "invoiceBackgroundImage";
    if (designerType === "invoice") {
        if (invoicePaperSize === "a5_portrait") letterheadKey = "invoiceBackgroundImage_a5";
        else if (invoicePaperSize === "a5_landscape") letterheadKey = "invoiceBackgroundImage_a5_landscape";
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

    // Local state for image uploads
    const [letterheadUrl, setLetterheadUrl] = useState("");
    const [paidStampUrl, setPaidStampUrl] = useState("");

    useEffect(() => {
        if (settings) {
            // Handle Invoice Layout
            let invLayoutKey = "invoiceLayout";
            if (invoicePaperSize === "a5_portrait") invLayoutKey = "invoiceLayout_a5";
            else if (invoicePaperSize === "a5_landscape") invLayoutKey = "invoiceLayout_a5_landscape";

            if (settings[invLayoutKey]) {
                try {
                    const parsed = JSON.parse(settings[invLayoutKey]);
                    setInvoiceLayout(parsed);
                } catch (e) {
                    console.error("Failed to parse invoice layout", e);
                    setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
                }
            } else {
                setInvoiceLayout(CUSTOM_DEFAULT_LAYOUT);
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

            // Load images
            setLetterheadUrl(settings[letterheadKey] || "");
            setPaidStampUrl(settings.invoicePaidStampImage || "");
        }
    }, [settings, letterheadKey, labReportType, invoicePaperSize]);

    const currentSettings = useMemo(() => ({
        ...(settings || {}),
        [letterheadKey]: letterheadUrl,
        invoicePaidStampImage: paidStampUrl,
        ...(invoiceLayout ? { invoiceLayout: JSON.stringify(invoiceLayout) } : {}),
    }), [settings, invoiceLayout, letterheadUrl, paidStampUrl, letterheadKey]);

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
                                    value={settings?.invoiceRowGap || ""}
                                    onChange={(e) => saveMutation.mutate({ invoiceRowGap: e.target.value })}
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
                                    value={settings?.labReportRowGap || ""}
                                    onChange={(e) => saveMutation.mutate({ labReportRowGap: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground mt-1">Adjust vertical spacing between test results.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Designer */}
            {designerType === "invoice" && (
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
                        <Button
                            variant={
                                (settings?.printerType || "a4") === (invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize)
                                    ? "secondary"
                                    : "default"
                            }
                            disabled={
                                (settings?.printerType || "a4") === (invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize) ||
                                saveMutation.isPending
                            }
                            onClick={() => {
                                const newType = invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize;
                                saveMutation.mutate({ printerType: newType });
                            }}
                        >
                            {(settings?.printerType || "a4") === (invoicePaperSize === "a5_portrait" ? "a5" : invoicePaperSize)
                                ? "Current Default"
                                : "Set as Default"}
                        </Button>
                    </div>

                    <InvoiceDesigner
                        key={invoicePaperSize}
                        canvasPaperSize={invoicePaperSize}
                        initialLayout={invoiceLayout}
                        layout={invoiceLayout}
                        onLayoutChange={setInvoiceLayout}
                        onSave={(layout) => {
                            setInvoiceLayout(layout);
                            let key = "invoiceLayout";
                            if (invoicePaperSize === "a5_portrait") key = "invoiceLayout_a5";
                            else if (invoicePaperSize === "a5_landscape") key = "invoiceLayout_a5_landscape";
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

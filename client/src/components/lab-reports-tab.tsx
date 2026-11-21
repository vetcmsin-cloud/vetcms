
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLabReportSchema, LAB_REPORT_CATEGORIES, type LabReport, type InsertLabReport, Pet, Owner, type PetDocument, type BiochemistryData, type LabTest, type LabRefRange } from "@shared/schema";
import { Loader2, Plus, Trash2, FileText, Download, Printer, FileImage, Eye, FolderOpen, Camera, Wifi } from "lucide-react";
import { format } from "date-fns";
import Tesseract from "tesseract.js";
import { formatWhatsAppLink, openWhatsAppLink, formatLocalTimestamp } from "@/lib/utils";
import { generatePDFFromElement } from "@/lib/pdf-generator";
import { FaWhatsapp } from "react-icons/fa";
import { LabReportRenderer } from "./document-designer/LabReportRenderer";
import type { DocumentSection } from "./document-designer/types";
import { VaginalCytologyBuilder } from "./vaginal-cytology-builder";
import { BloodSmearBuilder } from "./blood-smear-builder";
import { WetFilmBuilder } from "./wet-film-builder";

interface LabReportsTabProps {
    petId: number;
    pet: Pet;
    owner: Owner | undefined;
}

export function LabReportsTab({ petId, pet, owner }: LabReportsTabProps) {
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreateReport = hasPermission("medical_records.create");
    const canDeleteReport = hasPermission("medical_records.delete", "admin_dashboard.view");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [printReportId, setPrintReportId] = useState<number | null>(null);
    const [whatsappReportId, setWhatsappReportId] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);

    const { data: reports, isLoading } = useQuery<LabReport[]>({
        queryKey: [`/api/pets/${petId}/lab-reports`],
    });

    const { data: settings } = useQuery<Record<string, string>>({
        queryKey: ["/api/clinic-settings"],
    });

    const { data: allLabTests } = useQuery<LabTest[]>({
        queryKey: ["/api/lab-settings/tests"],
    });

    const { data: allLabRefRanges } = useQuery<LabRefRange[]>({
        queryKey: ["/api/lab-settings/ranges"],
    });

    // Helper to get dynamic reference range based on species
    const getDynamicRefRange = (rowKey: string, rowLabel: string, defaultRange: string) => {
        if (!allLabTests || !allLabRefRanges || !pet?.species) return defaultRange;

        const cleanKey = rowKey.replace(/^bio_/, '').toLowerCase().trim();
        const cleanLabelPrefix = rowLabel.split('(')[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '');

        const test = allLabTests.find(t => {
            const tName = t.name.toLowerCase().trim();
            const tClean = t.name.replace(/\s*\(.*?\)\s*/g, '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            return (
                tName === rowLabel.toLowerCase().trim() ||
                tName === cleanKey ||
                tName === rowKey.toLowerCase().trim() ||
                tName.startsWith(cleanKey) ||
                tClean === cleanLabelPrefix ||
                tName === rowLabel.toLowerCase().split(' ')[0]
            );
        });

        if (test) {
            const range = allLabRefRanges.find(r =>
                r.testId === test.id &&
                r.species.toLowerCase() === pet.species!.toLowerCase()
            );

            if (range) {
                if (range.min && range.max) return `${range.min} - ${range.max}`;
                if (range.refText) return range.refText;
            }
        }
        return defaultRange;
    };

    const form = useForm<InsertLabReport>({
        resolver: zodResolver(insertLabReportSchema),
        defaultValues: {
            petId,
            date: format(new Date(), "yyyy-MM-dd"),
            category: LAB_REPORT_CATEGORIES[0],
            title: "",
            result: "",
            notes: "",
            fileUrl: "",
            details: {},
        },
    });

    const category = form.watch("category");

    const createMutation = useMutation({
        mutationFn: async (data: InsertLabReport) => {
            const res = await apiRequest("POST", "/api/lab-reports", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/pets/${petId}/lab-reports`] });
            toast({ title: "Report added successfully" });
            setIsDialogOpen(false);
            form.reset({
                petId,
                date: format(new Date(), "yyyy-MM-dd"),
                category: LAB_REPORT_CATEGORIES[0],
                title: "",
                result: "",
                notes: "",
                fileUrl: "",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to add report",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/lab-reports/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/pets/${petId}/lab-reports`] });
            toast({ title: "Report deleted" });
        },
    });

    const onSubmit = (data: InsertLabReport) => {
        createMutation.mutate(data);
    };

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

            for (const [machineKey, formKey] of Object.entries(fieldMap)) {
                if (machineData[machineKey]) {
                    form.setValue(`details.${formKey}` as any, machineData[machineKey], { shouldDirty: true });
                    findings++;
                }
            }

            if (result.sampleId) {
                form.setValue("title", `CBC - Sample ${result.sampleId}`, { shouldDirty: true });
            }

            if (findings > 0) {
                toast({
                    title: "✅ Machine Data Received",
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
        enabled: isDialogOpen, // Only fetch when the dialog is open
    });
    // ---- OCR Image Scan (Fallback) ----
    const handleCbcImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        toast({ title: "Scanning image...", description: "Please wait, this might take a few seconds." });

        try {
            // ---- High-precision OCR preprocessing ----
            const imgBitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            // Upscale image (3×) for better OCR accuracy
            const scale = 3;
            canvas.width = imgBitmap.width * scale;
            canvas.height = imgBitmap.height * scale;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

            // Advanced preprocessing: grayscale + contrast + threshold
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                // Weighted grayscale (luminosity method)
                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                // Increase contrast
                const contrast = 1.5;
                const adjusted = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
                // Binary threshold for clean text
                const final = adjusted > 140 ? 255 : 0;
                d[i] = d[i + 1] = d[i + 2] = final;
            }
            ctx.putImageData(imgData, 0, 0);

            const processedBlob: Blob = await new Promise(resolve => canvas.toBlob(resolve as any, 'image/png'));
            const processedFile = new File([processedBlob], file.name, { type: 'image/png' });

            // IMPORTANT: Do NOT use character whitelist — it strips parameter names!
            // Use PSM 6 (assume uniform block of text) for tabular data
            const result = await Tesseract.recognize(processedFile, 'eng', {
                logger: m => console.log(m),
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
                            if (/^(10|\d+)\^/i.test(nextToken)) continue; // skip units like "10^3/uL"
                            if (/^[a-z\/]+$/i.test(nextToken) && !/^[0-9]/.test(nextToken)) continue; // skip pure text

                            if (/^[0-9]+(\.[0-9]+)?$/.test(nextToken)) {
                                form.setValue(`details.${key}` as any, nextToken, { shouldDirty: true });
                                findings++;
                                extractedKeys.add(key);
                                break;
                            }
                        }
                    }
                }
            }

            if (findings > 0) {
                toast({ title: "Scan Complete", description: `Successfully extracted ${findings} values.` });
            } else {
                toast({ title: "Scan Complete", description: "Could not identify any valid CBC values from the image. Try using 'Receive from Machine' for better accuracy.", variant: "destructive" });
            }

        } catch (error) {
            console.error("OCR Error:", error);
            toast({ title: "Error", description: "Failed to read image. Please try again.", variant: "destructive" });
        } finally {
            setIsScanning(false);
            if (e.target) e.target.value = ''; // reset file input
        }
    };



    const reportToPrint = useMemo(() => {
        return reports?.find(r => r.id === (printReportId || whatsappReportId));
    }, [reports, printReportId, whatsappReportId]);

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

        // Default layout for Reproductive reports so the Cycle Timeline panel always appears in-flow
        if (reportToPrint.category === "Reproductive") {
            return [
                { id: "customer_details_default", type: "panel", isVisible: true, label: "Customer / Patient Details", panelKey: "customer_details", x: 40, y: 20, width: 714, height: 200 },
                { id: "evc_panel_default", type: "panel", isVisible: true, label: "Vaginal Cytology (EVC)", panelKey: "evc_panel", x: 40, y: 240, width: 714, height: 320, position: "body" },
                { id: "progesterone_panel_default", type: "panel", isVisible: true, label: "Progesterone Assay", panelKey: "progesterone_panel", x: 40, y: 580, width: 714, height: 250, position: "body" },
                { id: "summary_default", type: "field", field: "summary", isVisible: true, label: "Summary / Conclusion", position: "body", x: 40, y: 840, width: 714, height: 120 },
                { id: "cycle_timeline_panel_default", type: "panel", isVisible: true, label: "Cycle Timeline", panelKey: "cycle_timeline_panel", x: 40, y: 970, width: 714, height: 140, position: "body" },
                { id: "notes_default", type: "field", field: "notes", isVisible: true, label: "Notes", position: "body", x: 40, y: 1120, width: 714, height: 80 },
            ];
        }

        return undefined;
    }, [reportToPrint, settings]);

    const handlePrint = (reportId: number) => {
        setPrintReportId(reportId);
    };

    const handleWhatsAppShare = (report: LabReport, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!owner || !owner.phone) {
            toast({
                title: "WhatsApp Share Failed",
                description: "Owner phone number not found for this patient.",
                variant: "destructive"
            });
            return;
        }

        const clinicName = settings?.clinicName || "PetPoint Pro Veterinary Clinic";
        const reportDate = formatLocalTimestamp(report.createdAt || report.date);
        const ownerFullName = `${owner.firstName} ${owner.lastName || ""}`.trim();
        const petName = pet?.name || "Patient";
        const categoryFormatted = report.category || "General";
        const statusFormatted = report.status ? report.status.toUpperCase() : "COMPLETED";

        const template = settings?.whatsappLabReportTemplate;
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

        const mode = settings?.whatsappMode || "direct";
        const countryCode = settings?.whatsappCountryCode || "91";

        if (mode === "ultramsg" || mode === "evolution" || mode === "direct") {
            setWhatsappReportId(report.id);
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
                    setWhatsappReportId(null);
                }
            }, 800);
            return;
        }
    };

    useEffect(() => {
        if (printReportId && reportToPrint) {
            // Small delay to ensure render
            const timer = setTimeout(() => {
                window.print();
                // We keep the state to allow re-printing if needed, or we could reset it. 
                // Resetting it might cause the content to disappear before print dialog closes in some browsers.
                // Better to leave it or provide a way to close print mode if it was a modal. 
                // Since it's hidden, it doesn't matter much, but let's reset on next interaction or just leave it.
                // Actually, if we reset it immediately, the print preview might be empty.
                // Let's reset it after a longer delay or just let the user click print again which will set it again.
                // However, if the user cancels print and clicks another, it works.
                setPrintReportId(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [printReportId, reportToPrint]);


    const groupedReports = reports?.reduce((acc, report) => {
        if (!acc[report.category]) acc[report.category] = [];
        acc[report.category].push(report);
        return acc;
    }, {} as Record<string, LabReport[]>) || {};

    const { data: documents = [] } = useQuery<PetDocument[]>({
        queryKey: [`/api/pet-documents/${petId}`],
    });

    const labDocuments = useMemo(() => {
        return documents.filter(d => d.category === "Lab Result" || d.category === "X-Ray");
    }, [documents]);

    const activeCategories = useMemo(() => {
        const categories = new Set<string>();
        if (reports) reports.forEach(r => categories.add(r.category));
        labDocuments.forEach(d => categories.add(d.category || "General"));
        return Array.from(categories);
    }, [reports, labDocuments]);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
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
            {(printReportId || whatsappReportId) && reportToPrint && owner && createPortal(
                <div id="printable-lab-report-container" className="fixed -left-[2000px] print:left-0">
                    <LabReportRenderer
                        settings={settings || {}}
                        report={reportToPrint}
                        pet={pet}
                        owner={owner}
                        layout={labReportLayout}
                    />
                </div>,
                document.body
            )}

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Laboratory</h3>
                {canCreateReport && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Report
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add Lab Report</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Category</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {LAB_REPORT_CATEGORIES.map(cat => (
                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                            ))}
                                                            <SelectItem value="Hematology & Blood Chemistry">Hematology & Blood Chemistry</SelectItem>
                                                            <SelectItem value="Blood Chemistry">Blood Chemistry</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
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
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Report Title</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Annual Blood Work" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {(category === "Hematology" || category === "Hematology & Blood Chemistry") && (
                                        <div className="border p-4 rounded-md space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold text-sm uppercase">CBC PANEL</h4>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="environment"
                                                        className="hidden"
                                                        id="cbc-camera-upload"
                                                        onChange={handleCbcImageUpload}
                                                    />
                                                    <DropdownMenu onOpenChange={(open) => {
                                                        if (open) fetchRecentMindray();
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

                                                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('cbc-camera-upload')?.click()} disabled={isScanning}>
                                                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                                                        Scan CBC (Photo)
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                {["wbc", "rbc", "hb", "pcv", "mcv", "mch", "mchc", "platelet", "neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils"].map(field => (
                                                    <FormField
                                                        key={field}
                                                        control={form.control}
                                                        name={`details.${field}` as any}
                                                        render={({ field: detailField }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-xs uppercase">{field}</FormLabel>
                                                                <FormControl>
                                                                    <Input className="h-8 text-sm" {...detailField} value={detailField.value || ""} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-muted">
                                                <FormField
                                                    control={form.control}
                                                    name="details.bloodSmear"
                                                    render={({ field: detailField }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text-xs uppercase">Blood Smear Test</FormLabel>
                                                            <FormControl>
                                                                <BloodSmearBuilder
                                                                    value={(detailField.value as string) || ""}
                                                                    onChange={detailField.onChange}
                                                                    petSpecies={pet?.species}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="details.wetFilm"
                                                    render={({ field: detailField }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text-xs uppercase">Wet Film Test</FormLabel>
                                                            <FormControl>
                                                                <WetFilmBuilder
                                                                    value={(detailField.value as string) || ""}
                                                                    onChange={detailField.onChange}
                                                                    petSpecies={pet?.species}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {(category === "Blood Chemistry" || category === "Hematology & Blood Chemistry") && (
                                        <div className="border p-4 rounded-md space-y-4">
                                            <h4 className="font-semibold text-sm uppercase">Blood Chemistry Details</h4>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                {["ast", "alt", "alp", "ggt", "totalBilirubin", "totalProtein", "albumin", "globulin", "cholesterol", "triglyceride", "creatinine", "urea", "amylase", "lipase", "ck", "calcium", "phosphorus", "magnesium", "sodium", "potassium", "chloride", "glucose"].map(field => (
                                                    <FormField
                                                        key={field}
                                                        control={form.control}
                                                        name={`details.${field}` as any}
                                                        render={({ field: detailField }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-xs uppercase">{field.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                                                                <FormControl>
                                                                    <Input className="h-8 text-sm" {...detailField} value={detailField.value || ""} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {category === "Biochemistry" && (
                                        <div className="border p-4 rounded-md space-y-4">
                                            <h4 className="font-semibold text-sm uppercase">Biochemistry Details</h4>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
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
                                                    <FormField
                                                        key={key}
                                                        control={form.control}
                                                        name={`details.${key}` as any}
                                                        render={({ field: detailField }) => (
                                                            <FormItem className="space-y-1">
                                                                <FormLabel className="text-xs">{label}</FormLabel>
                                                                <FormControl>
                                                                    <Input className="h-8 text-sm" {...detailField} value={detailField.value || ""} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {category === "Reproductive" && (
                                        <div className="border p-4 rounded-md space-y-4 border-rose-200 bg-rose-50/30">
                                            <h4 className="font-semibold text-sm uppercase text-rose-800">
                                                {form.watch("title")?.includes("Progesterone") && !form.watch("title")?.includes("EVC") && !form.watch("title")?.includes("Vaginal Cytology") 
                                                    ? "Progesterone Assay"
                                                    : form.watch("title")?.includes("EVC") || form.watch("title")?.includes("Vaginal Cytology")
                                                    ? "Vaginal Cytology (EVC)"
                                                    : "Reproductive Test"}
                                            </h4>
                                            <VaginalCytologyBuilder
                                                value={(form.watch("details") as Record<string, string>) || {}}
                                                onChange={(newVals) => {
                                                    const cur = form.getValues("details") as Record<string, string> || {};
                                                    form.setValue("details" as any, { ...cur, ...newVals });
                                                }}
                                                reportTitle={form.watch("title")}
                                            />
                                        </div>
                                    )}
                                    <FormField
                                        control={form.control}
                                        name="result"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Summary / Conclusion</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Overall result interpretation..." {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Additional notes..." {...field} value={field.value || ""} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="fileUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Attachment URL (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} value={field.value || ""} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="pt-2 flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit" disabled={createMutation.isPending}>
                                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Add Report
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {activeCategories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No generated reports found.</p>
                </div>
            ) : (
                <Accordion type="multiple" defaultValue={activeCategories} className="w-full">
                    {activeCategories.map((category) => (
                        <AccordionItem key={category} value={category}>
                            <AccordionTrigger className="text-base font-semibold px-4 hover:bg-muted/50 rounded-lg">
                                {category}
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    {(groupedReports[category]?.length || 0) + (labDocuments.filter(d => d.category === category).length || 0)}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 px-2">
                                <div className="grid gap-4">
                                    {groupedReports[category] && groupedReports[category]!.sort((a, b) => b.date.localeCompare(a.date)).map((report) => (
                                        <Card key={report.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                                            {report.title}
                                                            <span className="text-sm font-normal text-muted-foreground">
                                                                - {format(new Date(report.date), "PPP")} {report.createdAt && `at ${new Date(report.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}`}
                                                            </span>
                                                        </CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-1 -mt-2">
                                                        {canDeleteReport && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                onClick={() => setDeleteConfirmId(report.id)}
                                                                disabled={deleteMutation.isPending && deleteMutation.variables === report.id}
                                                                title="Delete lab report"
                                                            >
                                                                {deleteMutation.isPending && deleteMutation.variables === report.id
                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                    : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all rounded-full h-8 w-8"
                                                            onClick={(e) => handleWhatsAppShare(report, e)}
                                                            title="Share report on WhatsApp"
                                                        >
                                                            <FaWhatsapp className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handlePrint(report.id)}
                                                            title="Print report"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="text-sm space-y-2">
                                                <div>
                                                    <span className="font-semibold">Result: </span>
                                                    {report.result}
                                                </div>
                                                {report.category === "Hematology" && report.details && (() => {
                                                    const d = report.details as any;
                                                    return (
                                                        <div className="space-y-4 mt-2">
                                                            <div>
                                                                <h5 className="font-semibold text-xs uppercase tracking-wider mb-2">CBC PANEL</h5>
                                                                <div className="border rounded-md overflow-hidden">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="bg-muted/50">
                                                                                <th className="text-left p-2 font-semibold">Parameter</th>
                                                                                <th className="text-left p-2 font-semibold">Result</th>
                                                                                <th className="text-left p-2 font-semibold">Unit</th>
                                                                                <th className="text-left p-2 font-semibold">Reference Range</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {[
                                                                                { key: "hb", label: "Hemoglobin (Hb)", unit: "% (g/dL)", ref: "14 - 20" },
                                                                                { key: "pcv", label: "PCV (HCT)", unit: "%", ref: "40 - 56" },
                                                                                { key: "rbc", label: "RBC", unit: "×10⁶/μL", ref: "5.7 - 8.3" },
                                                                                { key: "mcv", label: "MCV", unit: "fL", ref: "64 - 74" },
                                                                                { key: "mch", label: "MCH", unit: "pg", ref: "22 - 26" },
                                                                                { key: "mchc", label: "MCHC", unit: "% (g/dL)", ref: "33 - 38" },
                                                                                { key: "wbc", label: "WBC", unit: "×10³/μL", ref: "5.0 - 13" },
                                                                                { key: "neutrophils", label: "Neutrophils", unit: "%", ref: "68%" },
                                                                                { key: "lymphocytes", label: "Lymphocytes", unit: "%", ref: "26%" },
                                                                                { key: "monocytes", label: "Monocytes", unit: "%", ref: "6%" },
                                                                                { key: "eosinophils", label: "Eosinophils", unit: "%", ref: "2 - 10" },
                                                                                { key: "basophils", label: "Basophils", unit: "%", ref: "0 - 1" },
                                                                                { key: "platelet", label: "Platelet Count", unit: "×10³/μL", ref: "134 - 396" },
                                                                            ].filter(row => d[row.key] !== undefined && d[row.key] !== "").map((row) => (
                                                                                <tr key={row.key} className="border-t border-muted/30">
                                                                                    <td className="p-2">{row.label}</td>
                                                                                    <td className="p-2 font-medium">{d[row.key]}</td>
                                                                                    <td className="p-2 text-muted-foreground">{row.unit}</td>
                                                                                    <td className="p-2 text-muted-foreground">{getDynamicRefRange(row.key, row.label, row.ref)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                {d.bloodSmear && (
                                                                    <div className="mt-4">
                                                                        <h6 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Blood Smear Test</h6>
                                                                        <div className="p-3 bg-muted/40 border rounded-md text-sm whitespace-pre-wrap">{d.bloodSmear}</div>
                                                                    </div>
                                                                )}
                                                                {d.wetFilm && (
                                                                    <div className="mt-3">
                                                                        <h6 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Wet Film Test</h6>
                                                                        <div className="p-3 bg-muted/40 border rounded-md text-sm whitespace-pre-wrap">{d.wetFilm}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {report.category === "Biochemistry" && report.details && (() => {
                                                    const d = report.details as any;
                                                    return (
                                                        <div className="space-y-4 mt-2">
                                                            <div>
                                                                <h5 className="font-semibold text-xs uppercase tracking-wider mb-2">Biochemistry Panel</h5>
                                                                <div className="border rounded-md overflow-hidden">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="bg-muted/50">
                                                                                <th className="text-left p-2 font-semibold">Parameter</th>
                                                                                <th className="text-left p-2 font-semibold">Result</th>
                                                                                <th className="text-left p-2 font-semibold">Unit</th>
                                                                                <th className="text-left p-2 font-semibold">Reference Range</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {[
                                                                                { key: "bio_ast", label: "AST (SGOT)", unit: "U/L", ref: "23 - 66" },
                                                                                { key: "bio_alt", label: "ALT (SGPT)", unit: "U/L", ref: "21 - 102" },
                                                                                { key: "bio_alp", label: "ALP", unit: "U/L", ref: "20 - 156" },
                                                                                { key: "bio_ggt", label: "GGT", unit: "U/L", ref: "1.2 - 6.4" },
                                                                                { key: "bio_totalBilirubin", label: "Total Bilirubin", unit: "mg/dL", ref: "0.10 - 0.50" },
                                                                                { key: "bio_totalProtein", label: "Total Protein", unit: "g/dL", ref: "5.4 - 7.1" },
                                                                                { key: "bio_albumin", label: "Albumin", unit: "g/dL", ref: "2.6 - 3.3" },
                                                                                { key: "bio_globulin", label: "Globulin", unit: "g/dL", ref: "2.7 - 4.4" },
                                                                                { key: "bio_cholesterol", label: "Cholesterol", unit: "mg/dL", ref: "135 - 270" },
                                                                                { key: "bio_triglyceride", label: "Triglyceride", unit: "mg/dL", ref: "20 - 112" },
                                                                                { key: "bio_creatinine", label: "Creatinine", unit: "mg/dL", ref: "0.5 - 1.5" },
                                                                                { key: "bio_urea", label: "Urea (BUN)", unit: "mg/dL", ref: "10 - 28" },
                                                                                { key: "bio_amylase", label: "Amylase", unit: "U/L", ref: "185 - 700" },
                                                                                { key: "bio_lipase", label: "Lipase", unit: "U/L", ref: "13 - 200" },
                                                                                { key: "bio_ck", label: "CK (CPK)", unit: "U/L", ref: "< 400" },
                                                                                { key: "bio_calcium", label: "Calcium", unit: "mg/dL", ref: "9.0 - 11.3" },
                                                                                { key: "bio_phosphorus", label: "Phosphorus", unit: "mg/dL", ref: "2.6 - 6.2" },
                                                                                { key: "bio_magnesium", label: "Magnesium", unit: "mg/dL", ref: "1.8 - 2.4" },
                                                                                { key: "bio_sodium", label: "Sodium", unit: "mEq/L", ref: "141 - 152" },
                                                                                { key: "bio_potassium", label: "Potassium", unit: "mEq/L", ref: "4.4 - 5.3" },
                                                                                { key: "bio_chloride", label: "Chloride", unit: "mEq/L", ref: "105 - 115" },
                                                                                { key: "bio_glucose", label: "Glucose", unit: "mg/dL", ref: "65 - 118" }
                                                                            ].map((row) => (
                                                                                <tr key={row.key} className="border-t border-muted/30">
                                                                                    <td className="p-2">{row.label}</td>
                                                                                    <td className="p-2 font-medium">{d[row.key] || "–"}</td>
                                                                                    <td className="p-2 text-muted-foreground">{row.unit}</td>
                                                                                    <td className="p-2 text-muted-foreground">{getDynamicRefRange(row.key, row.label, row.ref)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}


                                                {report.category === "Blood Chemistry" && report.details && (() => {
                                                    const d = report.details as any;
                                                    return (
                                                        <div className="space-y-4 mt-2">
                                                            <div>
                                                                <h5 className="font-semibold text-xs uppercase tracking-wider mb-2">Blood Chemistry Panel</h5>
                                                                <div className="border rounded-md overflow-hidden">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="bg-muted/50">
                                                                                <th className="text-left p-2 font-semibold">Parameter</th>
                                                                                <th className="text-left p-2 font-semibold">Result</th>
                                                                                <th className="text-left p-2 font-semibold">Unit</th>
                                                                                <th className="text-left p-2 font-semibold">Reference Range</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {[
                                                                                { key: "ast", label: "AST (SGOT)", unit: "U/L", ref: "23 - 66" },
                                                                                { key: "alt", label: "ALT (SGPT)", unit: "U/L", ref: "21 - 102" },
                                                                                { key: "alp", label: "ALP", unit: "U/L", ref: "20 - 156" },
                                                                                { key: "ggt", label: "GGT", unit: "U/L", ref: "1.2 - 6.4" },
                                                                                { key: "totalBilirubin", label: "Total Bilirubin", unit: "mg/dL", ref: "0.10 - 0.50" },
                                                                                { key: "totalProtein", label: "Total Protein", unit: "g/dL", ref: "5.4 - 7.1" },
                                                                                { key: "albumin", label: "Albumin", unit: "g/dL", ref: "2.6 - 3.3" },
                                                                                { key: "globulin", label: "Globulin", unit: "g/dL", ref: "2.7 - 4.4" },
                                                                                { key: "cholesterol", label: "Cholesterol", unit: "mg/dL", ref: "135 - 270" },
                                                                                { key: "triglyceride", label: "Triglyceride", unit: "mg/dL", ref: "20 - 112" },
                                                                                { key: "creatinine", label: "Creatinine", unit: "mg/dL", ref: "0.5 - 1.5" },
                                                                                { key: "urea", label: "Urea (BUN)", unit: "mg/dL", ref: "10 - 28" },
                                                                                { key: "amylase", label: "Amylase", unit: "U/L", ref: "185 - 700" },
                                                                                { key: "lipase", label: "Lipase", unit: "U/L", ref: "13 - 200" },
                                                                                { key: "ck", label: "CK (CPK)", unit: "U/L", ref: "< 400" },
                                                                                { key: "calcium", label: "Calcium", unit: "mg/dL", ref: "9.0 - 11.3" },
                                                                                { key: "phosphorus", label: "Phosphorus", unit: "mg/dL", ref: "2.6 - 6.2" },
                                                                                { key: "magnesium", label: "Magnesium", unit: "mg/dL", ref: "1.8 - 2.4" },
                                                                                { key: "sodium", label: "Sodium", unit: "mEq/L", ref: "141 - 152" },
                                                                                { key: "potassium", label: "Potassium", unit: "mEq/L", ref: "4.4 - 5.3" },
                                                                                { key: "chloride", label: "Chloride", unit: "mEq/L", ref: "105 - 115" },
                                                                                { key: "glucose", label: "Glucose", unit: "mg/dL", ref: "65 - 118" }
                                                                            ].map((row) => (
                                                                                <tr key={row.key} className="border-t border-muted/30">
                                                                                    <td className="p-2">{row.label}</td>
                                                                                    <td className="p-2 font-medium">{d[row.key] || "–"}</td>
                                                                                    <td className="p-2 text-muted-foreground">{row.unit}</td>
                                                                                    <td className="p-2 text-muted-foreground">{getDynamicRefRange(row.key, row.label, row.ref)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {report.category === "Hematology & Blood Chemistry" && report.details && (() => {
                                                    const d = report.details as any;
                                                    const hasHematology = d.rbc || d.hb || d.pcv || d.wbc || d.platelet || d.mcv || d.mch || d.mchc || d.neutrophils || d.lymphocytes || d.monocytes || d.eosinophils || d.basophils || d.bloodSmear || d.wetFilm;
                                                    const hasChemistry = d.glucose || d.urea || d.creatinine || d.alt || d.ast || d.alp || d.totalProtein || d.albumin || d.globulin || d.totalBilirubin || d.sodium || d.potassium || d.chloride || d.calcium || d.phosphorus || d.ggt || d.cholesterol || d.triglyceride || d.amylase || d.lipase || d.ck || d.magnesium;
                                                    if (!hasHematology && !hasChemistry) return null;
                                                    return (
                                                        <div className="space-y-4 mt-2">
                                                            {hasHematology && (
                                                                <div>
                                                                    <h5 className="font-semibold text-xs uppercase tracking-wider mb-2">CBC PANEL</h5>
                                                                    <div className="border rounded-md overflow-hidden">
                                                                        <table className="w-full text-xs">
                                                                            <thead>
                                                                                <tr className="bg-muted/50">
                                                                                    <th className="text-left p-2 font-semibold">Parameter</th>
                                                                                    <th className="text-left p-2 font-semibold">Result</th>
                                                                                    <th className="text-left p-2 font-semibold">Unit</th>
                                                                                    <th className="text-left p-2 font-semibold">Reference Range</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {[
                                                                                    { key: "hb", label: "Hemoglobin (Hb)", unit: "% (g/dL)", ref: "14 - 20" },
                                                                                    { key: "pcv", label: "PCV (HCT)", unit: "%", ref: "40 - 56" },
                                                                                    { key: "rbc", label: "RBC", unit: "×10⁶/μL", ref: "5.7 - 8.3" },
                                                                                    { key: "mcv", label: "MCV", unit: "fL", ref: "64 - 74" },
                                                                                    { key: "mch", label: "MCH", unit: "pg", ref: "22 - 26" },
                                                                                    { key: "mchc", label: "MCHC", unit: "% (g/dL)", ref: "33 - 38" },
                                                                                    { key: "wbc", label: "WBC", unit: "×10³/μL", ref: "5.0 - 13" },
                                                                                    { key: "neutrophils", label: "Neutrophils", unit: "%", ref: "68%" },
                                                                                    { key: "lymphocytes", label: "Lymphocytes", unit: "%", ref: "26%" },
                                                                                    { key: "monocytes", label: "Monocytes", unit: "%", ref: "6%" },
                                                                                    { key: "eosinophils", label: "Eosinophils", unit: "%", ref: "2 - 10" },
                                                                                    { key: "basophils", label: "Basophils", unit: "%", ref: "0 - 1" },
                                                                                    { key: "platelet", label: "Platelet Count", unit: "×10³/μL", ref: "134 - 396" },
                                                                                ].filter(row => d[row.key] !== undefined && d[row.key] !== "").map((row) => (
                                                                                    <tr key={row.key} className="border-t border-muted/30">
                                                                                        <td className="p-2">{row.label}</td>
                                                                                        <td className="p-2 font-medium">{d[row.key]}</td>
                                                                                        <td className="p-2 text-muted-foreground">{row.unit}</td>
                                                                                        <td className="p-2 text-muted-foreground">{getDynamicRefRange(row.key, row.label, row.ref)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                    {d.bloodSmear && (
                                                                        <div className="mt-4">
                                                                            <h6 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Blood Smear Test</h6>
                                                                            <div className="p-3 bg-muted/40 border rounded-md text-sm whitespace-pre-wrap">{d.bloodSmear}</div>
                                                                        </div>
                                                                    )}
                                                                    {d.wetFilm && (
                                                                        <div className="mt-3">
                                                                            <h6 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Wet Film Test</h6>
                                                                            <div className="p-3 bg-muted/40 border rounded-md text-sm whitespace-pre-wrap">{d.wetFilm}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {hasChemistry && (
                                                                <div>
                                                                    <h5 className="font-semibold text-xs uppercase tracking-wider mb-2">Blood Chemistry Panel</h5>
                                                                    <div className="border rounded-md overflow-hidden">
                                                                        <table className="w-full text-xs">
                                                                            <thead>
                                                                                <tr className="bg-muted/50">
                                                                                    <th className="text-left p-2 font-semibold">Parameter</th>
                                                                                    <th className="text-left p-2 font-semibold">Result</th>
                                                                                    <th className="text-left p-2 font-semibold">Unit</th>
                                                                                    <th className="text-left p-2 font-semibold">Reference Range</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {[
                                                                                    { key: "ast", label: "AST (SGOT)", unit: "U/L", ref: "23 - 66" },
                                                                                    { key: "alt", label: "ALT (SGPT)", unit: "U/L", ref: "21 - 102" },
                                                                                    { key: "alp", label: "ALP", unit: "U/L", ref: "20 - 156" },
                                                                                    { key: "ggt", label: "GGT", unit: "U/L", ref: "1.2 - 6.4" },
                                                                                    { key: "totalBilirubin", label: "Total Bilirubin", unit: "mg/dL", ref: "0.10 - 0.50" },
                                                                                    { key: "totalProtein", label: "Total Protein", unit: "g/dL", ref: "5.4 - 7.1" },
                                                                                    { key: "albumin", label: "Albumin", unit: "g/dL", ref: "2.6 - 3.3" },
                                                                                    { key: "globulin", label: "Globulin", unit: "g/dL", ref: "2.7 - 4.4" },
                                                                                    { key: "cholesterol", label: "Cholesterol", unit: "mg/dL", ref: "135 - 270" },
                                                                                    { key: "triglyceride", label: "Triglyceride", unit: "mg/dL", ref: "20 - 112" },
                                                                                    { key: "creatinine", label: "Creatinine", unit: "mg/dL", ref: "0.5 - 1.5" },
                                                                                    { key: "urea", label: "Urea (BUN)", unit: "mg/dL", ref: "10 - 28" },
                                                                                    { key: "amylase", label: "Amylase", unit: "U/L", ref: "185 - 700" },
                                                                                    { key: "lipase", label: "Lipase", unit: "U/L", ref: "13 - 200" },
                                                                                    { key: "ck", label: "CK (CPK)", unit: "U/L", ref: "< 400" },
                                                                                    { key: "calcium", label: "Calcium", unit: "mg/dL", ref: "9.0 - 11.3" },
                                                                                    { key: "phosphorus", label: "Phosphorus", unit: "mg/dL", ref: "2.6 - 6.2" },
                                                                                    { key: "magnesium", label: "Magnesium", unit: "mg/dL", ref: "1.8 - 2.4" },
                                                                                    { key: "sodium", label: "Sodium", unit: "mEq/L", ref: "141 - 152" },
                                                                                    { key: "potassium", label: "Potassium", unit: "mEq/L", ref: "4.4 - 5.3" },
                                                                                    { key: "chloride", label: "Chloride", unit: "mEq/L", ref: "105 - 115" },
                                                                                    { key: "glucose", label: "Glucose", unit: "mg/dL", ref: "65 - 118" }
                                                                                ].map((row) => (
                                                                                    <tr key={row.key} className="border-t border-muted/30">
                                                                                        <td className="p-2">{row.label}</td>
                                                                                        <td className="p-2 font-medium">{d[row.key] || "–"}</td>
                                                                                        <td className="p-2 text-muted-foreground">{row.unit}</td>
                                                                                        <td className="p-2 text-muted-foreground">{getDynamicRefRange(row.key, row.label, row.ref)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                {report.notes && (
                                                    <div className="bg-muted/50 p-3 rounded-md text-muted-foreground whitespace-pre-wrap">
                                                        {report.notes}
                                                    </div>
                                                )}
                                                {report.fileUrl && (
                                                    <div className="pt-2">
                                                        <a
                                                            href={report.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center text-primary hover:underline gap-1"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                            View Attachment
                                                        </a>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {/* Render Documents for this category */}
                                    {labDocuments.filter(d => d.category === category).map((doc) => (
                                        <Card key={doc.id} className="overflow-hidden group relative">
                                            <div className="flex items-start p-3 gap-3">
                                                <div className="h-12 w-12 bg-muted rounded flex items-center justify-center shrink-0">
                                                    {doc.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                                                        <img
                                                            src={doc.fileUrl}
                                                            alt={doc.fileName}
                                                            className="w-full h-full object-cover rounded"
                                                        />
                                                    ) : (
                                                        <FileImage className="w-6 h-6 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                            onClick={() => window.open(doc.fileUrl, '_blank')}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                                    </p>
                                                    {doc.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.notes}</p>}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}

                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lab Report?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the lab report and all its results. This action cannot be undone.
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
        </div>
    );
}


import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { InvoiceSection, InvoiceFieldKey } from "./types";
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
import { QRCodeSVG } from "qrcode.react";

// Helper to format currency
function formatCurrency(amount: any) {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return `\u20B9${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to format date
function formatDate(dateStr: any) {
    if (!dateStr) return "";
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

interface InvoiceRendererProps {
    settings: Record<string, string>;
    invoice: any; // The full invoice object
    layout?: InvoiceSection[]; // The customized layout
    className?: string; // For print preview scaling
}

// Footer fields that should only appear on the last page
const FOOTER_FIELDS: InvoiceFieldKey[] = [
    "subtotal", "total", "bankName", "upiId", "upiPhone", "clinicPhone", "terms"
];

const FOOTER_SECTIONS: string[] = [
    "totals", "payment", "footer", "stamp"
];

export function InvoiceRenderer({ settings, invoice, layout, className }: InvoiceRendererProps) {
    const effectivePrinterType = settings.printerType || "a4";
    const isA5 = effectivePrinterType.startsWith("a5");
    const isA5Landscape = effectivePrinterType === "a5_landscape";

    let bgImage = settings.invoiceBackgroundImage;
    if (isA5) {
        if (isA5Landscape && settings.invoiceBackgroundImage_a5_landscape) {
            bgImage = settings.invoiceBackgroundImage_a5_landscape;
        } else if (settings.invoiceBackgroundImage_a5) {
            // fallback to portrait a5 if landscape bg is missing, or just normal a5
            // Actually, if it's landscape and has no landscape bg, it'll fallback to a5_portrait bg, then a4.
            bgImage = settings.invoiceBackgroundImage_a5;
        }
    }

    const maxRows = parseInt(settings.invoiceMaxRows || "0") || 1000; // Default to effectively unlimited

    const sections: InvoiceSection[] = useMemo(() => {
        if (layout) return layout;
        try {
            let layoutStr = settings.invoiceLayout;
            if (isA5Landscape && settings.invoiceLayout_a5_landscape) {
                layoutStr = settings.invoiceLayout_a5_landscape;
            } else if (isA5 && settings.invoiceLayout_a5) {
                layoutStr = settings.invoiceLayout_a5;
            }
            return JSON.parse(layoutStr || "[]");
        } catch {
            return [];
        }
    }, [layout, settings]);

    // Calculate pages
    const totalItems = invoice?.items?.length || 0;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / maxRows) : 1;
    const pages = Array.from({ length: totalPages }, (_, i) => i);

    const getFieldValue = (key: InvoiceFieldKey) => {
        switch (key) {
            case "invoiceNumber": return invoice?.invoiceNumber || "";
            case "date": return formatDate(invoice?.date);
            case "dueDate": return formatDate(invoice?.dueDate);
            case "customerName": return invoice?.billToName || invoice?.recipientName || invoice?.ownerName || "Guest";
            case "customerAddress": return invoice?.billToAddress || invoice?.ownerAddress || "";
            case "customerPhone": return invoice?.billToPhone || invoice?.ownerPhone || "";
            case "customerEmail": return invoice?.billToEmail || invoice?.ownerEmail || "";
            case "patientName": return invoice?.patientName || invoice?.petName || "";
            case "ownerName": return invoice?.ownerName || "";
            case "clinicPhone": return settings.upiPhone || settings.clinicPhone;
            case "doctorName": return settings.doctorName || invoice?.createdByName || "";
            case "doctorPhone": return invoice?.createdByPhone || "";
            case "billedBy": return invoice?.billedByName || invoice?.createdByName || ""; // Fallback to createdBy if paid directly on creation
            case "gstNumber": return settings.gstNumber;
            case "regNumber": return settings.registrationNumber;
            case "subtotal": return formatCurrency(invoice?.subtotal || 0);
            case "tax": return formatCurrency(invoice?.taxTotal || invoice?.tax || 0);
            case "total": return formatCurrency(invoice?.total || 0);
            case "upiId": return settings.upiId;
            case "upiPhone": return settings.upiPhone;
            case "bankName": return settings.upiBankName || settings.bankName;
            case "terms": return settings.termsConditions;
            case "qrCode":
                if (!settings.upiId) return null;
                const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.upiPayeeName || "Clinic")}&am=${invoice?.total || 0}&cu=INR`;
                return <QRCodeSVG value={upiUrl} size={100} level="M" />;

            // List helpers, shouldn't really be used as single fields often but supported
            case "serialNumber": return invoice?.items?.map((_: any, i: number) => i + 1).join("\n") || "";
            case "description": return invoice?.items?.map((i: any) => i.description).join("\n") || "";
            case "quantity": return invoice?.items?.map((i: any) => i.quantity).join("\n") || "";
            case "unitPrice": return invoice?.items?.map((i: any) => formatCurrency(i.unitPrice)).join("\n") || "";
            case "lineTotal": return invoice?.items?.map((i: any) => formatCurrency(i.total)).join("\n") || "";

            default: return "";
        }
    };

    return (
        <div className="flex flex-col gap-8 print:gap-0">
            {pages.map((pageIndex) => {
                const isLastPage = pageIndex === totalPages - 1;
                // Slice items for this page
                const startIdx = pageIndex * maxRows;
                const endIdx = startIdx + maxRows;
                const pageItems = invoice?.items?.slice(startIdx, endIdx) || [];

                // Create a shallow copy of invoice with sliced items for the table component
                const pageInvoice = { ...invoice, items: pageItems };

                return (
                    <div
                        key={pageIndex}
                        className={cn(
                            "relative bg-white overflow-hidden mx-auto print:break-after-page",
                            className
                        )}
                        style={{
                            width: isA5Landscape ? "794px" : (isA5 ? "559px" : "794px"),
                            minHeight: isA5Landscape ? "559px" : (isA5 ? "794px" : "1123px"),
                            height: className?.includes("min-h-0") ? "100%" : (isA5Landscape ? "559px" : (isA5 ? "794px" : "1123px")),
                            backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            position: "relative"
                        }}

                    >
                        {sections.filter(s => s.isVisible).map(section => {
                            // Conditional Rendering Logic
                            if (!isLastPage) {
                                // Hide footer elements on non-last pages
                                if (FOOTER_SECTIONS.includes(section.type)) return null;
                                if (section.type === "field" && section.field && FOOTER_FIELDS.includes(section.field)) return null;
                            }

                            return (
                                <div
                                    key={section.id}
                                    style={{
                                        position: "absolute",
                                        left: `${section.x}px`,
                                        top: `${section.y}px`,
                                        width: `${section.width}px`,
                                        fontSize: section.styles?.fontSize,
                                        fontWeight: section.styles?.fontWeight,
                                        color: section.styles?.color,
                                        zIndex: 10
                                    }}
                                    className={cn(
                                        "break-words",
                                        section.type === "stamp" && "pointer-events-none"
                                    )}
                                >
                                    {(() => {
                                        switch (section.type) {
                                            case "header": return <InvoiceHeader settings={settings} invoice={pageInvoice} section={section} logoPx={48} />;
                                            case "grid": return <InvoiceGrid settings={settings} invoice={pageInvoice} section={section} logoPx={48} />;
                                            // Pass the sliced pageInvoice to table
                                            case "table": return <InvoiceTable settings={settings} invoice={pageInvoice} section={section} logoPx={48} startIndex={startIdx} />;

                                            // Totals and Payments render normally (data is from full invoice usually, but these are footer elements so they only show on last page)
                                            // We use 'invoice' (full) for totals because subtotal/total should be the invoice total, not page total, unless requested otherwise.
                                            // User requested "move ... subtotal, grand total ... to next page". Usually this means the final values.
                                            case "totals": return <div style={{ width: '100%' }}><InvoiceTotals settings={settings} invoice={invoice} section={section} logoPx={48} /></div>;
                                            case "payment": return <InvoicePayment settings={settings} invoice={invoice} section={section} logoPx={48} />;
                                            case "footer": return <InvoiceFooter settings={settings} invoice={invoice} section={section} logoPx={48} />;

                                            case "text": return <div className="whitespace-pre-wrap">{section.content}</div>;
                                            case "spacer": return <InvoiceSpacer section={section} />;
                                            case "stamp":
                                                if (invoice?.status !== "paid") return null;
                                                const stampSrc = settings.invoicePaidStampImage;
                                                return stampSrc ? <img src={stampSrc} alt="PAID" className="w-full h-full object-contain opacity-80" /> : <InvoiceStamp settings={settings} invoice={invoice} section={section} />;
                                            case "image":
                                                const src = settings.invoiceLogoImage || "";
                                                return src ? <img src={src} alt="Logo" className="w-full h-full object-contain" /> : null;

                                            case "field":
                                                if (!section.field) return null;
                                                const val = getFieldValue(section.field);
                                                if (section.field === "qrCode") {
                                                    return val;
                                                }
                                                return <span className={cn("inline-block w-full whitespace-pre-line", section.styles?.fontWeight === "bold" ? "font-bold" : "")}>{val}</span>;

                                            default: return null;
                                        }
                                    })()}
                                </div>
                            );
                        })}
                        {/* Add Page Number if multiple pages? User didn't ask. */}
                    </div>
                );
            })}
        </div>
    );
}

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import type { InvoiceSection } from "./types";

// Helper functions (duplicated for now, or export from Utils if available)
function formatCurrency(amount: string | number) {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `\u20B9${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

// Interfaces
interface SectionProps {
    settings: Record<string, string>;
    invoice: any;
    section?: InvoiceSection;
    logoPx?: number;
    startIndex?: number;
}


export function InvoiceHeader({ settings, logoPx = 48, section }: SectionProps) {
    const headerColor = settings.invoiceHeaderColor || "#0f766e";
    const headerTextColor = settings.invoiceHeaderTextColor || "#ffffff";
    const clinicLogoUrl = settings.clinicLogoUrl || "";
    // const logoPosition = settings.invoiceLogoPosition || "left"; // Overridden by custom design often
    const clinicName = settings.clinicName || "Clinic Name";
    const clinicAddress = settings.clinicAddress || "";
    const clinicPhone = settings.clinicPhone || "";
    const clinicEmail = settings.clinicEmail || "";
    const invoiceTitle = settings.invoiceTitle || "INVOICE";

    // Custom Variant Check
    const variant = section?.styles?.variant || "standard";

    if (variant === "curved") {
        return (
            <div className="relative overflow-hidden mb-6">
                {/* Curved Background Shape */}
                <div
                    className="absolute top-0 left-0 right-0 h-[180px] -z-10"
                >
                    <svg viewBox="0 0 1440 320" className="w-full h-full absolute top-0 left-0" preserveAspectRatio="none">
                        <path
                            fill={headerColor}
                            fillOpacity="1"
                            d="M0,0 L1440,0 L1440,220 C1100,220 1100,100 720,100 C340,100 340,280 0,280 L0,0 Z"
                        ></path>
                    </svg>
                </div>

                <div className="p-8 flex justify-between items-start pt-8">
                    {/* Logo & Clinic Info - Left */}
                    <div className="flex flex-col gap-2 relative z-10 max-w-[50%]">
                        <div className="flex items-center gap-3">
                            {clinicLogoUrl && (
                                <div className="bg-white p-1.5 rounded-lg inline-block shadow-sm">
                                    <img
                                        src={clinicLogoUrl}
                                        alt="Logo"
                                        style={{ height: logoPx, width: 'auto', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold uppercase tracking-wider text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    {clinicName}
                                </h1>
                                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-widest font-semibold backdrop-blur-sm">
                                    Pet Clinic & Spa
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Title - Right */}
                    <div className="text-right relative z-10 pt-2">
                        <h2
                            className="text-6xl font-black uppercase tracking-tighter opacity-30 select-none absolute right-0 -top-4"
                            style={{ color: "#ffffff" }}
                        >
                            {invoiceTitle}
                        </h2>
                        <h2
                            className="text-4xl font-black uppercase tracking-wide relative z-10"
                            style={{ color: headerTextColor }}
                        >
                            {invoiceTitle}
                        </h2>
                    </div>
                </div>

                {/* Spacing to clear the curve */}
                <div className="h-4"></div>
            </div>
        );
    }

    return (
        <div
            className="p-5 relative"
            style={{ backgroundColor: headerColor, color: headerTextColor }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    {clinicLogoUrl && (
                        <img
                            src={clinicLogoUrl}
                            alt="Logo"
                            className="object-contain bg-white/20 p-1 rounded"
                            style={{ width: logoPx, height: logoPx }}
                        />
                    )}
                    <div>
                        <h2 className="font-bold text-base">{clinicName}</h2>
                        {clinicAddress && <p className="text-[11px] opacity-90 mt-0.5 whitespace-pre-line">{clinicAddress}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-xl font-bold tracking-wide opacity-95">{invoiceTitle}</h1>
                </div>
            </div>
        </div>
    );
}

export function InvoiceGrid({ invoice, settings }: SectionProps) {
    const headerColor = settings.invoiceHeaderColor || "#0f766e";
    const accentColor = settings.invoiceAccentColor || "#1E88E5";

    return (
        <div className="px-8 py-6 grid grid-cols-2 gap-12">
            <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accentColor }}>Bill To:</p>
                <p className="font-bold text-lg text-foreground">{invoice.ownerName}</p>
                <p className="text-sm text-muted-foreground font-medium">Licheria & Co.</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{invoice.ownerAddress}</p>
            </div>
            <div className="text-right">
                <div className="grid grid-cols-[auto_auto] justify-end gap-x-6 gap-y-1.5 p-4 rounded-lg bg-gray-50/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-right" style={{ color: accentColor }}>Invoice No:</span>
                    <span className="text-sm font-bold text-right font-mono" style={{ color: accentColor }}>{invoice.invoiceNumber}</span>

                    <span className="text-xs font-semibold text-muted-foreground text-right">Date:</span>
                    <span className="text-sm text-right font-medium">{formatDate(invoice.date)}</span>

                    <span className="text-xs font-semibold text-muted-foreground text-right">Due Date:</span>
                    <span className="text-sm text-right font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</span>
                </div>
            </div>
        </div>
    );
}

export function InvoiceTable({ invoice, settings, startIndex = 0 }: SectionProps) {
    const accentColor = settings.invoiceAccentColor || "#1E88E5";
    const headerTextColor = settings.invoiceHeaderTextColor || "#ffffff";
    const colDescription = settings.invoiceColDescription || "Item Description";
    const colQuantity = settings.invoiceColQuantity || "Qty / Hr";
    const colPrice = settings.invoiceColPrice || "Price";
    const colTotal = settings.invoiceColTotal || "Subtotal";

    return (
        <div className="px-8 mb-4 mt-4">
            <div className="overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}` }}>
                            <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground w-16">No.</th>
                            <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>{colDescription}</th>
                            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wider w-24" style={{ color: accentColor }}>{colPrice}</th>
                            <th className="text-center py-3 px-2 text-xs font-bold uppercase tracking-wider w-24" style={{ color: accentColor }}>{colQuantity}</th>
                            <th className="text-right py-3 px-2 text-xs font-bold uppercase tracking-wider w-28" style={{ color: accentColor }}>{colTotal}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.length > 0 ? (
                            invoice.items.map((item: any, idx: number) => (
                                <tr key={item.id} className="border-b border-dashed last:border-0 hover:bg-gray-50/50">
                                    <td className="py-4 px-2 text-xs font-medium text-muted-foreground">{(startIndex + idx + 1).toString().padStart(2, '0')}.</td>
                                    <td className="py-4 px-2 font-medium">{item.description}</td>

                                    <td className="py-4 px-2 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-4 px-2 text-center text-muted-foreground">{item.quantity}</td>
                                    <td className="py-4 px-2 text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No items added</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function InvoiceTotals({ invoice, settings }: SectionProps) {
    const accentColor = settings.invoiceAccentColor || "#1E88E5";

    return (
        <div className="px-8 py-2">
            <div className="flex justify-end">
                <div className="w-1/2 min-w-[300px]">
                    <div className="flex justify-between py-3">
                        <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.tax > 0 && (
                        <div className="flex justify-between py-2 border-b border-dashed">
                            <span className="text-sm font-medium text-muted-foreground">Tax</span>
                            <span className="text-sm font-medium text-foreground">{formatCurrency(invoice.tax)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center py-4 border-b-2 border-black/80 mt-2">
                        <span className="text-base font-bold uppercase tracking-wider" style={{ color: accentColor }}>Grand Total</span>
                        <span className="text-xl font-black" style={{ color: accentColor }}>{formatCurrency(invoice.total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


export function InvoiceText({ section, invoice, settings }: SectionProps) {
    const showNotes = settings.invoiceShowNotes !== "false";
    if (section?.id === "notes" && !showNotes) return null;

    return (
        <div className="px-5 mb-4">
            <div className="p-2.5 rounded-md bg-muted/30">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                    {section?.label === "Notes" ? "Notes" : section?.label}
                </p>
                <p className="text-[11px] whitespace-pre-wrap">{section?.content || invoice.notes}</p>
            </div>
        </div>
    );
}

export function InvoiceSpacer({ section }: { section?: InvoiceSection }) {
    return <div style={{ height: section?.styles?.height ? parseInt(section.styles.height) : 20 }} />;
}

export function InvoicePayment({ invoice, settings }: SectionProps) {
    const clinicAddress = settings.clinicAddress || "";
    const upiId = settings.upiId || "";
    const showTerms = settings.invoiceShowTerms !== "false";
    const termsConditions = settings.termsConditions || "";
    const showUpiQr = settings.invoiceShowUpiQr !== "false";
    const upiPayeeName = settings.upiPayeeName || settings.clinicName || "Clinic";
    const headerColor = settings.invoiceHeaderColor || "#0f766e";

    const upiUrl = upiId
        ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayeeName)}&am=${Number(invoice.total).toFixed(2)}&cu=INR`
        : "";

    return (
        <div className="px-5 border-t pt-3 mt-2">
            <div className="flex justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Payment Information</p>
                        {clinicAddress && <p className="text-[10px] text-muted-foreground">{clinicAddress}</p>}
                    </div>
                    {upiId && (
                        <div className="mt-0.5">
                            <p className="text-[10px] text-muted-foreground">
                                <span className="font-medium">UPI:</span> {upiId}
                            </p>
                        </div>
                    )}
                    {showTerms && termsConditions && (
                        <div className="mt-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Terms & Conditions</p>
                            <p className="text-[10px] text-muted-foreground whitespace-pre-line">{termsConditions}</p>
                        </div>
                    )}
                </div>

                {showUpiQr && upiId && (
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scan to Pay</p>
                        <div className="p-1.5 bg-white rounded-md border">
                            <QRCodeSVG value={upiUrl} size={80} level="M" includeMargin={false} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium" style={{ color: headerColor }}>
                            {formatCurrency(invoice.total)}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}


export function InvoiceFooter({ settings }: SectionProps) {
    const showFooter = settings.invoiceShowFooter !== "false";
    const footerText = settings.footerText || "";
    const headerColor = settings.invoiceHeaderColor || "#0f766e";

    if (!showFooter || !footerText) return null;

    return (
        <div className="px-5 mt-3 pt-2 border-t text-center">
            <p className="text-[11px] font-medium" style={{ color: headerColor }}>{footerText}</p>
        </div>
    );
}

export function InvoiceStamp({ settings }: SectionProps) {
    return (
        <div className="flex items-center justify-center w-full h-full">
            <div className="border-4 border-red-600 rounded-full w-32 h-32 flex items-center justify-center p-2 transform -rotate-12 opacity-80 mask-stamp">
                <div className="border-2 border-red-600 rounded-full w-full h-full flex items-center justify-center border-dashed">
                    <span className="text-4xl font-black text-red-600 uppercase tracking-widest">PAID</span>
                </div>
            </div>
        </div>
    );
}


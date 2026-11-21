import React, { useState, useEffect } from "react";
import { Download, FileText, ExternalLink, ShieldCheck, Receipt, Loader2 } from "lucide-react";

export default function PublicReportViewer() {
    // Extract token synchronously from URL — works even outside wouter Router context
    const rawToken = typeof window !== "undefined"
        ? window.location.pathname.replace(/^\/r\//, "").replace(/\.pdf$/i, "").trim()
        : "";

    // PDF is always served from the API route, never the SPA route
    const pdfApiUrl = rawToken ? `/api/r/${rawToken}` : "";

    // Detect mobile SYNCHRONOUSLY so iframe is NEVER rendered on mobile's first paint
    // This prevents the iframe from loading the React SPA and creating a duplicate card
    const [isMobile] = useState<boolean>(() =>
        typeof navigator !== "undefined"
            ? /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent)
            : false
    );

    const [hasError, setHasError] = useState(false);
    const [isInvoice, setIsInvoice] = useState(false);
    const [displayTitle, setDisplayTitle] = useState<string | null>(null); // null = loading

    useEffect(() => {
        if (!rawToken) { setDisplayTitle("Medical Document"); return; }
        fetch(`/api/r/meta/${rawToken}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                const inv = data?.type === "invoice" || /invoice/i.test(data?.title || "");
                setIsInvoice(inv);
                setDisplayTitle(data?.title || (inv ? "Patient Invoice" : "Patient Lab Report"));
            })
            .catch(() => setDisplayTitle("Medical Document"));
    }, [rawToken]);

    useEffect(() => {
        if (!displayTitle) return;
        document.title = isInvoice ? "Invoice | PetPoint" : "Lab Report | PetPoint";
    }, [displayTitle, isInvoice]);

    const Icon = isInvoice ? Receipt : FileText;

    if (!rawToken) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Invalid Link</h2>
                    <p className="text-sm text-slate-500">This link is invalid or has expired. Please contact the clinic.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-3 sm:p-6 font-sans">

            {/* ── Header card ─────────────────────────────────────────── */}
            <header className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        {displayTitle ? <Icon className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin text-slate-300" />}
                    </div>
                    <div>
                        {displayTitle ? (
                            <h1 className="text-base font-bold text-slate-800 leading-tight">{displayTitle}</h1>
                        ) : (
                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-1" />
                        )}
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline" /> Verified Clinic Document
                        </p>
                    </div>
                </div>
                <a href={pdfApiUrl} download target="_blank" rel="noopener noreferrer">
                    <button className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all">
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                </a>
            </header>

            {/* ── Body ────────────────────────────────────────────────── */}
            <main className="w-full max-w-4xl flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ minHeight: isMobile ? "auto" : "75vh" }}>
                {isMobile ? (
                    /* Mobile: clean open/download UI — no iframe, no duplicate */
                    <div className="flex flex-col items-center justify-center p-8 text-center gap-5 py-12">
                        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                            {displayTitle
                                ? <Icon className="w-10 h-10 text-emerald-600" />
                                : <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />}
                        </div>
                        <div>
                            {displayTitle ? (
                                <h2 className="text-xl font-bold text-slate-800 mb-2">{displayTitle}</h2>
                            ) : (
                                <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mx-auto mb-2" />
                            )}
                            <p className="text-sm text-slate-500 max-w-xs">
                                Tap below to open or download your {isInvoice ? "invoice" : "lab report"} PDF.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <a href={pdfApiUrl} target="_blank" rel="noopener noreferrer">
                                <button className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-3.5 rounded-xl shadow-sm transition-all active:scale-95">
                                    <ExternalLink className="w-4 h-4" /> Open PDF
                                </button>
                            </a>
                            <a href={pdfApiUrl} download>
                                <button className="w-full inline-flex items-center justify-center gap-2 border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 text-sm font-semibold px-5 py-3.5 rounded-xl transition-all active:scale-95">
                                    <Download className="w-4 h-4" /> Download
                                </button>
                            </a>
                        </div>
                    </div>
                ) : !hasError ? (
                    /* Desktop: inline PDF iframe */
                    <iframe
                        key={pdfApiUrl}
                        src={`${pdfApiUrl}#toolbar=1&navpanes=0&view=FitH`}
                        title={displayTitle || "Document"}
                        className="w-full flex-1 border-0"
                        style={{ minHeight: "75vh" }}
                        onError={() => setHasError(true)}
                    />
                ) : (
                    /* Fallback if iframe errors */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                            <FileText className="w-7 h-7" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Open PDF in New Tab</h2>
                        <p className="text-sm text-slate-500 max-w-md mb-4">
                            Your browser couldn't display the PDF inline. Click below to open it directly.
                        </p>
                        <a href={pdfApiUrl} target="_blank" rel="noopener noreferrer">
                            <button className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95">
                                <ExternalLink className="w-4 h-4" /> Open Full PDF
                            </button>
                        </a>
                    </div>
                )}
            </main>

            <footer className="w-full max-w-4xl text-center py-4 text-xs text-slate-400">
                PetPoint Pro Veterinary Care • Secure Patient Document Portal
            </footer>
        </div>
    );
}

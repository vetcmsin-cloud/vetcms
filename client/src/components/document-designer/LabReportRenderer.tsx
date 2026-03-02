
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DocumentSection, PanelDefinition } from "./types";
import { LabReport, Pet, Owner, HematologyData, BloodChemistryData, BiochemistryData, LabTest, LabRefRange } from "@shared/schema";
import { labReportConfig } from "./lab-report-fields";

interface LabReportRendererProps {
    settings: Record<string, string>;
    report: LabReport;
    pet: Pet;
    owner: Owner;
    layout?: DocumentSection[];
    className?: string;
}

export function LabReportRenderer({ settings, report, pet, owner, layout, className }: LabReportRendererProps) {
    const details = report.details as (HematologyData & BloodChemistryData & BiochemistryData) | null;

    const { data: allTests } = useQuery<LabTest[]>({ queryKey: ["/api/lab-settings/tests"] });
    const { data: allRanges } = useQuery<LabRefRange[]>({ queryKey: ["/api/lab-settings/ranges"] });

    const getDynamicRefRange = (rowKey: string, rowLabel: string, defaultRange: string) => {
        if (!allTests || !allRanges || !pet?.species) return defaultRange;

        const cleanKey = rowKey.replace(/^bio_/, '').toLowerCase().trim();
        const cleanLabelPrefix = rowLabel.split('(')[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '');

        const test = allTests.find(t => {
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
            const range = allRanges.find(r =>
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

    // Helper to get field values
    const getFieldValue = (key: string): string => {
        if (!key) return "";

        // Report Info
        if (key === "clinicName") return settings.clinicName || "ABC Veterinary Clinic";
        if (key === "reportDate") return format(new Date(report.date), "dd/MM/yyyy");
        if (key === "caseId") return `CASE-${pet?.id || "N/A"}`;
        if (key === "sampleType") return "Whole Blood / Serum";
        if (key === "refDoctor") return "Dr. Unknown";

        // Patient Info
        if (key === "patientName") return pet?.name || "N/A";
        if (key === "ownerName") return `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "N/A";
        if (key === "ownerPhone") return owner?.phone || "";
        if (key === "species") return pet?.species || "";
        if (key === "breed") return pet?.breed || "";
        if (key === "age") return pet?.age?.toString() || "";
        if (key === "weight") return pet?.weight ? `${pet.weight} kg` : "";
        if (key === "gender") return pet?.gender || "";
        if (key === "ageSex") return `${pet?.age || "?"} yrs / ${pet?.gender || "?"}`;

        // Test Results
        if (details && (details as any)[key] !== undefined) return (details as any)[key] || "–";

        return "";
    };

    // Render Custom Layout
    if (layout && layout.length > 0) {
        const bgImage = settings.labReportBackgroundImage;

        return (
            <div
                className={cn(
                    "relative bg-white print:m-0 print:p-0 overflow-hidden mx-auto",
                    className
                )}
                style={{
                    width: "794px",
                    minHeight: "1123px",
                    height: className?.includes("min-h-0") ? "100%" : "1123px",
                    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat"
                }}
            >
                {layout.filter(s => s.isVisible).map(section => (
                    <div
                        key={section.id}
                        style={{
                            position: "absolute",
                            left: `${section.x}px`,
                            top: `${section.y}px`,
                            width: `${section.width}px`,
                            fontSize: section.styles?.fontSize || "11px",
                            fontWeight: section.styles?.fontWeight,
                            color: section.styles?.color || "#1a1a2e",
                            fontFamily: "Inter, sans-serif",
                            zIndex: 10
                        }}
                    >
                        {(() => {
                            if (section.type === "text") {
                                return <div className="whitespace-pre-wrap">{section.content}</div>;
                            }

                            if (section.type === "field" && section.field) {
                                return <div className="font-medium">{getFieldValue(section.field)}</div>;
                            }

                            if (section.type === "panel" && section.panelKey && labReportConfig.panels) {
                                const panelDef = labReportConfig.panels.find(p => p.key === section.panelKey);
                                if (!panelDef) return null;

                                if (panelDef.panelType === "info") {
                                    const leftRows = panelDef.rows.filter(r => r.col !== "right");
                                    const rightRows = panelDef.rows.filter(r => r.col === "right");
                                    const hasRight = rightRows.length > 0;

                                    const renderRow = (row: any) => (
                                        <div key={row.key} style={{ display: "flex", marginBottom: "4px", lineHeight: "1.4" }}>
                                            <span style={{ fontWeight: 500, color: "#374151", width: "100px", flexShrink: 0 }}>{row.label}</span>
                                            <span style={{ color: "#9ca3af", margin: "0 4px" }}>:</span>
                                            <span style={{ fontWeight: 600, color: "#111827" }}>{getFieldValue(row.key)}</span>
                                        </div>
                                    );

                                    return (
                                        <div>
                                            <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>{panelDef.label}</div>
                                            <div style={{ display: "grid", gridTemplateColumns: hasRight ? '1fr 1fr' : '1fr', gap: "16px" }}>
                                                <div>{leftRows.map(renderRow)}</div>
                                                {hasRight && <div>{rightRows.map(renderRow)}</div>}
                                            </div>
                                        </div>
                                    );
                                }

                                // Test Panel (Table)
                                const showRefRange = !panelDef.hideRefRange;

                                return (
                                    <div key={panelDef.key}>
                                        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", color: "#1e293b", borderBottom: "2px solid #e2e8f0", paddingBottom: "4px" }}>
                                            {panelDef.label}
                                        </div>
                                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0", fontSize: "11px" }}>
                                            <thead>
                                                <tr style={{ background: "transparent" }}>
                                                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #cbd5e1", width: showRefRange ? "40%" : "50%", fontWeight: 600, color: "#475569" }}>Test Parameter</th>
                                                    <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #cbd5e1", width: showRefRange ? "20%" : "25%", fontWeight: 600, color: "#475569" }}>Result</th>
                                                    <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #cbd5e1", width: showRefRange ? "15%" : "25%", fontWeight: 600, color: "#475569" }}>Unit</th>
                                                    {showRefRange && <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid #cbd5e1", width: "25%", fontWeight: 600, color: "#475569" }}>Reference Range</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {panelDef.rows.map((row, i) => (
                                                    <tr key={row.key} style={{ background: "transparent" }}>
                                                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", color: "#334155", fontWeight: 500 }}>{row.label}</td>
                                                        <td style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, color: "#0f172a" }}>
                                                            {getFieldValue(row.key)}
                                                        </td>
                                                        <td style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>{row.unit}</td>
                                                        {showRefRange && <td style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontFamily: "monospace" }}>
                                                            {getDynamicRefRange(row.key, row.label, row.refRange || "-")}
                                                        </td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }

                            return null;
                        })()}
                    </div>
                ))}
            </div>
        );
    }

    // Default Layout (Simple HTML structure ported to React)
    return (
        <div className={cn("p-8 bg-white mx-auto print:p-0", className)} style={{ width: "794px", minHeight: "1123px", fontFamily: "'Courier New', Courier, monospace", fontSize: "12px", whiteSpace: "pre-wrap" }}>
            <div className="text-center font-bold">
                {settings.clinicName || "ABC VETERINARY CLINIC"}{"\n"}
                {report.category} Laboratory Report
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div>Case ID       : CASE-{pet?.id}</div>
                    <div>Report Date   : {format(new Date(report.date), "dd/MM/yyyy")}</div>
                    <div>Owner Name    : {owner?.firstName} {owner?.lastName}</div>
                    <div>Contact No    : {owner?.phone}</div>
                </div>
                <div>
                    <div>Animal Name   : {pet?.name}</div>
                    <div>Species       : {pet?.species}</div>
                    <div>Breed         : {pet?.breed}</div>
                    <div>Age / Sex     : {pet?.age} / {pet?.gender}</div>
                </div>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>

        // Render details if available
            {details && (
                <div className="mt-8">
                    <div className="font-bold mb-4">TEST RESULTS</div>
                    <table className="w-full text-left" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                        <thead>
                            <tr className="border-b border-dashed border-black">
                                <th className="py-2">Parameter</th>
                                <th className="py-2 text-center">Result</th>
                                <th className="py-2 text-center">Unit</th>
                                <th className="py-2 text-center">Reference Range</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(details).map(([key, value]) => {
                                if (key === 'id' || key === 'reportId' || !value) return null;

                                // Find unit and refRange from config
                                let unit = "-";
                                let refRange = "-";
                                const allRows = labReportConfig.panels?.flatMap(p => p.rows) || [];
                                const rowDef = allRows.find(r => r.key === key);
                                if (rowDef) {
                                    unit = rowDef.unit || "-";
                                    refRange = rowDef.refRange || "-";
                                }

                                return (
                                    <tr key={key}>
                                        <td className="py-1 capitalize">{rowDef ? rowDef.label : key.replace(/([A-Z])/g, ' $1').trim()}</td>
                                        <td className="py-1 font-bold text-center">{String(value)}</td>
                                        <td className="py-1 text-center text-gray-600">{unit}</td>
                                        <td className="py-1 text-center font-mono text-gray-600">
                                            {getDynamicRefRange(key, rowDef?.label || "", refRange)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-12">
                <div className="font-bold underline mb-2">Clinical Interpretation:</div>
                <div className="whitespace-pre-wrap">{report.notes || 'No remarks.'}</div>
            </div>

            <div className="mt-24 flex justify-between">
                <div>Pathologist Signature</div>
                <div>Doctor Signature</div>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="text-center text-xs">Generated By: Clinic Management System</div>
        </div>
    );
}

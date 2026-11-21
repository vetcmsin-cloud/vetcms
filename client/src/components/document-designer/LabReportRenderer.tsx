import React, { useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatInTZ, getClinicTimezone } from "@/lib/timezone";
import type { DocumentSection, PanelDefinition } from "./types";
import { labReportConfig } from "./lab-report-fields";
import { CycleTimelineComponent } from "@/components/vaginal-cytology-builder";


interface LabReportRendererProps {
    settings: Record<string, string>;
    report: LabReport;
    pet: Pet;
    owner: Owner;
    layout?: DocumentSection[];
    className?: string;
}

export const LabReportRenderer = memo(function LabReportRenderer({ settings, report, pet, owner, layout, className }: LabReportRendererProps) {
    const details = report.details as (HematologyData & BloodChemistryData & BiochemistryData) | null;
    const rowGap = settings?.labReportRowGap || "6";
    const rowGapAlt = settings?.labReportRowGap || "5";

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
            const range = allRanges.find(r => r.testId === test.id && r.species.toLowerCase() === pet.species!.toLowerCase());
            if (range) {
                if (range.min && range.max) return `${range.min} - ${range.max}`;
                if (range.refText) return range.refText;
            }
        }
        return defaultRange;
    };

    const getFieldValue = (key: string): string => {
        if (!key) return "";
        if (key === "clinicName") return settings.clinicName || "ABC Veterinary Clinic";
        if (key === "reportDate") {
            return formatInTZ(report.date, getClinicTimezone(settings));
        }
        if (key === "caseId") return `CASE-${pet?.id || "N/A"}`;
        if (key === "sampleType") return "Whole Blood / Serum";
        if (key === "refDoctor") return "Dr. Unknown";
        if (key === "patientName") return pet?.name || "N/A";
        if (key === "ownerName") return `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "N/A";
        if (key === "ownerPhone") return owner?.phone || "";
        if (key === "species") return pet?.species || "";
        if (key === "breed") return pet?.breed || "";
        if (key === "age") {
            const years = pet?.age ?? 0;
            const months = (pet as any)?.ageMonths ?? 0;
            const parts = [
                years > 0 ? `${years} yr${years !== 1 ? 's' : ''}` : "",
                months > 0 ? `${months} mo` : ""
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(" ") : "< 1 mo";
        }
        if (key === "weight") return pet?.weight ? `${pet.weight} kg` : "";
        if (key === "gender") return pet?.gender || "";
        if (key === "summary") return (report.result && report.result !== "Completed") ? report.result : "";
        if (key === "notes") return report.notes || "";
        if (key === "ageSex") {
            const years = pet?.age ?? 0;
            const months = (pet as any)?.ageMonths ?? 0;
            const ageParts = [
                years > 0 ? `${years}yr` : "",
                months > 0 ? `${months}mo` : ""
            ].filter(Boolean);
            const ageStr = ageParts.length > 0 ? ageParts.join(" ") : "< 1mo";
            return `${ageStr} / ${pet?.gender || "?"}`;
        }
        if (details) {
            if ((details as any)[key] !== undefined) return (details as any)[key];
            if ((details as any)[`bio_${key}`] !== undefined) return (details as any)[`bio_${key}`];
            if (key.startsWith('bio_') && (details as any)[key.replace('bio_', '')] !== undefined) return (details as any)[key.replace('bio_', '')];
        }
        return "";
    };

    const isValueOutOfRange = (value: string, rangeStr: string): boolean => {
        if (!value || !rangeStr || rangeStr === "-" || rangeStr === "" || value === "") return false;

        const cleanValue = value.replace(/,/g, '').trim();
        const val = parseFloat(cleanValue);

        if (isNaN(val)) {
            // Text-based comparison
            const v = cleanValue.toLowerCase();
            const r = rangeStr.toLowerCase().trim();
            // List of "normal" indicators in reference range
            if (r === "negative" || r === "normal" || r === "nil" || r === "absent") {
                return v !== r && v !== "absent" && v !== "negative" && v !== "normal" && v !== "nil";
            }
            return false;
        }

        // Numeric ranges
        // Match "min - max" or "min-max"
        const rangeMatch = rangeStr.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
        if (rangeMatch) {
            const min = parseFloat(rangeMatch[1]);
            const max = parseFloat(rangeMatch[2]);
            return val < min || val > max;
        }

        // Match "< max"
        const lessMatch = rangeStr.match(/<\s*(\d+\.?\d*)/);
        if (lessMatch) {
            const max = parseFloat(lessMatch[1]);
            return val >= max;
        }

        // Match "> min"
        const greaterMatch = rangeStr.match(/>\s*(\d+\.?\d*)/);
        if (greaterMatch) {
            const min = parseFloat(greaterMatch[1]);
            return val <= min;
        }

        return false;
    };

    const rowGapNum = parseFloat(settings?.labReportRowGap || "6");
    const rowHeight = (rowGapNum * 2) + 21;

    // computedLayout determines VISIBILITY only (isVis flag) ... layout is still needed to hide empty panels
    const computedLayout = useMemo(() => {
        if (!layout || layout.length === 0) return [];
        const sorted = [...layout].sort((a, b) => (a.y || 0) - (b.y || 0));
        return sorted.map(section => {
            let isVis = section.isVisible !== false;
            if (section.type === "panel" && section.panelKey && labReportConfig.panels) {
                const def = labReportConfig.panels.find(p => p.key === section.panelKey);
                if (def) {
                    if (def.panelType === "blood_smear") {
                        const val = (details as any)?.bloodSmear || (details as any)?.blood_smear || "";
                        if (!val || val.trim() === "") isVis = false;
                    } else if (def.panelType === "wet_film") {
                        const val = (details as any)?.wetFilm || "";
                        if (!val || val.trim() === "") isVis = false;
                    } else if (def.panelType === "cycle_timeline") {
                        // Always show cycle timeline for Reproductive reports — it draws from EVC/prog dates
                        isVis = section.isVisible !== false;
                    } else if (def.panelType === "evc" || def.panelType === "progesterone") {
                        const validRows = def.rows.filter(r => {
                            const v = (details as any)?.[r.key];
                            return v !== undefined && v !== null && String(v).trim() !== "";
                        });
                        if (validRows.length === 0) isVis = false;
                    } else if (def.panelType !== "info") {
                        const validRows = def.rows.filter(r => {
                            const v = getFieldValue(r.key);
                            return v !== undefined && v !== null && String(v).trim() !== "";
                        });
                        if (validRows.length === 0) isVis = false;
                    }
                }
            }
            return { ...section, isVis };
        });
    }, [layout, details, settings?.labReportRowGap]);

    if (computedLayout.length > 0) {
        const bgImage = settings.labReportBackgroundImage;

        // ... TWO-LAYER LAYOUT ...
        // Layer 1 ... HEADER (absolute position, exactly as placed in designer):
        //   text blocks, field values, images, and "info" panels (patient details)
        // Layer 2 ... CONTENT PANELS (flow, no gaps):
        //   test tables, blood smear, wet film ... start at the Y of the first
        //   content panel the user placed in the designer; the rest stack below.
        const CONTENT_PANEL_TYPES = new Set(["blood_smear", "wet_film", "test", "evc", "progesterone", "cycle_timeline", "usg"]);

        // Fields that always live in the body flow (not absolutely positioned)
        const FLOW_FIELD_KEYS = new Set(["cycleTimeline", "summary", "notes", "remarks"]);

        const isContentPanel = (s: typeof computedLayout[0]) => {
            if (s.position === "body" || s.position === "category") return true;
            if (s.position === "header" || s.position === "footer") return false;
            if (s.type === "field" && FLOW_FIELD_KEYS.has(s.field || "")) return true;
            if (s.type !== "panel") return false;
            const def = labReportConfig.panels?.find(p => p.key === s.panelKey);
            return def ? CONTENT_PANEL_TYPES.has(def.panelType ?? "test") : false;
        };

        const headerSections = computedLayout.filter(s => s.isVis && (s.position === "header" || (!s.position && !isContentPanel(s))));
        const contentPanels  = computedLayout.filter(s => s.isVis && isContentPanel(s))
            .sort((a, b) => (a.y || 0) - (b.y || 0));
        const footerSections = computedLayout.filter(s => s.isVis && s.position === "footer");

        // Calculate bottom of header area to allow "Body" content to flow into whitespace
        const headerBottom = headerSections.length > 0 
            ? Math.max(...headerSections.map(s => (s.y || 0) + (s.height || (s.type === "panel" ? 150 : 30))))
            : 0;

        // Auto-compact: if content panels are spaced apart (designer default heights),
        // snap the flow start to just below the header so there is no dead whitespace.
        let flowStartY = contentPanels.length > 0 ? (contentPanels[0].y || 0) : 400;
        if (contentPanels.length > 0 && flowStartY > headerBottom + 100) {
            flowStartY = Math.max(headerBottom + 40, 300);
        }

        const flowStartX  = contentPanels.length > 0 ? (contentPanels[0].x || 40) : 40;
        const PANEL_GAP   = 10; // px between panels
        const GRID_GAP    = 16; // gap between EVC and Prog panels
        const _evcSec  = contentPanels.find(s => s.panelKey === "evc_panel");
        const _progSec = contentPanels.find(s => s.panelKey === "progesterone_panel");
        // Total available width = A4 page (794px) minus left start position minus 40px right margin
        const totalAvailableW = Math.max(300, 794 - flowStartX - 40);
        const flowWidth = totalAvailableW;

        const renderContent = (section: typeof computedLayout[0]) => {
            const tz = getClinicTimezone(settings);
            const fmtDate = (raw: string) => formatInTZ(raw, tz);

            if (section.position === "category") {
                return (
                    <div style={{ 
                        fontWeight: 700, 
                        fontSize: "14px", 
                        color: "#1e293b", 
                        borderBottom: "2px solid #374151", 
                        paddingBottom: "4px",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                    }}>
                        {section.type === "text" ? section.content : (section.type === "field" ? getFieldValue(section.field!) : section.label)}
                    </div>
                );
            }
            if (section.type === "rect_sharp" || section.type === "rect_round") {
                const borderColor = section.styles?.borderColor || "#1e293b";
                const borderWidth = section.styles?.borderWidth || "1";
                const borderStyle = section.styles?.borderStyle || "solid";
                const fillColor   = section.styles?.fillColor   || "transparent";
                const fillOpacity = section.styles?.fillOpacity  || "1";
                const radius      = section.type === "rect_round" ? (section.styles?.borderRadius || "12px") : "0px";
                return (
                    <div style={{
                        width: "100%",
                        height: "100%",
                        border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                        borderRadius: radius,
                        background: fillColor,
                        opacity: parseFloat(fillOpacity),
                    }} />
                );
            }
            if (section.type === "text") return <div className="whitespace-pre-wrap">{section.content}</div>;
            if (section.type === "field" && section.field) {
                if (section.field === "cycleTimeline") {
                    return (
                        <CycleTimelineComponent details={details as Record<string, string>} brandColor={settings?.invoiceHeaderBgColor || settings?.reportHeaderColor || "#c21253"} />
                    );
                }
                // Summary / Conclusion — shows Cytology Stage + Interpretation + 1st/2nd/3rd Cross
                if (section.field === "summary") {
                    const stageColorMap: Record<string, string> = {
                        "Proestrus": "#7c3aed", "Early Estrus": "#db2777",
                        "Standing Estrus": "#dc2626", "Diestrus": "#2563eb", "Anestrus": "#059669",
                    };
                    const cytoStage   = (details as any)?.evc_cytology_stage || "";
                    const cytoColor   = stageColorMap[cytoStage] || "#374151";
                    const progInterp  = (details as any)?.prog_interpretation || "";
                    const firstCross  = (details as any)?.prog_first_cross   || "";
                    const secondCross = (details as any)?.prog_second_cross  || "";
                    const thirdCross  = (details as any)?.prog_third_cross   || "";
                    if (!cytoStage && !progInterp && !firstCross && !secondCross && !thirdCross) return null;
                    const labelStyle: React.CSSProperties = { fontWeight: 600, color: "#475569", minWidth: "110px", flexShrink: 0, fontSize: "11px" };
                    const rowStyle: React.CSSProperties  = { display: "flex", gap: "6px", padding: "4px 10px", borderBottom: "1px solid #f1f5f9", alignItems: "baseline" };
                    return (
                        <div style={{ border: "1.5px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", background: "#ffffff", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
                            <div style={{ fontWeight: 700, fontSize: "11px", color: "#0f172a", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", padding: "5px 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Summary / Conclusion</div>
                            {cytoStage   && <div style={rowStyle}><span style={labelStyle}>Cytology Stage</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: cytoColor, fontSize: "11px" }}>{cytoStage}</span></div>}
                            {progInterp  && <div style={rowStyle}><span style={labelStyle}>Interpretation</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{progInterp}</span></div>}
                            {firstCross  && <div style={rowStyle}><span style={labelStyle}>1st Cross</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{fmtDate(firstCross)}</span></div>}
                            {secondCross && <div style={rowStyle}><span style={labelStyle}>2nd Cross</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{fmtDate(secondCross)}</span></div>}
                            {thirdCross  && <div style={rowStyle}><span style={labelStyle}>3rd Cross</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{fmtDate(thirdCross)}</span></div>}
                        </div>
                    );
                }
                // Notes — shows report.notes text
                if (section.field === "notes") {
                    const val = getFieldValue("notes");
                    if (!val) return null;
                    return (
                        <div style={{ border: "1.5px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", background: "#ffffff", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
                            <div style={{ fontWeight: 700, fontSize: "11px", color: "#0f172a", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", padding: "5px 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Notes</div>
                            <div style={{ padding: "8px 10px", fontSize: "11px", color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{val}</div>
                        </div>
                    );
                }


                return <div className="font-medium">{getFieldValue(section.field)}</div>;
            }
            if (section.type === "panel" && section.panelKey && labReportConfig.panels) {
                const panelDef = labReportConfig.panels.find(p => p.key === section.panelKey);
                if (!panelDef) return null;

                // INFO panel (Customer / Patient Details)
                if (panelDef.panelType === "info") {
                    const leftRows = panelDef.rows.filter(r => r.col !== "right");
                    const rightRows = panelDef.rows.filter(r => r.col === "right");
                    const hasRight = rightRows.length > 0;
                    const renderRow = (row: any) => (
                        <div key={row.key} style={{ display: "flex", marginBottom: "4px", lineHeight: "1.4", fontSize: "11px" }}>
                            <span style={{ fontWeight: 500, color: "#475569", width: "105px", flexShrink: 0 }}>{row.label}</span>
                            <span style={{ color: "#94a3b8", margin: "0 6px" }}>:</span>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{getFieldValue(row.key)}</span>
                        </div>
                    );
                    const isLocked = section.lockSize && section.height;
                    return (
                        <div style={{
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "8px",
                            background: "#ffffff",
                            padding: "10px 14px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                            width: section.width ? `${section.width}px` : "100%",
                            height: isLocked ? `${section.height}px` : (section.height ? `${section.height}px` : "auto"),
                            overflow: isLocked ? "hidden" : "visible",
                            boxSizing: "border-box"
                        }}>
                            {panelDef.label && (
                                <div style={{
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    color: "#1e293b",
                                    marginBottom: "8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    paddingBottom: "4px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.03em"
                                }}>
                                    {/* Strip trailing " 1" / " 2" studio identifiers — show clean label in print */}
                                    {panelDef.label.replace(/\s+[12]$/, "")}
                                </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: hasRight ? "1fr 1fr" : "1fr", gap: "16px" }}>
                                <div>{leftRows.map(renderRow)}</div>
                                {hasRight && <div>{rightRows.map(renderRow)}</div>}
                            </div>
                        </div>
                    );
                }

                // BLOOD SMEAR panel
                if (panelDef.panelType === "blood_smear") {
                    const raw = (details as any)?.bloodSmear || (details as any)?.blood_smear || "";
                    const isNeg = raw.trim().toLowerCase().startsWith("negative");
                    const isPos = raw.trim().toLowerCase().startsWith("positive");
                    let pathogens: { name: string; value: string }[] = [];
                    let negMsg = "No hemo protozoans detected";
                    if (isNeg) negMsg = raw.replace(/^Negative:\s*/i, "").trim() || negMsg;
                    if (isPos) {
                        pathogens = raw.split("\n").slice(1)
                            .filter((l: string) => l.trim().startsWith("- "))
                            .map((l: string) => { const p = l.substring(2).split(":"); return { name: p[0].trim(), value: p.slice(1).join(":").trim() }; });
                    }
                    const rc = isNeg ? "#16a34a" : isPos ? "#dc2626" : "#64748b";
                    const rb = isNeg ? "#f0fdf4" : isPos ? "#fef2f2" : "#f8fafc";
                    return (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#1e293b", borderBottom: "2px solid #e2e8f0", paddingBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>{panelDef.label}</span>
                                {raw && <span style={{ fontSize: "10px", fontWeight: 700, background: rb, color: rc, border: `1px solid ${rc}40`, borderRadius: "4px", padding: "2px 8px" }}>{isNeg ? "NEGATIVE" : isPos ? "POSITIVE" : "UNKNOWN"}</span>}
                            </div>
                            {!raw && <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>No data recorded</div>}
                            {isNeg && <div style={{ fontSize: "11px", color: "#334155", padding: "6px 8px", background: "#f0fdf4", borderRadius: "4px", border: "1px solid #bbf7d0" }}><span style={{ fontWeight: 600 }}>Observation:</span> {negMsg}</div>}
                            {!isNeg && !isPos && raw && <div style={{ fontSize: "11px", color: "#334155", padding: "6px 8px", background: "#f8fafc", borderRadius: "4px", border: "1px solid #e2e8f0" }}><span style={{ fontWeight: 600 }}>Result:</span> {raw}</div>}
                            {isPos && (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead><tr style={{ background: "#fef2f2" }}>
                                        <th style={{ textAlign: "left", padding: `${rowGap}px 8px`, borderBottom: "1px solid #fecaca", fontWeight: 600, color: "#b91c1c", width: "60%" }}>Pathogen / Organism</th>
                                        <th style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #fecaca", fontWeight: 600, color: "#b91c1c", width: "40%" }}>Grade / Count</th>
                                    </tr></thead>
                                    <tbody>
                                        {pathogens.length > 0 ? pathogens.map((p, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fef9f9" }}>
                                                <td style={{ padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", color: "#334155", fontWeight: 500, fontStyle: "italic" }}>{p.name}</td>
                                                <td style={{ textAlign: "center", padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", fontWeight: 700, color: "#dc2626" }}>{p.value}</td>
                                            </tr>
                                        )) : <tr><td colSpan={2} style={{ padding: `${rowGapAlt}px 8px`, color: "#64748b", fontStyle: "italic" }}>No pathogens recorded</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    );
                }

                // WET FILM panel
                if (panelDef.panelType === "wet_film") {
                    const raw = (details as any)?.wetFilm || "";
                    const isNeg = raw.trim().toLowerCase().startsWith("negative");
                    const isPos = raw.trim().toLowerCase().startsWith("positive");
                    let negMsg = "Microfilaria not detected", mfCount = "", mfGrade = "";
                    const otherOrgs: { name: string; grade: string }[] = [];
                    if (isNeg) negMsg = raw.replace(/^Negative:\s*/i, "").trim() || negMsg;
                    if (isPos) {
                        for (const line of raw.split("\n")) {
                            const cm = line.match(/^Microfilaria Count:\s*(.+)/i); if (cm) { mfCount = cm[1].trim(); continue; }
                            const gm = line.match(/^Microfilaria Grade:\s*(.+)/i); if (gm) { mfGrade = gm[1].trim(); continue; }
                            if (line.trim().startsWith("- Organism:")) {
                                const op = line.replace("- Organism:", "").split("/ Grade:");
                                if (op.length === 2) otherOrgs.push({ name: op[0].trim(), grade: op[1].trim() });
                            }
                        }
                    }
                    const rc = isNeg ? "#16a34a" : isPos ? "#dc2626" : "#64748b";
                    const rb = isNeg ? "#f0fdf4" : isPos ? "#fef2f2" : "#f8fafc";
                    return (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#1e293b", borderBottom: "2px solid #e2e8f0", paddingBottom: "4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>{panelDef.label}</span>
                                {raw && <span style={{ fontSize: "10px", fontWeight: 700, background: rb, color: rc, border: `1px solid ${rc}40`, borderRadius: "4px", padding: "2px 8px" }}>{isNeg ? "NEGATIVE" : isPos ? "POSITIVE" : "UNKNOWN"}</span>}
                            </div>
                            {!raw && <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>No data recorded</div>}
                            {isNeg && <div style={{ fontSize: "11px", color: "#334155", padding: "6px 8px", background: "#f0fdf4", borderRadius: "4px", border: "1px solid #bbf7d0" }}><span style={{ fontWeight: 600 }}>Observation:</span> {negMsg}</div>}
                            {isPos && (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead><tr style={{ background: "#fef2f2" }}>
                                        <th style={{ textAlign: "left", padding: `${rowGap}px 8px`, borderBottom: "1px solid #fecaca", fontWeight: 600, color: "#b91c1c", width: "50%" }}>Organism</th>
                                        <th style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #fecaca", fontWeight: 600, color: "#b91c1c", width: "25%" }}>Count</th>
                                        <th style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #fecaca", fontWeight: 600, color: "#b91c1c", width: "25%" }}>Grade</th>
                                    </tr></thead>
                                    <tbody>
                                        <tr style={{ background: "#fff" }}>
                                            <td style={{ padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", color: "#334155", fontWeight: 500, fontStyle: "italic" }}>Microfilaria</td>
                                            <td style={{ textAlign: "center", padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", fontWeight: 700, color: "#dc2626" }}>{mfCount || ""}</td>
                                            <td style={{ textAlign: "center", padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", fontWeight: 600, color: "#dc2626" }}>{mfGrade || ""}</td>
                                        </tr>
                                        {otherOrgs.map((org, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? "#fef9f9" : "#fff" }}>
                                                <td style={{ padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", color: "#334155", fontWeight: 500, fontStyle: "italic" }}>{org.name}</td>
                                                <td style={{ textAlign: "center", padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", fontWeight: 700, color: "#dc2626" }}>Present</td>
                                                <td style={{ textAlign: "center", padding: `${rowGapAlt}px 8px`, borderBottom: "1px solid #fee2e2", fontWeight: 600, color: "#dc2626" }}>{org.grade}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    );
                }

                // EVC (Vaginal Cytology) panel
                if (panelDef.panelType === "evc") {
                    const evcData = details as Record<string, string> | null;
                    const cytologyStage = (evcData as any)?.evc_cytology_stage || "";
                    const stageColorMap: Record<string, string> = {
                        "Proestrus": "#7c3aed", "Early Estrus": "#db2777",
                        "Standing Estrus": "#dc2626", "Diestrus": "#2563eb", "Anestrus": "#059669",
                    };
                    const stageColor = stageColorMap[cytologyStage] || "#374151";
                    const tableRows = panelDef.rows.filter(r => {
                        if (r.key === "evc_cytology_stage" || r.key === "evc_notes" || r.key === "evc_sample_date") return false;
                        const v = (evcData as any)?.[r.key];
                        return v !== undefined && v !== null && String(v).trim() !== "";
                    });
                    const evcSampleDate = fmtDate((evcData as any)?.evc_sample_date || "");
                    const isLocked = section.lockSize && section.height;
                    return (
                        <div style={{ border: "1.5px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", background: "#ffffff", height: isLocked ? `${section.height}px` : "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                                <span>{panelDef.label}</span>
                                {evcSampleDate && (
                                    <span style={{ fontSize: "10px", fontWeight: 500, color: "#475569" }}>
                                        Sample Date: <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{evcSampleDate}</span>
                                    </span>
                                )}
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0, fontSize: "11px", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
                                <thead>
                                    <tr style={{ background: "#f1f5f9" }}>
                                        <td style={{ textAlign: "left", padding: `${rowGap}px 10px`, borderBottom: "1px solid #cbd5e1", width: "65%", fontWeight: 700, color: "#475569", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Test</td>
                                        <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #cbd5e1", width: "20%", fontWeight: 700, color: "#475569", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Result</td>
                                        <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #cbd5e1", width: "15%", fontWeight: 700, color: "#475569", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Unit</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row, idx) => {
                                        const rawVal = (evcData as any)?.[row.key] || "";
                                        const val = row.key.endsWith("_date") ? fmtDate(rawVal) : rawVal;
                                        return (
                                            <tr key={row.key} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                                <td style={{ padding: `${rowGap}px 10px`, borderBottom: "1px solid #e2e8f0", color: "#334155", fontWeight: 500, fontSize: "11px" }}>{row.label}</td>
                                                <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1d4ed8", fontSize: "11px" }}>
                                                    {val}
                                                </td>
                                                <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "10.5px" }}>
                                                    {row.unit || ""}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {/* Filler to stretch EVC border to match Progesterone panel height */}
                            <div style={{ flex: 1, background: "#ffffff" }} />
                        </div>
                    );
                }

                // PROGESTERONE ASSAY panel
                if (panelDef.panelType === "progesterone") {
                    const evcData = details as Record<string, string> | null;
                    const tableRows = panelDef.rows.filter(r => {
                        // Exclude: sample date (shown in header), notes (separate field),
                        // and the fields moved to Summary/Conclusion block
                        if (r.key === "prog_notes" || r.key === "prog_sample_date") return false;
                        if (r.key === "prog_first_cross" || r.key === "prog_second_cross" || r.key === "prog_third_cross" || r.key === "prog_interpretation") return false;
                        const v = (evcData as any)?.[r.key];
                        return v !== undefined && v !== null && String(v).trim() !== "";
                    });
                    const progSampleDate = fmtDate((evcData as any)?.prog_sample_date || "");
                    const isLocked = section.lockSize && section.height;
                    return (
                        <div style={{ border: "1.5px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", background: "#ffffff", height: isLocked ? `${section.height}px` : "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                                <span>{panelDef.label}</span>
                                {progSampleDate && (
                                    <span style={{ fontSize: "10px", fontWeight: 500, color: "#475569" }}>
                                        Sample Date: <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{progSampleDate}</span>
                                    </span>
                                )}
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0, fontSize: "11px", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", flexShrink: 0 }}>
                                <thead>
                                    <tr style={{ background: "#f1f5f9" }}>
                                        <td style={{ textAlign: "left", padding: `${rowGap}px 10px`, borderBottom: "1px solid #cbd5e1", width: "55%", fontWeight: 700, color: "#475569", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Test</td>
                                        <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #cbd5e1", width: "30%", fontWeight: 700, color: "#475569", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Result</td>
                                        <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #cbd5e1", width: "15%", fontWeight: 700, color: "#475569", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Unit</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row, idx) => {
                                        const rawVal = (evcData as any)?.[row.key] || "";
                                        const val = (row.key.endsWith("_date") || row.key.endsWith("_cross")) ? fmtDate(rawVal) : rawVal;
                                        return (
                                            <tr key={row.key} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                                                <td style={{ padding: `${rowGap}px 10px`, borderBottom: "1px solid #e2e8f0", color: "#334155", fontWeight: 500, fontSize: "11px" }}>{row.label}</td>
                                                <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1d4ed8", fontSize: "11px" }}>
                                                    {val}
                                                </td>
                                                <td style={{ textAlign: "center", padding: `${rowGap}px 10px`, borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "10.5px" }}>
                                                    {row.unit || ""}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {/* Filler to stretch border to match the EVC panel height */}
                            <div style={{ flex: 1, background: "#ffffff" }} />
                        </div>
                    );
                }

                // USG FINDINGS panel — organ-by-organ text findings
                if (panelDef.panelType === "usg") {
                    const d = report.details as Record<string, string> | null;
                    const allRows = panelDef.rows;
                    const visibleRows = allRows.filter(r => d?.[r.key] && String(d[r.key]).trim() !== "");
                    const usgFontSize = section.styles?.fontSize || "11px";
                    const usgLineHeight = section.styles?.lineHeight || "1.7";
                    const usgRowGap = section.styles?.rowGap ? `${section.styles.rowGap}px` : "8px";
                    const fieldLayout = section.styles?.fieldLayout || "inline";
                    const renderUsgRow = (row: any) => {
                        const val = d?.[row.key];
                        if (!val) return null;
                        if (fieldLayout === "block") return (
                            <div key={row.key} style={{ marginBottom: usgRowGap }}>
                                <div style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :-</div>
                                <div style={{ paddingLeft: "10px" }}>{val}</div>
                            </div>
                        );
                        if (fieldLayout === "center") return (
                            <div key={row.key} style={{ marginBottom: usgRowGap, textAlign: "center" }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :- </span>
                                <span>{val}</span>
                            </div>
                        );
                        if (fieldLayout === "justify") return (
                            <div key={row.key} style={{ marginBottom: usgRowGap, textAlign: "justify" }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :- </span>
                                <span>{val}</span>
                            </div>
                        );
                        if (fieldLayout === "table") return (
                            <div key={row.key} style={{ marginBottom: usgRowGap, display: "flex", gap: "6px" }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase", minWidth: "130px", flexShrink: 0 }}>{row.label}</span>
                                <span style={{ fontWeight: 700, flexShrink: 0 }}>:-</span>
                                <span>{val}</span>
                            </div>
                        );
                        // default: inline
                        return (
                            <div key={row.key} style={{ marginBottom: usgRowGap }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :- </span>
                                <span>{val}</span>
                            </div>
                        );
                    };
                    return (
                        <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: usgFontSize, color: "#0a0a0a", lineHeight: usgLineHeight }}>
                            {visibleRows.map(renderUsgRow)}
                            {visibleRows.length === 0 && (
                                <div style={{ color: "#64748b", fontStyle: "italic", fontSize: "11px" }}>No findings recorded.</div>
                            )}
                        </div>
                    );
                }

                // IMPRESSION panel — standalone impression text block
                if (panelDef.panelType === "usg_impression") {
                    const d = report.details as Record<string, string> | null;
                    const value = d?.["usg_impression"]?.trim();
                    const usgFontSize = section.styles?.fontSize || "11px";
                    const usgLineHeight = section.styles?.lineHeight || "1.7";
                    const fieldLayout = section.styles?.fieldLayout || "inline";
                    const empty = <span style={{ color: "#64748b", fontStyle: "italic" }}>—</span>;
                    return (
                        <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: usgFontSize, color: "#0a0a0a", lineHeight: usgLineHeight, textAlign: fieldLayout === "center" ? "center" : fieldLayout === "justify" ? "justify" : undefined }}>
                            {fieldLayout === "block" ? (
                                <><div style={{ fontWeight: 700, textTransform: "uppercase" }}>Impression :-</div><div style={{ paddingLeft: "10px" }}>{value || empty}</div></>
                            ) : fieldLayout === "table" ? (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase", minWidth: "130px", flexShrink: 0 }}>IMPRESSION</span>
                                    <span style={{ fontWeight: 700, flexShrink: 0 }}>:-</span>
                                    <span>{value || empty}</span>
                                </div>
                            ) : (
                                <><span style={{ fontWeight: 700, textTransform: "uppercase" }}>Impression :- </span><span>{value || empty}</span></>
                            )}
                        </div>
                    );
                }

                // SUGGESTION panel — standalone suggestion text block
                if (panelDef.panelType === "usg_suggestion") {
                    const d = report.details as Record<string, string> | null;
                    const value = d?.["usg_suggestion"]?.trim();
                    const usgFontSize = section.styles?.fontSize || "11px";
                    const usgLineHeight = section.styles?.lineHeight || "1.7";
                    const fieldLayout = section.styles?.fieldLayout || "inline";
                    const empty = <span style={{ color: "#64748b" }}>—</span>;
                    return (
                        <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: usgFontSize, color: "#0a0a0a", lineHeight: usgLineHeight, textAlign: fieldLayout === "center" ? "center" : fieldLayout === "justify" ? "justify" : undefined }}>
                            {fieldLayout === "block" ? (
                                <><div style={{ fontWeight: 700, textTransform: "uppercase" }}>Suggestion :-</div><div style={{ paddingLeft: "10px", fontStyle: "italic" }}>{value || empty}</div></>
                            ) : fieldLayout === "table" ? (
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase", minWidth: "130px", flexShrink: 0 }}>SUGGESTION</span>
                                    <span style={{ fontWeight: 700, flexShrink: 0 }}>:-</span>
                                    <span style={{ fontStyle: "italic" }}>{value || empty}</span>
                                </div>
                            ) : (
                                <><span style={{ fontWeight: 700, textTransform: "uppercase" }}>Suggestion :- </span><span style={{ fontStyle: "italic" }}>{value || empty}</span></>
                            )}
                        </div>
                    );
                }

                // CYCLE TIMELINE panel
                if (panelDef.panelType === "cycle_timeline") {
                    const evcData = details as Record<string, string> | null;
                    return (
                        <div key={panelDef.key || "cycle_timeline"}>
                            <CycleTimelineComponent details={evcData} brandColor={settings?.invoiceHeaderBgColor || settings?.reportHeaderColor || "#c21253"} />
                        </div>
                    );
                }

                // Standard TEST panel
                const showRefRange = !panelDef.hideRefRange;
                return (
                    <div key={panelDef.key}>
                        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", color: "#1e293b", borderBottom: "2px solid #e2e8f0", paddingBottom: "4px" }}>{panelDef.label}</div>
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0", fontSize: "11px" }}>
                            <thead>
                                <tr style={{ background: "transparent" }}>
                                    <th style={{ textAlign: "left", padding: `${rowGap}px 8px`, borderBottom: "1px solid #cbd5e1", width: showRefRange ? "40%" : "50%", fontWeight: 600, color: "#475569" }}>Test Parameter</th>
                                    <th style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #cbd5e1", width: showRefRange ? "20%" : "25%", fontWeight: 600, color: "#475569" }}>Result</th>
                                    <th style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #cbd5e1", width: showRefRange ? "15%" : "25%", fontWeight: 600, color: "#475569" }}>Unit</th>
                                    {showRefRange && <th style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #cbd5e1", width: "25%", fontWeight: 600, color: "#475569" }}>Reference Range</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {panelDef.rows.filter(row => {
                                    const v = getFieldValue(row.key);
                                    return v !== undefined && v !== null && String(v).trim() !== "";
                                }).map((row) => (
                                    <tr key={row.key} style={{ background: "transparent" }}>
                                        <td style={{ padding: `${rowGap}px 8px`, borderBottom: "1px solid #e2e8f0", color: "#334155", fontWeight: 500 }}>{row.label}</td>
                                        <td style={{
                                            textAlign: "center",
                                            padding: `${rowGap}px 8px`,
                                            borderBottom: "1px solid #e2e8f0",
                                            fontWeight: 600,
                                            color: isValueOutOfRange(getFieldValue(row.key), getDynamicRefRange(row.key, row.label, row.refRange || "-")) ? "#dc2626" : "#0f172a"
                                        }}>
                                            {getFieldValue(row.key)}
                                        </td>
                                        <td style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>{row.unit}</td>
                                        {showRefRange && <td style={{ textAlign: "center", padding: `${rowGap}px 8px`, borderBottom: "1px solid #e2e8f0", color: "#64748b", fontFamily: "monospace" }}>{getDynamicRefRange(row.key, row.label, row.refRange || "-")}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            return null;
        };

        return (
            <div
                className={cn("bg-white print:m-0 print:p-0 overflow-hidden mx-auto", className)}
                style={{
                    width: "794px",
                    minHeight: "1123px",
                    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    position: "relative",
                }}
            >
                {/* -- LAYER 1: Header elements at exact designer positions -- */}
                {headerSections.map(s => (
                    <div key={s.id} style={{
                        position: "absolute",
                        left: `${s.x}px`,
                        top: `${s.y}px`,
                        width: `${s.width}px`,
                        height: s.height ? `${s.height}px` : undefined,
                        overflow: (s.lockSize || s.height) ? "hidden" : undefined,
                        maxHeight: (s.lockSize && s.height) ? `${s.height}px` : undefined,
                        maxWidth: (s.lockSize && s.width) ? `${s.width}px` : undefined,
                        fontSize: s.styles?.fontSize || "11px",
                        fontWeight: s.styles?.fontWeight,
                        color: s.styles?.color || "#1a1a2e",
                        fontFamily: "Inter, sans-serif",
                        zIndex: 10,
                        boxSizing: "border-box",
                    }}>
                        {renderContent(s)}
                    </div>
                ))}

                {/* -- LAYER 2: Content panels flow from the first panel's Y -- */}
                <div style={{ position: "absolute", top: `${flowStartY}px`, left: `${flowStartX}px`, width: `${flowWidth}px` }}>
                    {(() => {
                        const evcSec = contentPanels.find(s => s.panelKey === "evc_panel");
                        const progSec = contentPanels.find(s => s.panelKey === "progesterone_panel");

                        const evcHasData = evcSec && details && Object.keys(details).some(k => k.startsWith("evc_") && details[k] && String(details[k]).trim() !== "");
                        const progHasData = progSec && details && Object.keys(details).some(k => k.startsWith("prog_") && details[k] && String(details[k]).trim() !== "");

                        const isBothPresent = evcSec && progSec && (evcHasData || !details) && (progHasData || !details);

                        if (isBothPresent) {
                            const isEvcLocked  = evcSec.lockSize  && evcSec.height;
                            const isProgLocked = progSec.lockSize && progSec.height;
                            // EVC uses its set width (if valid); Progesterone auto-fills the remaining space.
                            // This ensures changing EVC width is immediately visible and nothing overflows.
                            const halfW = Math.floor((totalAvailableW - GRID_GAP) / 2);
                            const rawEvcW = evcSec.width || 0;
                            const evcW  = (rawEvcW > 50 && rawEvcW < totalAvailableW - GRID_GAP - 50)
                                ? rawEvcW
                                : halfW;
                            const progW = totalAvailableW - GRID_GAP - evcW;
                            const otherPanels = contentPanels.filter(s => s.panelKey !== "evc_panel" && s.panelKey !== "progesterone_panel");
                            return (
                                <>
                                    <div style={{ display: "grid", gridTemplateColumns: `${evcW}px ${progW}px`, gap: `${GRID_GAP}px`, width: `${totalAvailableW}px`, alignItems: "stretch", marginBottom: `${PANEL_GAP}px` }}>
                                        <div style={{ width: `${evcW}px`, height: isEvcLocked ? `${evcSec.height}px` : "100%", display: "flex", flexDirection: "column", overflow: isEvcLocked ? "hidden" : undefined, maxHeight: isEvcLocked ? `${evcSec.height}px` : undefined }}>{renderContent(evcSec)}</div>
                                        <div style={{ width: `${progW}px`, height: isProgLocked ? `${progSec.height}px` : "100%", display: "flex", flexDirection: "column", overflow: isProgLocked ? "hidden" : undefined, maxHeight: isProgLocked ? `${progSec.height}px` : undefined }}>{renderContent(progSec)}</div>
                                    </div>
                                    {otherPanels.map((s, idx) => (
                                        <div key={s.id} style={{
                                            width: s.width ? `${s.width}px` : "100%",
                                            height: (s.lockSize && s.height) ? `${s.height}px` : "auto",
                                            overflow: s.lockSize ? "hidden" : undefined,
                                            maxHeight: (s.lockSize && s.height) ? `${s.height}px` : undefined,
                                            marginTop: `${(s.marginTop ?? 0) + PANEL_GAP}px`
                                        }}>
                                            {renderContent(s)}
                                        </div>
                                    ))}
                                </>
                            );
                        }

                        return contentPanels.map((s, idx) => {
                            const isEvcOrProg = s.panelKey === "evc_panel" || s.panelKey === "progesterone_panel";
                            const panelW = isEvcOrProg ? "100%" : (s.width ? `${s.width}px` : "100%");
                            return (
                                <div key={s.id} style={{
                                    width: panelW,
                                    height: (s.lockSize && s.height) ? `${s.height}px` : "auto",
                                    overflow: s.lockSize ? "hidden" : undefined,
                                    maxHeight: (s.lockSize && s.height) ? `${s.height}px` : undefined,
                                    marginTop: idx === 0 ? 0 : `${(s.marginTop ?? 0) + PANEL_GAP}px`
                                }}>
                                    {renderContent(s)}
                                </div>
                            );
                        });
                    })()}
                    {(report.category === "Reproductive" || report.title?.includes("EVC") || report.title?.includes("Progesterone")) &&
                        // Only inject as fallback when there is NO saved layout at all.
                        // If the user has a saved layout (even without cycle_timeline_panel),
                        // respect their design — do NOT auto-inject.
                        (!layout || layout.length === 0) && (
                        <div style={{ marginTop: "12px" }}>
                            <CycleTimelineComponent details={details as Record<string, string>} brandColor={settings?.invoiceHeaderBgColor || settings?.reportHeaderColor || "#c21253"} />
                        </div>
                    )}

                    {/* Automatic fallback for Summary / Conclusion if not explicitly placed in layout */}
                    {(!computedLayout.some(s => s.isVis && s.type === "field" && s.field === "summary")) && (
                        (() => {
                            const stageColorMap: Record<string, string> = {
                                "Proestrus": "#7c3aed", "Early Estrus": "#db2777",
                                "Standing Estrus": "#dc2626", "Diestrus": "#2563eb", "Anestrus": "#059669",
                            };
                            const cytoStage   = (details as any)?.evc_cytology_stage || "";
                            const cytoColor   = stageColorMap[cytoStage] || "#374151";
                            const progInterp  = (details as any)?.prog_interpretation || "";
                            const firstCross  = (details as any)?.prog_first_cross   || "";
                            const secondCross = (details as any)?.prog_second_cross  || "";
                            const thirdCross  = (details as any)?.prog_third_cross   || "";
                            if (!cytoStage && !progInterp && !firstCross && !secondCross && !thirdCross) return null;
                            const labelStyle: React.CSSProperties = { fontWeight: 600, color: "#475569", minWidth: "110px", flexShrink: 0, fontSize: "11px" };
                            const rowStyle: React.CSSProperties  = { display: "flex", gap: "6px", padding: "4px 10px", borderBottom: "1px solid #f1f5f9", alignItems: "baseline" };
                            const tz = getClinicTimezone(settings);
                            const fmtDate = (raw: string) => formatInTZ(raw, tz);
                            return (
                                <div style={{ marginTop: "12px", border: "1.5px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", background: "#ffffff", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
                                    <div style={{ fontWeight: 700, fontSize: "11px", color: "#0f172a", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", padding: "5px 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Summary / Conclusion</div>
                                    {cytoStage   && <div style={rowStyle}><span style={labelStyle}>Cytology Stage</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: cytoColor, fontSize: "11px" }}>{cytoStage}</span></div>}
                                    {progInterp  && <div style={rowStyle}><span style={labelStyle}>Interpretation</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{progInterp}</span></div>}
                                    {firstCross  && <div style={rowStyle}><span style={labelStyle}>1st Cross</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{fmtDate(firstCross)}</span></div>}
                                    {secondCross && <div style={rowStyle}><span style={labelStyle}>2nd Cross</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{fmtDate(secondCross)}</span></div>}
                                    {thirdCross  && <div style={rowStyle}><span style={labelStyle}>3rd Cross</span><span style={{ color: "#94a3b8", margin: "0 4px" }}>:</span><span style={{ fontWeight: 700, color: "#0f172a", fontSize: "11px" }}>{fmtDate(thirdCross)}</span></div>}
                                </div>
                            );
                        })()
                    )}

                    {/* Automatic fallback for Notes if not explicitly placed in layout */}
                    {(!computedLayout.some(s => s.isVis && s.type === "field" && s.field === "notes")) && report.notes && (
                        <div style={{ marginTop: "12px", border: "1.5px solid #cbd5e1", borderRadius: "6px", overflow: "hidden", background: "#ffffff", fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
                            <div style={{ fontWeight: 700, fontSize: "11px", color: "#0f172a", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", padding: "5px 10px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Notes</div>
                            <div style={{ padding: "8px 10px", fontSize: "11px", color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{report.notes}</div>
                        </div>
                    )}
                </div>

                {/* -- LAYER 3: Footer sections at exact positions -- */}
                {footerSections.map(s => (
                    <div key={s.id} style={{
                        position: "absolute",
                        left: `${s.x}px`,
                        top: `${s.y}px`,
                        width: `${s.width}px`,
                        height: s.height ? `${s.height}px` : undefined,
                        overflow: (s.lockSize || s.height) ? "hidden" : undefined,
                        maxHeight: (s.lockSize && s.height) ? `${s.height}px` : undefined,
                        maxWidth: (s.lockSize && s.width) ? `${s.width}px` : undefined,
                        fontSize: s.styles?.fontSize || "11px",
                        fontWeight: s.styles?.fontWeight,
                        color: s.styles?.color || "#1a1a2e",
                        fontFamily: "Inter, sans-serif",
                        zIndex: 10,
                        boxSizing: "border-box",
                    }}>
                        {renderContent(s)}
                    </div>
                ))}
            </div>
        );
    }

    // Fallback plain-text layout (no designer layout saved)

    return (
        <div className={cn("p-8 bg-white mx-auto print:p-0", className)} style={{ width: "794px", minHeight: "1123px", fontFamily: "'Courier New', Courier, monospace", fontSize: "12px", whiteSpace: "pre-wrap" }}>
            <div className="text-center font-bold">
                {settings.clinicName || "ABC VETERINARY CLINIC"}{"\n"}
                {(report.category === "Imaging" ? "Ultrasonography" : report.category)} Laboratory Report
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div>Case ID       : CASE-{pet?.id}</div>
                    <div>Report Date   : {formatInTZ(report.date, getClinicTimezone(settings))}</div>
                    <div>Owner Name    : {owner?.firstName} {owner?.lastName}</div>
                    <div>Contact No    : {owner?.phone}</div>
                </div>
                <div>
                    <div>Animal Name   : {pet?.name}</div>
                    <div>Species       : {pet?.species}</div>
                    <div>Breed         : {pet?.breed}</div>
                    <div>Age / Sex     : {[
                        (pet?.age ?? 0) > 0 ? `${pet?.age} yr${pet?.age !== 1 ? 's' : ''}` : "",
                        ((pet as any)?.ageMonths ?? 0) > 0 ? `${(pet as any)?.ageMonths} mo` : ""
                    ].filter(Boolean).join(" ") || "< 1 mo"} / {pet?.gender}</div>
                </div>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            {details && (
                <div className="mt-8">
                    <div className="font-bold mb-4">TEST RESULTS</div>
                    <table className="w-full text-left" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                        <thead>
                            <tr className="border-b border-dashed border-black">
                                <th className="py-2">Parameter</th>
                                <th className="py-2 text-center">Result</th>
                                <th className="py-2 text-center">Unit</th>
                                {report.category !== "Reproductive" && <th className="py-2 text-center">Reference Range</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(details).map(([key, value]) => {
                                if (key === 'id' || key === 'reportId' || key === 'bloodSmear' || key === 'wetFilm' || !value) return null;
                                let unit = "-", refRange = "-";
                                const allRows = labReportConfig.panels?.flatMap(p => p.rows) || [];
                                const rowDef = allRows.find(r => r.key === key);
                                if (rowDef) { unit = rowDef.unit || "-"; refRange = rowDef.refRange || "-"; }
                                return (
                                    <tr key={key}>
                                            <td className="py-1 capitalize">{rowDef ? rowDef.label : key.replace(/([A-Z])/g, ' $1').trim()}</td>
                                            <td className={cn(
                                                "py-1 font-bold text-center",
                                                isValueOutOfRange(String(value), getDynamicRefRange(key, rowDef?.label || "", rowDef?.refRange || "-")) ? "text-red-600" : ""
                                            )}>
                                                {String(value)}
                                            </td>
                                            <td className="py-1 text-center text-gray-600">{unit}</td>
                                            {report.category !== "Reproductive" && <td className="py-1 text-center font-mono text-gray-600">{getDynamicRefRange(key, rowDef?.label || "", refRange)}</td>}
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            )}
            {report.category === "Reproductive" && (
                <div className="mt-6">
                    <CycleTimelineComponent details={details as Record<string, string>} brandColor={settings?.invoiceHeaderBgColor || settings?.reportHeaderColor || "#c21253"} />
                </div>
            )}
            <div className="mt-8">
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
});


